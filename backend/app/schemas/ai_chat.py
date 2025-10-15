# backend/app/schemas/ai_chat.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

class Message(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "How do I create a workflow?",
                "timestamp": "2025-09-30T10:30:00Z"
            }
        }

class ChatRequest(BaseModel):
    """Request for chat completion"""
    session_id: str = Field(..., description="User session ID")
    messages: List[Message] = Field(..., description="Conversation history")
    model: str = Field(default="gpt-4o-mini", description="OpenAI model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(default=1000, ge=1, le=4000, description="Maximum tokens in response")
    stream: bool = Field(default=True, description="Enable streaming responses")
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "sess_123",
                "messages": [
                    {"role": "user", "content": "Hello!"}
                ],
                "model": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": 1000,
                "stream": True
            }
        }

class ChatResponse(BaseModel):
    """Response from chat completion (non-streaming)"""
    message: Message
    usage: Optional[Dict[str, int]] = None
    response_time_ms: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": {
                    "role": "assistant",
                    "content": "Hello! How can I help you today?",
                    "timestamp": "2025-09-30T10:30:01Z"
                },
                "usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 15,
                    "total_tokens": 25
                },
                "response_time_ms": 850
            }
        }

class ChatHistoryResponse(BaseModel):
    """Chat history for a session"""
    session_id: str
    messages: List[Dict[str, Any]]
    total_messages: int
    conversation_started: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "sess_123",
                "messages": [
                    {
                        "role": "user",
                        "content": "Hello!",
                        "timestamp": "2025-09-30T10:30:00Z"
                    },
                    {
                        "role": "assistant",
                        "content": "Hi there!",
                        "timestamp": "2025-09-30T10:30:01Z"
                    }
                ],
                "total_messages": 2,
                "conversation_started": "2025-09-30T10:30:00Z",
                "last_message_at": "2025-09-30T10:30:01Z"
            }
        }

class SaveMessageRequest(BaseModel):
    """Request to save a message to history"""
    role: str
    content: str
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ChatMessageCreate(BaseModel):
    """Create a chat message record"""
    session_id: str
    role: str
    content: str
    message_index: Optional[int] = None
    token_count: Optional[int] = None
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        protected_namespaces = () 

class ChatMessageResponse(BaseModel):
    """Chat message database record"""
    id: int
    session_id: str
    role: str
    content: str
    timestamp: datetime
    message_index: Optional[int] = None
    token_count: Optional[int] = None
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    message_metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        protected_namespaces = () 
        from_attributes = True

class ConversationStats(BaseModel):
    """Statistics for a conversation"""
    session_id: str
    message_count: int
    total_tokens_used: int
    total_user_messages: int
    total_assistant_messages: int
    estimated_cost_usd: float
    avg_response_time_ms: Optional[float]
    conversation_duration_seconds: int
    started_at: datetime
    last_message_at: datetime
    
    class Config:
        from_attributes = True

class ClearHistoryResponse(BaseModel):
    """Response after clearing chat history"""
    message: str
    session_id: str
    messages_cleared: int