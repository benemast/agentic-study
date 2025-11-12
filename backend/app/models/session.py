# backend/app/models/session.py
from sqlalchemy import Column, String, DateTime, Integer, JSON, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    participant_id = Column(Integer, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    last_activity = Column(
        TIMESTAMP(timezone=True),
        nullable=False
    )
    user_agent = Column(Text, nullable=True)
    screen_resolution = Column(String, nullable=True)
    session_data = Column(JSON, nullable=True, default=dict)
    session_metadata = Column(JSON, nullable=True, default=dict)
    is_active = Column(String, default="true")
    connection_status = Column(String, default="online", index=True)
    has_demographics = Column(Boolean, default=False, index=True)
    study_group = Column(Integer, nullable=True)
    
    # Relationships
    interactions = relationship(
        "Interaction", 
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="dynamic"  # Don't load all interactions by default
    )
    
    demographics = relationship(
        "Demographics",
        back_populates="session",
        uselist=False,  # One-to-one relationship
        cascade="all, delete-orphan"
    )
    
    errors = relationship(
        "SessionError",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    
    # Indexes for performance
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )
    
    @property
    def is_session_active(self):
        """Check if session is active"""
        return self.is_active == "true" and self.connection_status == "online"
    
    @property
    def duration_seconds(self):
        """Calculate session duration in seconds"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return (datetime.utcnow() - self.start_time).total_seconds()
    
    def __repr__(self):
        return f"<Session(id={self.session_id}, participant={self.participant_id}, active={self.is_active})>"


class Interaction(Base):
    __tablename__ = "interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String, index=True)
    event_data = Column(JSON, nullable=True)
    current_view = Column(String, nullable=True)
    
    # Additional tracking fields
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    page_url = Column(String, nullable=True)

    # Relationship
    session = relationship("Session", back_populates="interactions")
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )
    
    def __repr__(self):
        return f"<Interaction(session={self.session_id}, type={self.event_type}, time={self.timestamp})>"

class SessionError(Base):
    __tablename__ = "session_errors"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id", ondelete="CASCADE"), index=True)
    error_timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    error_type = Column(String, index=True)
    error_message = Column(Text)
    error_context = Column(JSON, nullable=True)
    resolved = Column(Boolean, default=False, index=True)
    
    # Relationship
    session = relationship("Session", back_populates="errors")
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )
    
    def __repr__(self):
        return f"<SessionError(session={self.session_id}, type={self.error_type}, resolved={self.resolved})>"