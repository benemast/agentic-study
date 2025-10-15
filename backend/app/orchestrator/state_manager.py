# backend/app/orchestrator/state_manager.py
import redis
import json
from typing import Any, Dict, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
import logging

from app.config import settings
from app.models.execution import ExecutionCheckpoint, ExecutionLog

logger = logging.getLogger(__name__)


class HybridStateManager:
    """
    Manages execution state using Redis for speed and PostgreSQL for persistence.
    
    Redis: Fast in-memory state during execution
    PostgreSQL: Strategic checkpoints for analysis and recovery
    """
    
    def __init__(self):
        self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        self.state_ttl = 7200  # 2 hours TTL for Redis keys
        
        # Test Redis connection
        try:
            self.redis_client.ping()
            logger.info("✅ Redis connected for state management")
        except redis.ConnectionError as e:
            logger.error(f"❌ Redis connection failed: {e}")
            raise
    
    # ==================== MEMORY (Redis) ====================
    
    def save_state_to_memory(self, execution_id: int, state: Dict[str, Any]) -> None:
        """
        Save current execution state to Redis for fast access
        
        Args:
            execution_id: Unique execution identifier
            state: Complete state dictionary
        """
        key = self._get_state_key(execution_id)
        try:
            # Serialize state (handle datetime objects)
            serialized = json.dumps(state, default=str)
            self.redis_client.setex(key, self.state_ttl, serialized)
            logger.debug(f"State saved to Redis: {key}")
        except Exception as e:
            logger.error(f"Failed to save state to Redis: {e}")
            raise
    
    def get_state_from_memory(self, execution_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve current execution state from Redis
        
        Args:
            execution_id: Unique execution identifier
            
        Returns:
            State dictionary or None if not found
        """
        key = self._get_state_key(execution_id)
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to retrieve state from Redis: {e}")
            return None
    
    def update_state_field(self, execution_id: int, field: str, value: Any) -> None:
        """
        Update a single field in Redis state (atomic operation)
        
        Args:
            execution_id: Unique execution identifier
            field: State field to update
            value: New value
        """
        state = self.get_state_from_memory(execution_id)
        if state:
            state[field] = value
            self.save_state_to_memory(execution_id, state)
    
    def clear_memory_state(self, execution_id: int) -> None:
        """
        Remove execution state from Redis (cleanup after completion)
        
        Args:
            execution_id: Unique execution identifier
        """
        key = self._get_state_key(execution_id)
        self.redis_client.delete(key)
        logger.debug(f"State cleared from Redis: {key}")
    
    def extend_state_ttl(self, execution_id: int) -> None:
        """
        Extend TTL for long-running executions
        
        Args:
            execution_id: Unique execution identifier
        """
        key = self._get_state_key(execution_id)
        self.redis_client.expire(key, self.state_ttl)
    
    # ==================== PERSISTENCE (PostgreSQL) ====================
    
    def checkpoint_to_db(
        self,
        db: Session,
        execution_id: int,
        step_number: int,
        checkpoint_type: str,
        state: Dict[str, Any],
        node_id: Optional[str] = None,
        user_interaction: bool = False,
        agent_reasoning: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        time_since_last_ms: Optional[int] = None
    ) -> ExecutionCheckpoint:
        """
        Create strategic checkpoint in PostgreSQL
        
        Args:
            db: Database session
            execution_id: Unique execution identifier
            step_number: Current step in execution
            checkpoint_type: Type of checkpoint ('node_start', 'node_end', etc.)
            state: Full state snapshot
            node_id: Node identifier (for Workflow Builder)
            user_interaction: Whether user triggered this checkpoint
            agent_reasoning: Agent's thought process (for AI Assistant)
            metadata: Additional context
            time_since_last_ms: Time since last checkpoint
            
        Returns:
            Created checkpoint record
        """
        try:
            checkpoint = ExecutionCheckpoint(
                execution_id=execution_id,
                step_number=step_number,
                checkpoint_type=checkpoint_type,
                node_id=node_id,
                state_snapshot=state,
                timestamp=datetime.utcnow(),
                time_since_last_step_ms=time_since_last_ms,
                user_interaction=user_interaction,
                agent_reasoning=agent_reasoning,
                checkpoint_metadata=metadata or {}
            )
            
            db.add(checkpoint)
            db.commit()
            db.refresh(checkpoint)
            
            logger.info(f"Checkpoint created: execution_id={execution_id}, step={step_number}, type={checkpoint_type}")
            return checkpoint
            
        except Exception as e:
            logger.error(f"Failed to create checkpoint: {e}")
            db.rollback()
            raise
    
    def get_checkpoint_history(
        self, 
        db: Session, 
        execution_id: int,
        limit: Optional[int] = None
    ) -> List[ExecutionCheckpoint]:
        """
        Retrieve full checkpoint history for analysis
        
        Args:
            db: Database session
            execution_id: Unique execution identifier
            limit: Maximum number of checkpoints to return
            
        Returns:
            List of checkpoints ordered by step_number
        """
        query = db.query(ExecutionCheckpoint).filter(
            ExecutionCheckpoint.execution_id == execution_id
        ).order_by(ExecutionCheckpoint.step_number)
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def get_latest_checkpoint(
        self, 
        db: Session, 
        execution_id: int
    ) -> Optional[ExecutionCheckpoint]:
        """
        Get most recent checkpoint for recovery
        
        Args:
            db: Database session
            execution_id: Unique execution identifier
            
        Returns:
            Latest checkpoint or None
        """
        return db.query(ExecutionCheckpoint).filter(
            ExecutionCheckpoint.execution_id == execution_id
        ).order_by(ExecutionCheckpoint.step_number.desc()).first()
    
    # ==================== LOGGING ====================
    
    def log_execution_event(
        self,
        db: Session,
        execution_id: int,
        log_level: str,
        message: str,
        node_id: Optional[str] = None,
        step_number: Optional[int] = None,
        log_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log execution events for debugging and analysis
        
        Args:
            db: Database session
            execution_id: Unique execution identifier
            log_level: 'DEBUG', 'INFO', 'WARNING', 'ERROR'
            message: Log message
            node_id: Optional node identifier
            step_number: Optional step number
            log_data: Optional structured data
        """
        try:
            log_entry = ExecutionLog(
                execution_id=execution_id,
                timestamp=datetime.utcnow(),
                log_level=log_level,
                message=message,
                node_id=node_id,
                step_number=step_number,
                log_data=log_data or {}
            )
            
            db.add(log_entry)
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to create log entry: {e}")
            db.rollback()
    
    # ==================== HELPER METHODS ====================
    
    def _get_state_key(self, execution_id: int) -> str:
        """Generate Redis key for execution state"""
        return f"execution:{execution_id}:state"
    
    def should_checkpoint(
        self,
        condition: str,
        checkpoint_type: str,
        node_id: Optional[str] = None
    ) -> bool:
        """
        Determine if a checkpoint should be created
        
        Strategy:
        - Always checkpoint: start, end, errors, user interactions
        - Workflow Builder: checkpoint at each node (user wants visibility)
        - AI Assistant: checkpoint at agent decisions only
        
        Args:
            condition: 'workflow_builder' or 'ai_assistant'
            checkpoint_type: Type of checkpoint
            node_id: Node identifier
            
        Returns:
            True if checkpoint should be created
        """
        # Always checkpoint these events
        always_checkpoint = [
            'execution_start',
            'execution_end',
            'error',
            'user_intervention',
            'cancelled'
        ]
        
        if checkpoint_type in always_checkpoint:
            return True
        
        # Workflow Builder: checkpoint every node for transparency
        if condition == 'workflow_builder':
            return checkpoint_type in ['node_start', 'node_end', 'branch_decision']
        
        # AI Assistant: checkpoint agent decisions only (less frequent)
        if condition == 'ai_assistant':
            return checkpoint_type in ['agent_decision', 'agent_plan', 'tool_execution']
        
        return False
    
    def get_execution_stats(self, db: Session, execution_id: int) -> Dict[str, Any]:
        """
        Get execution statistics for analysis
        
        Args:
            db: Database session
            execution_id: Unique execution identifier
            
        Returns:
            Dictionary with execution statistics
        """
        checkpoints = self.get_checkpoint_history(db, execution_id)
        
        return {
            'total_checkpoints': len(checkpoints),
            'user_interventions': sum(1 for c in checkpoints if c.user_interaction),
            'total_time_ms': sum(c.time_since_last_step_ms or 0 for c in checkpoints),
            'checkpoint_types': {
                cp_type: sum(1 for c in checkpoints if c.checkpoint_type == cp_type)
                for cp_type in set(c.checkpoint_type for c in checkpoints)
            }
        }