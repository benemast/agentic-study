# backend/app/models/ai_chat.py
from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, ForeignKey, Float
from datetime import datetime
from app.models.session import Base

class ChatMessage(Base):
    """Store individual chat messages for analytics and recovery"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, index=True)
    
    # Message content
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Message metadata
    message_index = Column(Integer)  # Position in conversation
    token_count = Column(Integer, nullable=True)
    model_used = Column(String(50), nullable=True)  # e.g., 'gpt-4o-mini'
    
    # Performance metrics
    response_time_ms = Column(Integer, nullable=True)  # For assistant messages
    
    # Additional context
    message_metadata = Column(JSON, nullable=True)  # For future extensions (renamed from 'metadata')
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )

class ChatConversation(Base):
    """Track conversation-level metadata"""
    __tablename__ = "chat_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, unique=True, index=True)
    
    # Conversation tracking
    started_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    message_count = Column(Integer, default=0)
    
    # Usage statistics
    total_tokens_used = Column(Integer, default=0)
    total_user_messages = Column(Integer, default=0)
    total_assistant_messages = Column(Integer, default=0)
    
    # Cost tracking (optional)
    estimated_cost_usd = Column(Float, default=0.0)
    
    # Conversation state
    is_active = Column(String(10), default="true")
    ended_at = Column(DateTime, nullable=True)
    
    # Summary/tags for analysis
    conversation_tags = Column(JSON, nullable=True)  # e.g., ['technical', 'workflow']
    conversation_summary = Column(Text, nullable=True)  # AI-generated summary
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )

class ChatAnalytics(Base):
    """Aggregate analytics for chat usage"""
    __tablename__ = "chat_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, index=True)
    
    # Time-based metrics
    date = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Usage metrics
    messages_sent = Column(Integer, default=0)
    messages_received = Column(Integer, default=0)
    avg_response_time_ms = Column(Integer, nullable=True)
    
    # Token metrics
    tokens_used = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    
    # Engagement metrics
    conversation_duration_seconds = Column(Integer, default=0)
    user_satisfaction = Column(String(20), nullable=True)  # 'positive', 'negative', 'neutral'
    
    # Additional metrics
    analytics_metadata = Column(JSON, nullable=True)  # Renamed from 'metadata'
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )