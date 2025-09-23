# backend/app/schemas/session.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class SessionCreate(BaseModel):
    session_id: str
    start_time: str
    user_agent: Optional[str] = None
    screen_resolution: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class SessionResponse(BaseModel):
    session_id: str
    participant_id: int
    start_time: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class SessionSync(BaseModel):
    session_data: Dict[str, Any]
    sync_timestamp: str
    last_activity: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class SessionQuickSave(BaseModel):
    session_data: Dict[str, Any]
    quick_save_timestamp: str
    page_unload: Optional[bool] = False

class SessionValidate(BaseModel):
    session_id: str

class InteractionCreate(BaseModel):
    timestamp: str
    event_type: str
    event_data: Optional[Dict[str, Any]] = {}
    current_view: Optional[str] = None

class InteractionResponse(BaseModel):
    id: int
    session_id: str
    timestamp: datetime
    event_type: str
    event_data: Optional[Dict[str, Any]]
    current_view: Optional[str]
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    page_url: Optional[str] = None

    class Config:
        from_attributes = True

class SessionEnd(BaseModel):
    end_time: str
    final_stats: Optional[Dict[str, Any]] = {}
    end_reason: Optional[str] = "manual"
    final_metadata: Optional[Dict[str, Any]] = {}

class SessionHealth(BaseModel):
    session_id: str
    is_healthy: bool
    is_active: bool
    connection_status: str
    session_duration_minutes: float
    time_since_activity_minutes: float
    timeout_warning: bool
    interaction_count: int
    last_activity: Optional[datetime]
    metadata: Optional[Dict[str, Any]]

class SessionSummary(BaseModel):
    session_id: str
    participant_id: int
    start_time: datetime
    end_time: Optional[datetime]
    is_active: bool
    connection_status: str
    last_activity: Optional[datetime]
    interaction_count: int