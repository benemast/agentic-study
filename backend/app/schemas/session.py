# backend/app/schemas/session.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

'''
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id character varying,
    participant_id integer,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    last_activity timestamp without time zone,
    user_agent text,
    screen_resolution character varying,
    session_data json,
    session_metadata json,
    is_active character varying,
    connection_status character varying,
    has_demographics boolean NOT NULL DEFAULT false
);
'''

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

class SessionUpdate(BaseModel):
    session_data: Optional[Dict[str, Any]] = {}
    last_activity: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = None
    connection_status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    has_demographics: Optional[bool] = None

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

class SessionValidateResponse(BaseModel):
    valid: bool
    session_id: str
    participant_id: int
    last_activity: datetime
    session_age_minutes: float
    has_demographics: bool

class SessionSyncResponse(BaseModel):
    success: bool
    synced_at: str
    session_id: str

class SessionQuickSaveResponse(BaseModel):
    success: bool
    quick_save: Optional[bool] = None
    reason: Optional[str] = None

class SessionEndResponse(BaseModel):
    message: str
    session_duration_minutes: float
    final_interaction_count: int

class SessionListItem(BaseModel):
    session_id: str
    participant_id: int
    start_time: datetime
    end_time: Optional[datetime]
    is_active: bool
    connection_status: str
    last_activity: Optional[datetime]
    interaction_count: int

    class Config:
        from_attributes = True

class SessionHealthResponse(BaseModel):
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

class SessionHeartbeatResponse(BaseModel):
    success: bool
    timestamp: datetime

class SessionDeleteResponse(BaseModel):
    message: str