# backend/app/schemas/survey.py
"""
Pydantic schemas for survey responses API
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Any
from datetime import datetime


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class SurveyResponseCreate(BaseModel):
    """Schema for creating a new survey response"""
    
    # Identification
    participant_id: int  # Changed from str to int to match sessions table
    session_id: str  # Changed from UUID to str to match sessions.session_id (VARCHAR)
    task_number: int = Field(..., ge=1, le=2, description="Task number (1 or 2)")
    condition: str = Field(..., description="'workflow_builder' or 'ai_assistant'")
    
    # Timestamps
    started_at: datetime
    completed_at: datetime
    
    # Section 1: NASA-TLX (0-100 scale)
    nasa_tlx_mental_demand: Optional[int] = Field(None, ge=0, le=100)
    nasa_tlx_temporal_demand: Optional[int] = Field(None, ge=0, le=100)
    nasa_tlx_performance: Optional[int] = Field(None, ge=0, le=100)
    nasa_tlx_effort: Optional[int] = Field(None, ge=0, le=100)
    nasa_tlx_frustration: Optional[int] = Field(None, ge=0, le=100)
    
    # Section 2: Control, Agency & Engagement (1-7 Likert)
    control_task: Optional[int] = Field(None, ge=1, le=7)
    agency_decisions: Optional[int] = Field(None, ge=1, le=7)
    engagement: Optional[int] = Field(None, ge=1, le=7)
    confidence_quality: Optional[int] = Field(None, ge=1, le=7)
    trust_results: Optional[int] = Field(None, ge=1, le=7)
    
    # Section 3: Understanding & Explainability (1-7 Likert)
    process_transparency: Optional[int] = Field(None, ge=1, le=7)
    predictability: Optional[int] = Field(None, ge=1, le=7)
    understood_choices: Optional[int] = Field(None, ge=1, le=7)
    understood_reasoning: Optional[int] = Field(None, ge=1, le=7)
    could_explain: Optional[int] = Field(None, ge=1, le=7)
    
    # Section 4: Task Performance & Outcomes (1-7 Likert)
    ease_of_use: Optional[int] = Field(None, ge=1, le=7)
    efficiency: Optional[int] = Field(None, ge=1, le=7)
    found_insights: Optional[int] = Field(None, ge=1, le=7)
    explored_thoroughly: Optional[int] = Field(None, ge=1, le=7)
    discovered_insights: Optional[int] = Field(None, ge=1, le=7)
    accurate_reliable: Optional[int] = Field(None, ge=1, le=7)
    recommend: Optional[int] = Field(None, ge=1, le=7)
    
    # Section 5: Open-Ended Feedback (optional text)
    feedback_positive: Optional[str] = Field(None, max_length=5000)
    feedback_negative: Optional[str] = Field(None, max_length=5000)
    feedback_improvements: Optional[str] = Field(None, max_length=5000)
    
    # Metadata
    language: str = Field(default='en', max_length=5)
    
    @validator('condition')
    def validate_condition(cls, v):
        if v not in ['workflow_builder', 'ai_assistant']:
            raise ValueError("condition must be 'workflow_builder' or 'ai_assistant'")
        return v
    
    @validator('completed_at')
    def validate_completion_time(cls, v, values):
        if 'started_at' in values and v < values['started_at']:
            raise ValueError("completed_at must be after started_at")
        return v
    
    class Config:
        from_attributes = True


# ============================================================
# RESPONSE SCHEMAS
# ============================================================

class SurveyResponseBase(BaseModel):
    """Base survey response with all fields"""
    
    id: int
    participant_id: int  # Changed from str to int
    session_id: str  # Changed from UUID to str
    task_number: int
    condition: str
    
    started_at: datetime
    completed_at: datetime
    duration_seconds: Optional[int]
    
    # NASA-TLX
    nasa_tlx_mental_demand: Optional[int]
    nasa_tlx_temporal_demand: Optional[int]
    nasa_tlx_performance: Optional[int]
    nasa_tlx_effort: Optional[int]
    nasa_tlx_frustration: Optional[int]
    
    # Section 2
    control_task: Optional[int]
    agency_decisions: Optional[int]
    engagement: Optional[int]
    confidence_quality: Optional[int]
    trust_results: Optional[int]
    
    # Section 3
    process_transparency: Optional[int]
    predictability: Optional[int]
    understood_choices: Optional[int]
    understood_reasoning: Optional[int]
    could_explain: Optional[int]
    
    # Section 4
    ease_of_use: Optional[int]
    efficiency: Optional[int]
    found_insights: Optional[int]
    explored_thoroughly: Optional[int]
    discovered_insights: Optional[int]
    accurate_reliable: Optional[int]
    recommend: Optional[int]
    
    # Section 5
    feedback_positive: Optional[str]
    feedback_negative: Optional[str]
    feedback_improvements: Optional[str]
    
    # Metadata
    language: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SurveyResponseWithScores(SurveyResponseBase):
    """Survey response with computed hypothesis scores"""
    
    # Computed scores
    nasa_tlx_overall_workload: Optional[float]
    h1a_control_score: Optional[float]
    h1b_engagement_score: Optional[float]
    h1d_confidence_score: Optional[float]
    h3_understanding_score: Optional[float]
    efficiency_score: Optional[float]
    effectiveness_score: Optional[float]


class SurveyResponseSummary(BaseModel):
    """Lightweight summary for listing"""
    
    id: int
    participant_id: int  # Changed to int
    task_number: int
    condition: str
    completed_at: datetime
    duration_seconds: Optional[int]
    
    # Key scores
    nasa_tlx_overall_workload: Optional[float]
    h1a_control_score: Optional[float]
    h1b_engagement_score: Optional[float]
    h3_understanding_score: Optional[float]
    
    class Config:
        from_attributes = True


# ============================================================
# API RESPONSE WRAPPERS
# ============================================================

class SurveySubmitResponse(BaseModel):
    """Response after successfully submitting a survey"""
    
    success: bool
    message: str
    survey_id: int
    participant_id: int  # Changed to int
    task_number: int
    condition: str
    duration_seconds: Optional[int]


class SurveyListResponse(BaseModel):
    """Response for listing surveys with pagination"""
    
    surveys: list[SurveyResponseSummary]
    total: int
    page: int
    per_page: int


class SurveyValidationError(BaseModel):
    """Validation error response"""
    
    field: str
    message: str
    value: Optional[Any]


class SurveyErrorResponse(BaseModel):
    """Error response for survey operations"""
    
    success: bool = False
    error: str
    details: Optional[list[SurveyValidationError]] = None