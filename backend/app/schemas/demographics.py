# backend/app/schemas/demographics.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DemographicsBase(BaseModel):

    # Basic Information
    age: Optional[str] = Field(None, max_length=50)
    gender_identity: Optional[str] = Field(None, max_length=50, alias='genderIdentity')
    education: Optional[str] = Field(None, max_length=100)
    field_of_study: Optional[str] = Field(None, max_length=200)
    occupation: Optional[str] = None
    first_language: Optional[str] = Field(None, max_length=100)
    
    # Professional Background
    industry: Optional[str] = Field(None, max_length=50)
    work_experience: Optional[str] = Field(None, max_length=50)
    
    # Technical Background
    programming_experience: Optional[str] = Field(None, max_length=50)
    ai_ml_experience: Optional[str] = Field(None, max_length=50)
    ai_ml_expertise: Optional[str] = Field(None, max_length=50)
    ai_tools_used: Optional[List[str]] = Field(default_factory=list)
    workflow_tools_used: Optional[List[str]] = Field(default_factory=list)
    technical_role: Optional[str] = Field(None, max_length=100)
    
    # Optional Information
    comments: Optional[str] = None
    
    completed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True  # Allow both 'gender_identity' and 'genderIdentity'


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
        populate_by_name = True

class DemographicsUpdate(DemographicsBase):
    """For updating existing demographics data"""
    pass

class DemographicsValidate(BaseModel):
    session_id: str
    session_has_demographics: bool
    demographics_exist: bool

class DemographicsDebugResponse(BaseModel):
    table_exists: bool
    total_records: Optional[int] = None
    recent_records: Optional[int] = None
    recent_session_ids: Optional[List[str]] = None
    database_status: str
    error: Optional[str] = None

class DemographicsListResponse(BaseModel):
    demographics: List[DemographicsResponse]
    total: int
    limit: int
    offset: int