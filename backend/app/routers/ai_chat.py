# backend/app/routers/ai_chat.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator
from datetime import datetime
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


def get_session_id_from_request(request: Request) -> str:
    """Extract session ID from request for rate limiting"""
    # Try to get from query params or body
    session_id = request.query_params.get('session_id')
    if not session_id and hasattr(request.state, 'session_id'):
        session_id = request.state.session_id
    return session_id or request.client.host


@router.post("/chat")
async def chat_stream(
    request: Request,
    chat_request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Stream chat responses from OpenAI with rate limiting
    Rate limit: 20 requests per minute per session
    """
    # Apply rate limiting if enabled
    if settings.rate_limit_enabled and hasattr(request.app.state, 'limiter'):
        limiter = request.app.state.limiter
        # Use session_id for rate limiting instead of IP
        await limiter.check_request(
            request,
            settings.chat_rate_limit,
            key=chat_request.session_id
        )
    
    # Validate session exists
    session = db.query(SessionModel).filter(
        SessionModel.session_id == chat_request.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Acquire per-session lock to prevent race conditions
    async with session_locks[chat_request.session_id]:
        # Load chat history within the lock
        conversation = db.query(ChatConversation).filter(
            ChatConversation.session_id == chat_request.session_id
        ).first()
        
        if not conversation:
            conversation = ChatConversation(
                session_id=chat_request.session_id,
                model=chat_request.model or settings.llm_model
            )
            db.add(conversation)
            db.commit()
        
        # Limit context to last N messages for performance
        limited_messages = chat_request.messages[-MAX_CONTEXT_MESSAGES:]
        
        # Prepare OpenAI request
        openai_request = {
            "model": chat_request.model or settings.llm_model,
            "messages": [msg.dict() for msg in limited_messages],
            "temperature": chat_request.temperature,
            "max_tokens": chat_request.max_tokens or DEFAULT_MAX_TOKENS,
            "stream": chat_request.stream
        }
        
        if not chat_request.stream:
            # Non-streaming response
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
                
                # Save assistant message
                db_message = ChatMessage(
                    session_id=conversation.session_id,
                    role="assistant",
                    content=assistant_message,
                    model=chat_request.model or settings.llm_model,
                    tokens_used=result['usage']['total_tokens']
                )
                db.add(db_message)
                
                # Update conversation
                conversation.message_count += 1
                conversation.total_tokens += result['usage']['total_tokens']
                conversation.last_message_at = datetime.utcnow()
                
                db.commit()
                
                return ChatResponse(
                    message=Message(
                        role="assistant",
                        content=assistant_message,
                        timestamp=datetime.utcnow().isoformat()
                    ),
                    session_id=conversation.session_id,
                    tokens_used=result['usage']['total_tokens']
                )
        
        # Streaming response
        async def generate_stream():
            full_content = ""
            total_tokens = 0
            
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
                                    # Save complete message to database
                                    db_message = ChatMessage(
                                        session_id=conversation.session_id,
                                        role="assistant",
                                        content=full_content,
                                        model=chat_request.model or settings.llm_model,
                                        tokens_used=total_tokens
                                    )
                                    db.add(db_message)
                                    
                                    # Update conversation stats
                                    conversation.message_count += 1
                                    conversation.total_tokens += total_tokens
                                    conversation.last_message_at = datetime.utcnow()
                                    
                                    db.commit()
                                    
                                    yield f"data: [DONE]\n\n"
                                    break
                                
                                try:
                                    chunk = json.loads(data)
                                    if 'choices' in chunk and len(chunk['choices']) > 0:
                                        delta = chunk['choices'][0].get('delta', {})
                                        content = delta.get('content', '')
                                        
                                        if content:
                                            full_content += content
                                            yield f"data: {json.dumps({'content': content})}\n\n"
                                        
                                        # Estimate tokens (rough approximation)
                                        if content:
                                            total_tokens += len(content.split()) // 0.75
                                
                                except json.JSONDecodeError:
                                    continue
            
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream"
        )


@router.post("/save-message", response_model=ChatMessageResponse)
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
    
    if settings.rate_limit_enabled and hasattr(request.app.state, 'limiter'):
        limiter = request.app.state.limiter
        await limiter.check_request(
            request,
            "30/minute",
            key=effective_session_id
        )
    
    try:
        async with session_locks[effective_session_id]:
            conversation = db.query(ChatConversation).filter(
                ChatConversation.session_id == effective_session_id
            ).first()
            
            if not conversation:
                conversation = ChatConversation(
                    session_id=effective_session_id,
                started_at=datetime.now(datetime.timezone.utc)
                )
                db.add(conversation)
                db.flush()
            
            db_message = ChatMessage(
                session_id=effective_session_id,
                role=message_data.role,
                content=message_data.content,
                timestamp=datetime.now(datetime.timezone.utc)
            )
            db.add(db_message)
            
            conversation.message_count += 1
            conversation.last_message_at = datetime.now(datetime.timezone.utc)
            if message_data.role == 'user':
                conversation.total_user_messages += 1
            elif message_data.role == 'assistant':
                conversation.total_assistant_messages += 1
            
            db.commit()
            db.refresh(db_message)
            
            return {
                "id": db_message.id,
                "session_id": db_message.session_id,
                "role": db_message.role,
                "content": db_message.content,
                "timestamp": db_message.timestamp.isoformat(),
                "success": True
            }
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
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp).all()
        
        # Get conversation for metadata
        conversation = db.query(ChatConversation).filter(
            ChatConversation.session_id == session_id
        ).first()
        
        return {
            "session_id": session_id,
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
            ],
            "total_messages": len(messages),
            "conversation_started": conversation.started_at.isoformat() if conversation else None,
            "last_message_at": conversation.last_message_at.isoformat() if conversation else None
        }
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
        
        return {
            "message": "Chat history cleared",
            "session_id": session_id,
            "messages_cleared": message_count
        }
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
        
        return {
            "session_id": session_id,
            "message_count": conversation.message_count,
            "total_tokens_used": conversation.total_tokens_used,
            "total_user_messages": conversation.total_user_messages,
            "total_assistant_messages": conversation.total_assistant_messages,
            "estimated_cost_usd": conversation.estimated_cost_usd,
            "started_at": conversation.started_at.isoformat(),
            "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")