# backend/app/routers/ai_chat.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator
from datetime import datetime, timezone
import time
from collections import defaultdict
import json
import asyncio
import httpx

from app.database import get_db
from app.config import settings
from app.models.session import Session as SessionModel
from app.models.ai_chat import ChatMessage, ChatConversation
from app.schemas.ai_chat import (
    Message, ChatRequest, ChatResponse, ChatHistoryResponse,
    SaveMessageRequest, ChatMessageCreate, ChatMessageResponse,
    ConversationStats, ClearHistoryResponse
)

router = APIRouter(prefix="/api/ai-chat", tags=["ai-chat"])

# OpenAI API Configuration
OPENAI_API_KEY = settings.openai_api_key
OPENAI_API_URL = settings.openai_api_url

# Performance settings from config
MAX_CONTEXT_MESSAGES = settings.max_context_messages
DEFAULT_MAX_TOKENS = settings.default_max_tokens
CACHE_TTL = settings.cache_ttl

# PER-SESSION LOCKS - Prevents race conditions
session_locks = defaultdict(asyncio.Lock)

# Redis client (optional)
redis_client = None
if settings.redis_enabled:
    try:
        import redis
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        redis_client.ping()
    except Exception as e:
        print(f"Redis connection failed: {e}. Continuing without cache.")
        redis_client = None

# Conditional rate limiter setup
limiter = None
if settings.rate_limit_enabled:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
    print("✅ Rate limiting enabled")
else:
    print("⚠️ Rate limiting disabled")


def conditional_limit(limit_string: str):
    """
    Decorator that applies rate limiting only if enabled in settings
    """
    def decorator(func):
        if settings.rate_limit_enabled and limiter:
            # Apply the rate limit decorator
            return limiter.limit(limit_string)(func)
        else:
            # Return function unchanged (no rate limiting)
            return func
    return decorator

def get_session_id_from_request(request: Request) -> str:
    """Extract session ID from request for rate limiting"""
    # Try to get from query params or body
    session_id = request.query_params.get('session_id')
    if not session_id and hasattr(request.state, 'session_id'):
        session_id = request.state.session_id
    return session_id or request.client.host


@router.post("/chat")
@conditional_limit(settings.chat_rate_limit)
async def chat_stream(
    request: Request,
    chat_request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Stream chat responses from OpenAI with rate limiting
    Rate limit: 20 requests per minute per session (if enabled)
    """
    try:
        # Validate session exists
        session = db.query(SessionModel).filter(
            SessionModel.session_id == chat_request.session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session not found: {chat_request.session_id}")
        
        # Acquire per-session lock to prevent race conditions
        async with session_locks[chat_request.session_id]:
            conversation = db.query(ChatConversation).filter(
                ChatConversation.session_id == chat_request.session_id
            ).first()
            
            if not conversation:
                conversation = ChatConversation(
                    session_id=chat_request.session_id,
                    started_at=datetime.now(timezone.utc)
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
            
            # Limit context to last N messages for performance
            limited_messages = chat_request.messages[-MAX_CONTEXT_MESSAGES:]
            
            # Save user message to database
            if limited_messages and limited_messages[-1].role == "user":
                                
                # Calculate message index
                message_index = db.query(ChatMessage).filter(
                    ChatMessage.session_id == chat_request.session_id
                ).count()
                
                user_message = ChatMessage(
                    session_id=chat_request.session_id,
                    role="user",
                    content=limited_messages[-1].content,
                    timestamp=datetime.now(timezone.utc),
                    message_index=message_index,
                    token_count=None,  # User messages don't have token counts from OpenAI
                    model_used=chat_request.model or settings.llm_model,
                    response_time_ms=None,  # Only for assistant responses
                    message_metadata={
                        "temperature": chat_request.temperature,
                        "max_tokens": chat_request.max_tokens,
                        "stream": chat_request.stream
                    }
                )
                db.add(user_message)
                conversation.total_user_messages += 1
                conversation.message_count += 1
                db.commit()
            
            # Prepare OpenAI request
            openai_request = {
                "model": chat_request.model or settings.llm_model,
                "messages": [{"role": msg.role, "content": msg.content} for msg in limited_messages],
                "temperature": chat_request.temperature,
                "max_tokens": chat_request.max_tokens or DEFAULT_MAX_TOKENS,
                "stream": chat_request.stream
            }
            
            if not chat_request.stream:
                # Non-streaming response
                start_time = time.time()

                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        OPENAI_API_URL,
                        headers={
                            "Authorization": f"Bearer {OPENAI_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json=openai_request,
                        timeout=60.0
                    )
                    
                    if response.status_code != 200:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=f"OpenAI API error: {response.text}"
                        )
                    
                    result = response.json()
                    assistant_message = result['choices'][0]['message']['content']

                    response_time_ms = int((time.time() - start_time) * 1000)
                    
                    # Calculate message index
                    message_index = db.query(ChatMessage).filter(
                        ChatMessage.session_id == chat_request.session_id
                    ).count()

                    # Save assistant message
                    db_message = ChatMessage(
                        session_id=conversation.session_id,
                        role="assistant",
                        content=assistant_message,
                        timestamp=datetime.now(timezone.utc),
                        message_index=message_index,
                        token_count=result['usage']['total_tokens'],
                        model_used=chat_request.model or settings.llm_model,
                        response_time_ms=response_time_ms,
                        message_metadata={
                            "finish_reason": result['choices'][0].get('finish_reason'),
                            "prompt_tokens": result['usage']['prompt_tokens'],
                            "completion_tokens": result['usage']['completion_tokens'],
                            "temperature": chat_request.temperature,
                            "max_tokens": chat_request.max_tokens
                        }
                    )
                    db.add(db_message)
                    
                    # Update conversation
                    conversation.message_count += 1
                    conversation.total_tokens_used += result['usage']['total_tokens']
                    conversation.last_message_at = datetime.now(timezone.utc)
                    conversation.total_assistant_messages += 1
                    
                    db.commit()
                    
                    return ChatResponse(
                        message=Message(
                            role="assistant",
                            content=assistant_message,
                            timestamp=datetime.now(timezone.utc).isoformat()
                        ),
                        usage=result['usage']
                    )
            
            # Streaming response
            async def generate_stream():
                full_content = ""
                total_tokens = 0
                start_time = time.time()
                finish_reason = None
                
                try:
                    async with httpx.AsyncClient() as client:
                        async with client.stream(
                            "POST",
                            OPENAI_API_URL,
                            headers={
                                "Authorization": f"Bearer {OPENAI_API_KEY}",
                                "Content-Type": "application/json"
                            },
                            json=openai_request,
                            timeout=120.0
                        ) as response:
                            if response.status_code != 200:
                                error_text = await response.aread()
                                yield f"data: {json.dumps({'error': f'OpenAI API error: {error_text.decode()}'})}\n\n"
                                return
                            
                            async for line in response.aiter_lines():
                                if line.startswith('data: '):
                                    data = line[6:]
                                    
                                    if data.strip() == '[DONE]':
                                        response_time_ms = int((time.time() - start_time) * 1000)
                                        
                                        # Calculate message index
                                        message_index = db.query(ChatMessage).filter(
                                            ChatMessage.session_id == conversation.session_id
                                        ).count()

                                        db_message = ChatMessage(
                                            session_id=conversation.session_id,
                                            role="assistant",
                                            content=full_content,
                                            timestamp=datetime.now(timezone.utc),
                                            message_index=message_index,
                                            token_count=total_tokens,
                                            model_used=chat_request.model or settings.llm_model,
                                            response_time_ms=response_time_ms,
                                            message_metadata={
                                                "finish_reason": finish_reason,
                                                "temperature": chat_request.temperature,
                                                "max_tokens": chat_request.max_tokens,
                                                "stream": True,
                                                "estimated_tokens": total_tokens
                                            }
                                        )
                                        db.add(db_message)
                                        
                                        # Update conversation stats
                                        conversation.message_count += 1
                                        conversation.total_tokens_used += total_tokens
                                        conversation.last_message_at = datetime.now(timezone.utc)
                                        conversation.total_assistant_messages += 1
                                        
                                        db.commit()
                                        
                                        yield f"data: [DONE]\n\n"
                                        break
                                    
                                    try:
                                        chunk = json.loads(data)
                                        if 'choices' in chunk and len(chunk['choices']) > 0:
                                            delta = chunk['choices'][0].get('delta', {})
                                            content = delta.get('content', '')

                                            if 'finish_reason' in chunk['choices'][0]:
                                                finish_reason = chunk['choices'][0]['finish_reason']
                                            
                                            if content:
                                                full_content += content
                                                yield f"data: {json.dumps({'content': content})}\n\n"
                                            
                                            # Estimate tokens (rough approximation: ~0.75 tokens per word)
                                            if content:
                                                word_count = len(content.split())
                                                total_tokens += max(1, int(word_count / 0.75))
                                    
                                    except json.JSONDecodeError:
                                        continue
                
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in chat endpoint: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-message", response_model=ChatMessageResponse)
@conditional_limit(settings.save_chat_rate_limit)
async def save_message(
    request: Request,
    message_data: SaveMessageRequest,
    session_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Save a chat message
    Rate limit: 30 requests per minute per session
    """
    # Use query param if provided, otherwise use body
    effective_session_id = session_id or message_data.session_id
    
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    try:
        async with session_locks[effective_session_id]:
            conversation = db.query(ChatConversation).filter(
                ChatConversation.session_id == effective_session_id
            ).first()
            
            if not conversation:
                conversation = ChatConversation(
                    session_id=effective_session_id,
                    started_at=datetime.now(timezone.utc)
                )
                db.add(conversation)
                db.flush()

            # CHECK FOR DUPLICATES
            existing = db.query(ChatMessage).filter(
                ChatMessage.session_id == effective_session_id,
                ChatMessage.role == message_data.role,
                ChatMessage.content == message_data.content
            ).order_by(ChatMessage.timestamp.desc()).first()
            
            if existing:
                time_diff = (datetime.now(timezone.utc) - existing.timestamp).total_seconds()
                if time_diff < 5:  # Duplicate within 5 seconds
                    print(f"Skipping duplicate {message_data.role} message")
                    # Return existing message instead
                    return ChatMessageResponse(
                        id=existing.id,
                        session_id=existing.session_id,
                        role=existing.role,
                        content=existing.content,
                        timestamp=existing.timestamp,
                        message_index=existing.message_index,
                        token_count=existing.token_count,
                        model_used=existing.model_used,
                        response_time_ms=existing.response_time_ms,
                        message_metadata=existing.message_metadata
                    )

            db_message = ChatMessage(
                session_id=effective_session_id,
                role=message_data.role,
                content=message_data.content,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(db_message)
            
            conversation.message_count += 1
            conversation.last_message_at = datetime.now(timezone.utc)
            if message_data.role == 'user':
                conversation.total_user_messages += 1
            elif message_data.role == 'assistant':
                conversation.total_assistant_messages += 1
            
            db.commit()
            db.refresh(db_message)
            
            return ChatMessageResponse(
                id=db_message.id,
                session_id=db_message.session_id,
                role=db_message.role,
                content=db_message.content,
                timestamp=db_message.timestamp,
                message_index=db_message.message_index,
                token_count=db_message.token_count,
                model_used=db_message.model_used,
                response_time_ms=db_message.response_time_ms,
                message_metadata=db_message.message_metadata
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save message: {str(e)}"
        )

@router.get("/history/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get chat history for a session"""
    try:
        # Get messages - query by session_id
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id,
            ChatMessage.deleted == False
        ).order_by(ChatMessage.timestamp).all()
        
        # Get conversation for metadata
        conversation = db.query(ChatConversation).filter(
            ChatConversation.session_id == session_id
        ).first()
        
        return ChatHistoryResponse(
            session_id=session_id,
            messages=[
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
            ],
            total_messages=len(messages),
            conversation_started=conversation.started_at if conversation else None,
            last_message_at=conversation.last_message_at if conversation else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load chat history: {str(e)}"
        )

@router.delete("/clear/{session_id}", response_model=ClearHistoryResponse)
async def clear_chat_history(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Clear chat history for a session"""
    try:
        #Count messages to be deleted
        message_count = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).count()
        
        #Delete messages
        db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).delete()
        
        # Delete conversation
        db.query(ChatConversation).filter(
            ChatConversation.session_id == session_id
        ).delete()

        db.commit()
        
        return ClearHistoryResponse(            
            message= "Chat history cleared",
            session_id= session_id,
            messages_cleared= message_count
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete conversation: {str(e)}"
        )

@router.get("/stats/{session_id}", response_model=ConversationStats)
async def get_conversation_stats(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get conversation statistics"""
    try:
        conversation = db.query(ChatConversation).filter(
            ChatConversation.session_id == session_id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return ConversationStats(
            session_id=session_id,
            message_count=conversation.message_count,
            total_tokens_used=conversation.total_tokens_used,
            total_user_messages=conversation.total_user_messages,
            total_assistant_messages=conversation.total_assistant_messages,
            estimated_cost_usd=conversation.estimated_cost_usd,
            started_at=conversation.started_at.isoformat(),
            last_message_at=conversation.last_message_at.isoformat() if conversation.last_message_at else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")