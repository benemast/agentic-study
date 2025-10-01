# backend/app/routers/ai_chat.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, AsyncGenerator
import json
import os
from datetime import datetime
import asyncio
from collections import defaultdict

from app.database import get_db
from app.models.session import Session as SessionModel
from app.models.ai_chat import ChatMessage, ChatConversation
from app.schemas.ai_chat import (
    Message, ChatRequest, ChatResponse, ChatHistoryResponse,
    SaveMessageRequest, ChatMessageCreate, ChatMessageResponse,
    ConversationStats, ClearHistoryResponse
)
import httpx

router = APIRouter(prefix="/api/ai-chat", tags=["ai-chat"])

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() == "true"

# Performance settings
MAX_CONTEXT_MESSAGES =  int(os.getenv("MAX_CONTEXT_MESSAGES")) # Only send last 10 messages for context
DEFAULT_MAX_TOKENS = int(os.getenv("DEFAULT_MAX_TOKENS")) # Reduced from 1000 for 2x faster responses
CACHE_TTL = int(os.getenv("CACHE_TTL"))  # Cache responses for 1 hour

# PER-SESSION LOCKS - Prevents race conditions for concurrent requests from same user
session_locks = defaultdict(asyncio.Lock)

# Redis client (optional)
redis_client = None
if REDIS_ENABLED:
    try:
        import redis
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()  # Test connection
    except Exception as e:
        print(f"Redis connection failed: {e}. Continuing without cache.")
        redis_client = None

async def stream_openai_response(
    messages: List[Message],
    model: str,
    temperature: float,
    max_tokens: int
) -> AsyncGenerator[str, None]:
    """Stream responses from OpenAI API with Redis caching"""
    
    if not OPENAI_API_KEY:
        yield f"data: {json.dumps({'error': 'OpenAI API key not configured'})}\n\n"
        return
    
    # Create cache key from messages
    cache_key = None
    if redis_client:
        import hashlib
        messages_str = json.dumps([{"role": m.role, "content": m.content} for m in messages])
        cache_key = f"chat:response:{hashlib.md5(messages_str.encode()).hexdigest()}"
        
        # Check cache
        cached_response = redis_client.get(cache_key)
        if cached_response:
            # Stream cached response
            for char in cached_response:
                yield f"data: {json.dumps({'content': char})}\n\n"
                await asyncio.sleep(0.01)  # Simulate streaming
            yield "data: [DONE]\n\n"
            return
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True
    }
    
    full_response = ""  # Collect for caching
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", OPENAI_API_URL, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield f"data: {json.dumps({'error': f'OpenAI API error: {error_text.decode()}'})}\n\n"
                    return
                
                async for line in response.aiter_lines():
                    if line.strip():
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix
                            if data.strip() == "[DONE]":
                                yield "data: [DONE]\n\n"
                                break
                            
                            try:
                                chunk = json.loads(data)
                                if "choices" in chunk and len(chunk["choices"]) > 0:
                                    delta = chunk["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        content = delta['content']
                                        full_response += content
                                        yield f"data: {json.dumps({'content': content})}\n\n"
                            except json.JSONDecodeError:
                                continue
        
        # Cache the complete response
        if redis_client and cache_key and full_response:
            redis_client.setex(cache_key, CACHE_TTL, full_response)
                                
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Handle chat requests with streaming support and per-session locking"""
    
    try:
        # CRITICAL: Acquire lock for this session to prevent race conditions
        # This ensures messages are processed in order even with concurrent requests
        async with session_locks[request.session_id]:
            # Validate session
            session = db.query(SessionModel).filter(
                SessionModel.session_id == request.session_id
            ).first()
            
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Add timestamp to messages if not present
            for msg in request.messages:
                if not msg.timestamp:
                    msg.timestamp = datetime.utcnow().isoformat()
            
            # OPTIMIZATION: Limit context window to last N messages
            # Only send recent messages to reduce tokens and improve speed
            context_messages = request.messages[-MAX_CONTEXT_MESSAGES:] if len(request.messages) > MAX_CONTEXT_MESSAGES else request.messages
            
            # Use optimized max_tokens default
            try:
                max_tokens = int(request.max_tokens) if request.max_tokens else DEFAULT_MAX_TOKENS
                if max_tokens == 1000:  # If default was used, switch to optimized value
                    max_tokens = DEFAULT_MAX_TOKENS
            except (ValueError, TypeError) as e:
                print(f"Error converting max_tokens: {e}, using default")
                max_tokens = DEFAULT_MAX_TOKENS
            
            # Store user message in session data (only the last message, not full history during streaming)
            if session.session_data is None:
                session.session_data = {}
            
            if "chat_history" not in session.session_data:
                session.session_data["chat_history"] = []
            
            # Add user message to history
            user_msg = request.messages[-1]
            session.session_data["chat_history"].append({
                "role": user_msg.role,
                "content": user_msg.content,
                "timestamp": user_msg.timestamp
            })
            
            # OPTIMIZATION: Skip DB commit during streaming - save at end only
            # db.commit()  # Commented out - will save after response completes
            
            if request.stream:
                return StreamingResponse(
                    stream_openai_response(
                        context_messages,  # Use limited context #request.messages,
                        request.model,
                        request.temperature,
                        max_tokens # request.max_tokens
                    ),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no"
                    }
                )
            else:
                # Non-streaming response (for compatibility)
                full_response = ""
                async for chunk in stream_openai_response(
                    context_messages,  # Use limited context # request.messages,
                    request.model,
                    request.temperature,
                    max_tokens # request.max_tokens
                ):
                    if chunk.startswith("data: "):
                        data = json.loads(chunk[6:])
                        if "content" in data:
                            full_response += data["content"]
                
                # Store assistant response
                assistant_msg = Message(
                    role="assistant",
                    content=full_response,
                    timestamp=datetime.utcnow().isoformat()
                )
                
                session.session_data["chat_history"].append({
                    "role": assistant_msg.role,
                    "content": assistant_msg.content,
                    "timestamp": assistant_msg.timestamp
                })
                db.commit()
                
                return ChatResponse(message=assistant_msg)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        print(f"Request data: session_id={request.session_id}, messages={len(request.messages)}, model={request.model}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieve chat history for a session with fallback to chat_messages table"""
    
    session = db.query(SessionModel).filter(
        SessionModel.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Try to get chat history from session_data first
    chat_history = session.session_data.get("chat_history", []) if session.session_data else []
    
    # FALLBACK: If session_data is empty, pull from chat_messages table
    if not chat_history:
        chat_messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.asc()).limit(limit).all()
        
        # Convert database messages to the expected format
        chat_history = [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in chat_messages
        ]
    
    # Return most recent messages up to limit
    return {
        "session_id": session_id,
        "messages": chat_history[-limit:] if limit else chat_history,
        "total_messages": len(chat_history)
    }

@router.delete("/history/{session_id}")
async def clear_chat_history(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Clear chat history for a session"""
    
    session = db.query(SessionModel).filter(
        SessionModel.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.session_data:
        session.session_data["chat_history"] = []
        db.commit()
    
    return {"message": "Chat history cleared successfully"}

@router.post("/save-message")
async def save_assistant_message(
    session_id: str,
    message: SaveMessageRequest,
    db: Session = Depends(get_db)
):
    """Save assistant message to history (for streaming responses) with locking"""
    
    # CRITICAL: Acquire lock for this session to prevent concurrent writes
    async with session_locks[session_id]:
        session = db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Save to session_data JSON for backward compatibility
        if session.session_data is None:
            session.session_data = {}
        
        if "chat_history" not in session.session_data:
            session.session_data["chat_history"] = []
        
        timestamp = message.timestamp or datetime.utcnow().isoformat()
        
        session.session_data["chat_history"].append({
            "role": message.role,
            "content": message.content,
            "timestamp": timestamp
        })
        
        # Also save to dedicated chat_messages table
        chat_message = ChatMessage(
            session_id=session_id,
            role=message.role,
            content=message.content,
            timestamp=datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
            message_index=len(session.session_data["chat_history"]) - 1,
            message_metadata=message.metadata  # Updated field name
        )
        db.add(chat_message)
        
        # Update conversation tracking
        conversation = db.query(ChatConversation).filter(
            ChatConversation.session_id == session_id
        ).first()
        
        if not conversation:
            conversation = ChatConversation(
                session_id=session_id,
                message_count=1,
                total_user_messages=1 if message.role == "user" else 0,
                total_assistant_messages=1 if message.role == "assistant" else 0
            )
            db.add(conversation)
        else:
            conversation.message_count += 1
            conversation.last_message_at = datetime.utcnow()
            if message.role == "user":
                conversation.total_user_messages += 1
            elif message.role == "assistant":
                conversation.total_assistant_messages += 1
        
        db.commit()
        
        return {"message": "Message saved successfully"}

@router.get("/stats/{session_id}", response_model=ConversationStats)
async def get_conversation_stats(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get conversation statistics"""
    
    conversation = db.query(ChatConversation).filter(
        ChatConversation.session_id == session_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="No conversation found for this session")
    
    # Calculate average response time
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.role == "assistant",
        ChatMessage.response_time_ms.isnot(None)
    ).all()
    
    avg_response_time = None
    if messages:
        avg_response_time = sum(m.response_time_ms for m in messages) / len(messages)
    
    # Calculate conversation duration
    duration = 0
    if conversation.started_at and conversation.last_message_at:
        duration = int((conversation.last_message_at - conversation.started_at).total_seconds())
    
    return ConversationStats(
        session_id=session_id,
        message_count=conversation.message_count,
        total_tokens_used=conversation.total_tokens_used,
        total_user_messages=conversation.total_user_messages,
        total_assistant_messages=conversation.total_assistant_messages,
        estimated_cost_usd=conversation.estimated_cost_usd,
        avg_response_time_ms=avg_response_time,
        conversation_duration_seconds=duration,
        started_at=conversation.started_at,
        last_message_at=conversation.last_message_at
    )