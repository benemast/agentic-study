# backend/app/schemas/demographics.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DemographicsBase(BaseModel):

    # Basic Information
    age: Optional[str] = Field(None, max_length=50)
    gender: Optional[str] = Field(None, max_length=50) 
    education: Optional[str] = Field(None, max_length=100)
    field_of_study: Optional[str] = Field(None, max_length=200)
    occupation: Optional[str] = None
    
    # Technical Background
    programming_experience: Optional[str] = Field(None, max_length=50)
    ai_ml_experience: Optional[str] = Field(None, max_length=50)
    workflow_tools_used: Optional[List[str]] = Field(default_factory=list)
    technical_role: Optional[str] = Field(None, max_length=100)
    
    # Study Context
    participation_motivation: Optional[str] = None
    expectations: Optional[str] = None
    time_availability: Optional[str] = Field(None, max_length=50)
    
    # Optional Information
    country: Optional[str] = Field(None, max_length=100)
    first_language: Optional[str] = Field(None, max_length=100)
    comments: Optional[str] = None
    
    completed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DemographicsCreate(DemographicsBase):
    session_id: str = Field(..., description="Session ID this demographics data belongs to")
    raw_response: Optional[Dict[str, Any]] = Field(None, description="Raw questionnaire response for backup")

class DemographicsResponse(DemographicsBase):
    id: int
    session_id: str
    completed_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DemographicsUpdate(DemographicsBase):
    """For updating existing demographics data"""
    pass

class DemographicsValidate(BaseModel):
    session_id: str
    session_has_demographics: bool
    demographics_exist: bool