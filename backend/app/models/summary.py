# backend/app/models/summary.py
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.models.session import Base

class ExecutionSummary(Base):
    __tablename__ = "execution_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), unique=True, nullable=False)
    
    task1_execution_id = Column(String, nullable=True)
    task1_summary = Column(JSON, nullable=True)
    
    task2_execution_id = Column(String, nullable=True)
    task2_summary = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())