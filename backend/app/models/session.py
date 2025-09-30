# backend/app/models/session.py
from sqlalchemy import Column, String, DateTime, Integer, JSON, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    participant_id = Column(Integer, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    user_agent = Column(Text, nullable=True)
    screen_resolution = Column(String, nullable=True)
    session_data = Column(JSON, nullable=True)
    session_metadata = Column(JSON, nullable=True)  # Changed from 'metadata' to 'session_metadata'
    is_active = Column(String, default="true")
    connection_status = Column(String, default="online")  # online, offline, error, ended
    has_demographics = Column(Boolean, default=False)
    
    # Indexes for performance
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )

class Interaction(Base):
    __tablename__ = "interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String, index=True)
    event_data = Column(JSON, nullable=True)
    current_view = Column(String, nullable=True)
    
    # Additional tracking fields
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    page_url = Column(String, nullable=True)
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )

class SessionError(Base):
    __tablename__ = "session_errors"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    error_timestamp = Column(DateTime, default=datetime.utcnow)
    error_type = Column(String)  # connection, validation, sync, etc.
    error_message = Column(Text)
    error_context = Column(JSON, nullable=True)
    resolved = Column(Boolean, default=False)