from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ExecutionRequest(BaseModel):
    """Request to execute a workflow or agent task"""
    session_id: str
    condition: str = Field(..., pattern="^(workflow_builder|ai_assistant)$")
    workflow: Optional[Dict[str, Any]] = None  # For workflow_builder
    task_description: Optional[str] = None     # For ai_assistant
    input_data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExecutionResponse(BaseModel):
    """Response after starting execution"""
    execution_id: int
    status: str
    message: str


class ExecutionStatusResponse(BaseModel):
    """Current execution status"""
    execution_id: int
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    steps_completed: int
    execution_time_ms: Optional[int]
    current_step: Optional[int] = None
    current_node: Optional[str] = None
    progress_percentage: Optional[int] = None
    error_message: Optional[str] = None


class ExecutionDetailResponse(BaseModel):
    """Detailed execution information"""
    execution_id: int
    session_id: str
    condition: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    steps_completed: int
    execution_time_ms: Optional[int]
    workflow_definition: Optional[Dict[str, Any]]
    task_description: Optional[str]
    final_result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    checkpoints_count: int


class CheckpointResponse(BaseModel):
    """Checkpoint information"""
    id: int
    step_number: int
    checkpoint_type: str
    node_id: Optional[str]
    timestamp: datetime
    time_since_last_step_ms: Optional[int]
    user_interaction: bool