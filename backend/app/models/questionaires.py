# backend/app/models/demographics.py
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Use your existing Base
Base = declarative_base()

class Demographics(Base):
    __tablename__ = "demographics"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to your existing sessions table
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, unique=True, index=True)
    
    # Basic Information
    age = Column(String(50))  # e.g., "25-34", "prefer-not-to-say"
    gender = Column(String(50))  # e.g., "woman", "man", "non-binary", "prefer-not-to-say"
    education = Column(String(100))  # e.g., "bachelors", "masters", "phd"
    occupation = Column(Text)  # Free text field
    
    # Technical Background
    programming_experience = Column(String(50))  # e.g., "beginner", "intermediate", "advanced", "expert"
    ai_ml_experience = Column(String(50))  # e.g., "none", "beginner", "intermediate", "advanced", "expert"
    workflow_tools_used = Column(JSON)  # Store as JSON array for compatibility
    technical_role = Column(String(100))  # e.g., "developer", "data-scientist", "researcher"
    
    # Study Context
    participation_motivation = Column(Text)
    expectations = Column(Text)
    time_availability = Column(String(50))  # e.g., "15-30min", "30-45min", "45-60min"
    
    # Optional Information
    country = Column(String(100))
    first_language = Column(String(100))
    comments = Column(Text)
    
    # Metadata - using your datetime pattern
    completed_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Store the raw questionnaire response for backup/analysis
    raw_response = Column(JSON)
    
    # Indexes for performance (using your pattern)
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )