# backend/app/schemas/questionaires.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums for standardized values
class AgeRange(str, Enum):
    AGE_18_24 = "18-24"
    AGE_25_34 = "25-34"
    AGE_35_44 = "35-44"
    AGE_45_54 = "45-54"
    AGE_55_64 = "55-64"
    AGE_65_PLUS = "65+"
    PREFER_NOT_TO_SAY = "prefer-not-to-say"

class Gender(str, Enum):
    WOMAN = "woman"
    MAN = "man"
    NON_BINARY = "non-binary"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer-not-to-say"

class Education(str, Enum):
    HIGH_SCHOOL = "high-school"
    SOME_COLLEGE = "some-college"
    BACHELORS = "bachelors"
    MASTERS = "masters"
    PHD = "phd"
    OTHER = "other"

class ExperienceLevel(str, Enum):
    NONE = "none"
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class TechnicalRole(str, Enum):
    DEVELOPER = "developer"
    DATA_SCIENTIST = "data-scientist"
    RESEARCHER = "researcher"
    PRODUCT_MANAGER = "product-manager"
    DESIGNER = "designer"
    STUDENT = "student"
    BUSINESS_ANALYST = "business-analyst"
    CONSULTANT = "consultant"
    OTHER = "other"
    NON_TECHNICAL = "non-technical"

class WorkflowTool(str, Enum):
    ZAPIER = "zapier"
    IFTTT = "ifttt"
    MICROSOFT_POWER_AUTOMATE = "microsoft-power-automate"
    N8N = "n8n"
    INTEGROMAT_MAKE = "integromat-make"
    GITHUB_ACTIONS = "github-actions"
    AIRFLOW = "airflow"
    LANGCHAIN = "langchain"
    FLOWISE = "flowise"
    NONE = "none"
    OTHER = "other"

class TimeAvailability(str, Enum):
    TIME_15_30 = "15-30min"
    TIME_30_45 = "30-45min"
    TIME_45_60 = "45-60min"
    TIME_60_PLUS = "60min+"
    FLEXIBLE = "flexible"

# Request schemas
class DemographicsCreate(BaseModel):
    # Basic Information
    age: Optional[AgeRange] = None
    gender: Optional[Gender] = None
    education: Optional[Education] = None
    occupation: Optional[str] = Field(None, max_length=500)
    
    # Technical Background
    programming_experience: Optional[ExperienceLevel] = None
    ai_ml_experience: Optional[ExperienceLevel] = None
    workflow_tools_used: Optional[List[WorkflowTool]] = Field(default_factory=list)
    technical_role: Optional[TechnicalRole] = None
    
    # Study Context
    participation_motivation: Optional[str] = Field(None, max_length=2000)
    expectations: Optional[str] = Field(None, max_length=2000)
    time_availability: Optional[TimeAvailability] = None
    
    # Optional Information
    country: Optional[str] = Field(None, max_length=100)
    first_language: Optional[str] = Field(None, max_length=100)
    comments: Optional[str] = Field(None, max_length=2000)
    
    @validator('workflow_tools_used')
    def validate_workflow_tools(cls, v):
        if v is None:
            return []
        # Remove duplicates while preserving order
        seen = set()
        return [x for x in v if not (x in seen or seen.add(x))]
    
    @validator('occupation', 'participation_motivation', 'expectations', 'comments')
    def validate_text_fields(cls, v):
        if v is not None:
            # Strip whitespace and return None if empty
            v = v.strip()
            return v if v else None
        return v

class DemographicsUpdate(BaseModel):
    # All fields optional for updates
    age: Optional[AgeRange] = None
    gender: Optional[Gender] = None
    education: Optional[Education] = None
    occupation: Optional[str] = Field(None, max_length=500)
    programming_experience: Optional[ExperienceLevel] = None
    ai_ml_experience: Optional[ExperienceLevel] = None
    workflow_tools_used: Optional[List[WorkflowTool]] = None
    technical_role: Optional[TechnicalRole] = None
    participation_motivation: Optional[str] = Field(None, max_length=2000)
    expectations: Optional[str] = Field(None, max_length=2000)
    time_availability: Optional[TimeAvailability] = None
    country: Optional[str] = Field(None, max_length=100)
    first_language: Optional[str] = Field(None, max_length=100)
    comments: Optional[str] = Field(None, max_length=2000)

# Response schemas
class DemographicsResponse(BaseModel):
    id: str
    session_id: str
    
    # Basic Information
    age: Optional[str] = None
    gender: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    
    # Technical Background
    programming_experience: Optional[str] = None
    ai_ml_experience: Optional[str] = None
    workflow_tools_used: Optional[List[str]] = None
    technical_role: Optional[str] = None
    
    # Study Context
    participation_motivation: Optional[str] = None
    expectations: Optional[str] = None
    time_availability: Optional[str] = None
    
    # Optional Information
    country: Optional[str] = None
    first_language: Optional[str] = None
    comments: Optional[str] = None
    
    # Metadata
    completed_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DemographicsSummary(BaseModel):
    """Aggregated demographics data for analytics"""
    total_responses: int
    age_distribution: dict
    education_distribution: dict
    programming_experience_distribution: dict
    ai_ml_experience_distribution: dict
    technical_role_distribution: dict
    most_common_tools: List[dict]
    average_completion_time: Optional[float] = None

class DemographicsAnalytics(BaseModel):
    """Demographics analytics for research insights"""
    participant_segments: dict
    experience_correlations: dict
    tool_usage_patterns: dict
    motivation_themes: List[str]
    completion_stats: dict