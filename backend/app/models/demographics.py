# backend/app/models/demographics.py
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import os

# Import the same Base used by your session models
from app.models.session import Base

class Demographics(Base):
    __tablename__ = "demographics"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to your existing sessions table
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, unique=True, index=True)
    
    # Basic Information
    age = Column(String(50))
    gender = Column(String(50))
    education = Column(String(100))
    field_of_study = Column(String(200))
    occupation = Column(Text)
    
    # Technical Background
    programming_experience = Column(String(50))
    ai_ml_experience = Column(String(50))
    
    # Handle workflow_tools_used based on database type
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    if "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL:
        # PostgreSQL - use proper ARRAY type
        workflow_tools_used = Column(ARRAY(String), default=[])
    else:
        # SQLite or others - use JSON
        workflow_tools_used = Column(JSON, default=[])
    
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
    
    # Indexes for performance
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )