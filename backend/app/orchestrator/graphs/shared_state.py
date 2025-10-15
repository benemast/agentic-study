# backend/app/orchestrator/graphs/shared_state.py
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime


class SharedWorkflowState(TypedDict, total=False):
    """
    Shared state structure used by both Workflow Builder and AI Assistant graphs
    
    This state flows through the LangGraph execution and is checkpointed to Redis/PostgreSQL
    """
    
    # Execution identification
    execution_id: int
    session_id: str
    condition: str  # 'workflow_builder' or 'ai_assistant'
    
    # Execution tracking
    step_number: int
    current_node: str
    status: str  # 'running', 'paused', 'completed', 'error'
    
    # Data flow
    input_data: Dict[str, Any]      # Original input
    working_data: Dict[str, Any]    # Current working data
    results: Dict[str, Any]         # Results from each node/step
    
    # Error handling
    errors: List[Dict[str, Any]]    # List of errors encountered
    warnings: List[str]             # Non-fatal warnings
    
    # Performance tracking
    started_at: str                 # ISO timestamp
    last_step_at: str              # ISO timestamp
    total_time_ms: int
    
    # Study-specific tracking
    user_interventions: int         # Count of user pauses/modifications
    checkpoints_created: int        # Count of checkpoints
    
    # Condition-specific data
    workflow_definition: Optional[Dict[str, Any]]  # For Workflow Builder
    task_description: Optional[str]                # For AI Assistant
    agent_plan: Optional[List[str]]                # For AI Assistant: planned steps
    agent_memory: Optional[List[Dict[str, Any]]]   # For AI Assistant: conversation memory
    
    # Metadata
    metadata: Dict[str, Any]


class NodeExecutionResult(TypedDict):
    """Result structure from executing a single node"""
    success: bool
    output_data: Dict[str, Any]
    execution_time_ms: int
    error: Optional[str]
    metadata: Dict[str, Any]


class AgentDecision(TypedDict):
    """Structure for AI Assistant agent decisions"""
    action: str                     # Action to take: 'gather_data', 'analyze', 'output', 'finish'
    reasoning: str                  # Agent's reasoning process
    tool_name: Optional[str]        # Tool to use
    tool_params: Dict[str, Any]     # Parameters for tool
    confidence: float               # Confidence score (0-1)
    alternatives_considered: List[str]  # Other options considered