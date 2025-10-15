# backend/app/models/execution.py
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.session import Base

class WorkflowExecution(Base):
    """Track workflow/agent execution runs"""
    __tablename__ = "workflow_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, index=True)
    
    # Study condition
    condition = Column(String(20), nullable=False, index=True)  # 'workflow_builder' or 'ai_assistant'
    
    # Execution tracking
    status = Column(String(20), default='pending', index=True)  # 'pending', 'running', 'completed', 'failed', 'cancelled'
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Input definition
    workflow_definition = Column(JSON, nullable=True)  # For Workflow Builder: {nodes: [], edges: []}
    task_description = Column(Text, nullable=True)     # For AI Assistant: natural language goal
    input_data = Column(JSON, nullable=True)           # Initial data/parameters
    
    # Output results
    final_result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)
    
    # Performance metrics
    execution_time_ms = Column(Integer, nullable=True)
    steps_completed = Column(Integer, default=0)
    steps_total = Column(Integer, nullable=True)  # Expected steps (if known)
    
    # Study-specific metrics
    user_interventions = Column(Integer, default=0)    # Times user paused/modified
    checkpoints_count = Column(Integer, default=0)     # Number of state saves
    tokens_used = Column(Integer, default=0)           # For AI Assistant LLM calls
    estimated_cost_usd = Column(Float, default=0.0)    # Cost tracking
    
    # Metadata
    execution_metadata = Column(JSON, nullable=True)   # Extra context
    
    # Relationships
    checkpoints = relationship("ExecutionCheckpoint", back_populates="execution", cascade="all, delete-orphan")
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )
    
    def __repr__(self):
        return f"<WorkflowExecution(id={self.id}, condition={self.condition}, status={self.status})>"


class ExecutionCheckpoint(Base):
    """Strategic state snapshots during execution"""
    __tablename__ = "execution_checkpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Checkpoint identification
    step_number = Column(Integer, index=True)
    checkpoint_type = Column(String(50))  # 'node_start', 'node_end', 'agent_decision', 'user_intervention', 'error'
    node_id = Column(String(100), nullable=True)  # For Workflow Builder nodes
    
    # State snapshot
    state_snapshot = Column(JSON)  # Full state from Redis
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Performance tracking
    time_since_last_step_ms = Column(Integer, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    
    # Study metrics
    user_interaction = Column(Boolean, default=False)  # Was this triggered by user action?
    agent_reasoning = Column(Text, nullable=True)       # For AI Assistant: agent's thought process
    
    # Additional context
    checkpoint_metadata = Column(JSON, nullable=True)
    
    # Relationships
    execution = relationship("WorkflowExecution", back_populates="checkpoints")
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )
    
    def __repr__(self):
        return f"<ExecutionCheckpoint(execution_id={self.execution_id}, step={self.step_number}, type={self.checkpoint_type})>"


class ExecutionLog(Base):
    """Detailed logging for debugging and analysis"""
    __tablename__ = "execution_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    log_level = Column(String(20), index=True)  # 'DEBUG', 'INFO', 'WARNING', 'ERROR'
    message = Column(Text)
    
    # Contextual information
    node_id = Column(String(100), nullable=True)
    step_number = Column(Integer, nullable=True)
    
    # Structured data
    log_data = Column(JSON, nullable=True)
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )