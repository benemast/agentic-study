# backend/app/models/demographics.py
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.session import Base

class Demographics(Base):
    __tablename__ = "demographics"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to sessions table
    session_id = Column(
        String, 
        ForeignKey("sessions.session_id", ondelete="CASCADE"), 
        nullable=False, 
        unique=True, 
        index=True
    )
    
    # Basic Information
    age = Column(String(50))
    gender = Column(String(50))
    education = Column(String(100))
    field_of_study = Column(String(200))
    occupation = Column(Text)
    
    # Technical Background
    programming_experience = Column(String(50))
    ai_ml_experience = Column(String(50))
    
    # Simplified: Always use JSON for workflow_tools_used
    # Works across PostgreSQL, SQLite, MySQL
    workflow_tools_used = Column(ARRAY(String), nullable=True)
    
    technical_role = Column(String(100))
    
    # Study Context
    participation_motivation = Column(Text)
    expectations = Column(Text)
    time_availability = Column(String(50))
    
    # Optional Information
    country = Column(String(100))
    first_language = Column(String(100))
    comments = Column(Text)
    
    # Metadata
    completed_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Store the raw questionnaire response for backup/analysis
    raw_response = Column(JSON)

    # Relationship to session
    session = relationship("Session", back_populates="demographics")
    
    # Indexes for performance
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )
    
    @property
    def tools_list(self):
        """Ensure workflow_tools_used is always returned as a list"""
        if self.workflow_tools_used is None:
            return []
        if isinstance(self.workflow_tools_used, list):
            return self.workflow_tools_used
        # Handle string (shouldn't happen, but defensive programming)
        if isinstance(self.workflow_tools_used, str):
            import json
            try:
                parsed = json.loads(self.workflow_tools_used)
                return parsed if isinstance(parsed, list) else [parsed]
            except:
                return [self.workflow_tools_used] if self.workflow_tools_used else []
        return []
    
    def __repr__(self):
        return f"<Demographics(session_id={self.session_id}, age={self.age}, experience={self.programming_experience})>"