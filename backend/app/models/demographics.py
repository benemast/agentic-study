# backend/app/models/demographics.py
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Integer
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
    gender_identity = Column(String(50))
    education = Column(String(100))
    field_of_study = Column(String(200))
    occupation = Column(Text)
    first_language = Column(String(100))
    
    # Professional Background
    industry = Column(String(50))
    work_experience = Column(String(50))
    
    # Technical Background
    programming_experience = Column(String(50))
    ai_ml_experience = Column(String(50))
    ai_ml_expertise = Column(String(50))
    ai_tools_used = Column(ARRAY(String), nullable=True)
    workflow_tools_used = Column(ARRAY(String), nullable=True)
    technical_role = Column(String(100))
    
    # Optional Information
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
    def ai_tools_list(self):
        """Ensure ai_tools_used is always returned as a list"""
        if self.ai_tools_used is None:
            return []
        return self.ai_tools_used if isinstance(self.ai_tools_used, list) else []
    
    @property
    def workflow_tools_list(self):
        """Ensure workflow_tools_used is always returned as a list"""
        if self.workflow_tools_used is None:
            return []
        return self.workflow_tools_used if isinstance(self.workflow_tools_used, list) else []
    
    def __repr__(self):
        return f"<Demographics(session_id={self.session_id}, age={self.age}, industry={self.industry})>"