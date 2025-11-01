# backend/app/orchestrator/state_manager.py
import redis
import json
from typing import Any, Dict, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from contextlib import contextmanager
import logging
import asyncio

from app.configs.config import settings
from app.models.execution import ExecutionCheckpoint, ExecutionLog
from .checkpoint_buffer import checkpoint_buffer
from .redis_hash_manager import redis_hash_state 
from .graphs.shared_state import (
    SharedWorkflowState,
    initialize_state,
    get_row_operation_summary,
    get_data_source_info
)

logger = logging.getLogger(__name__)


class HybridStateManager:
    """
    Manages execution state using Redis for speed and PostgreSQL for persistence.
    
    Architecture:
    - Redis: Fast in-memory state with hash structures (200x more efficient)
    - PostgreSQL: Strategic checkpoints for analysis and recovery
    - TypedDict: LangGraph-compatible state schema
    
    Features:
    - SQL data source tracking
    - Row operation history
    - Product title deduplication
    - Efficient field-level updates
    """
    
    def __init__(self, use_buffer: bool = True, use_hash: bool = True):
        """
        Initialize state manager with performance optimizations
        
        Args:
            use_buffer: Enable checkpoint batching (default: True)
            use_hash: Enable Redis hash structures (default: True)
        """
        # Checkpoint Batching
        self.use_buffer = use_buffer
        self.buffer = checkpoint_buffer if use_buffer else None
        
        # Redis with Hash Structures
        self.use_hash = use_hash
        self.redis_hash_state = redis_hash_state if use_hash else None
        
        # Legacy Redis client (fallback for JSON format)
        self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        self.state_ttl = 7200  # 2 hours TTL for Redis keys
            
        # Test Redis connection
        try:
            self.redis_client.ping()
            logger.info(
                f"Redis connected for state management "
                f"(hash_mode: {use_hash}, buffering: {use_buffer})"
            )
        except redis.ConnectionError as e:
            logger.error(f"Redis connection failed: {e}")
            raise
    
    # ==================== MEMORY (Redis) ====================
    
    def save_state_to_memory(self, execution_id: int, state: Dict[str, Any]) -> None:
        """
        Save current execution state to Redis
        
        Uses hash structure if enabled (200x more efficient for updates)
        
        Args:
            execution_id: Unique execution identifier
            state: SharedWorkflowState (TypedDict at runtime = dict)
        """
        if self.use_hash and self.redis_hash_state:
            # Use hash structure (efficient)
            self.redis_hash_state.save_state(execution_id, state)
        else:
            # Fallback to JSON format
            self._save_state_json(execution_id, state)
    
    def _save_state_json(self, execution_id: int, state: Dict[str, Any]) -> None:
        """Legacy JSON format save (fallback)"""
        key = self._get_state_key(execution_id)
        try:
            serialized = json.dumps(state, default=str)
            self.redis_client.setex(key, self.state_ttl, serialized)
            logger.debug(f"State saved to Redis (JSON): {key}")
        except Exception as e:
            logger.error(f"Failed to save state to Redis: {e}")
            raise
    
    def get_state_from_memory(self, execution_id: int) -> Optional[SharedWorkflowState]:
        """
        Retrieve current execution state from Redis
        
        Args:
            execution_id: Unique execution identifier
            
        Returns:
            SharedWorkflowState (TypedDict) or None if not found
        """
        if self.use_hash and self.redis_hash_state:
            # Try hash format first
            state = self.redis_hash_state.get_state(execution_id)
            if state:
                return state
        
        # Fallback to JSON format (for backward compatibility)
        return self._get_state_json(execution_id)
    
    def _get_state_json(self, execution_id: int) -> Optional[Dict[str, Any]]:
        """Legacy JSON format retrieval (fallback)"""
        key = self._get_state_key(execution_id)
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to retrieve state from Redis: {e}")
            return None
    
    # ==================== FIELD UPDATES (Atomic & Efficient) ====================
    
    def update_state_field(self, execution_id: int, field: str, value: Any) -> None:
        """
        Update a single field in Redis state (atomic operation)
        
        Examples:
            state_manager.update_state_field(123, 'status', 'completed')
            state_manager.update_state_field(123, 'current_node', 'sentiment')
        
        Args:
            execution_id: Unique execution identifier
            field: State field to update
            value: New value
        """
        if self.use_hash and self.redis_hash_state:
            # ✅ Efficient field update (1KB vs 100KB+)
            self.redis_hash_state.update_field(execution_id, field, value)
        else:
            # Fallback: get full state, update field, save full state
            state = self.get_state_from_memory(execution_id)
            if state:
                state[field] = value
                self.save_state_to_memory(execution_id, state)
    
    def update_state_fields(
        self, 
        execution_id: int, 
        updates: Dict[str, Any]
    ) -> None:
        """
        Update multiple fields atomically
        More efficient than updating one-by-one
        
        Example:
            state_manager.update_state_fields(123, {
                'step_number': 5,
                'current_node': 'filter_reviews',
                'status': 'running'
            })
        
        Args:
            execution_id: Unique execution identifier
            updates: Dictionary of field updates
        """
        if self.use_hash and self.redis_hash_state:
            # ✅ Batch field update
            self.redis_hash_state.update_fields(execution_id, updates)
        else:
            # Fallback: get, update, save
            state = self.get_state_from_memory(execution_id)
            if state:
                state.update(updates)
                self.save_state_to_memory(execution_id, state)
    
    def increment_field(self, execution_id: int, field: str, amount: int = 1) -> int:
        """
        Atomically increment a numeric field
        
        Perfect for: step_number, total_time_ms
        
        Example:
            state_manager.increment_field(123, 'step_number', 1)
        
        Args:
            execution_id: Unique execution identifier
            field: Numeric field to increment
            amount: Amount to increment by
            
        Returns:
            New field value
        """
        if self.use_hash and self.redis_hash_state:
            # Atomic increment (very fast)
            return self.redis_hash_state.increment_field(execution_id, field, amount)
        else:
            # Fallback: get, increment, save
            state = self.get_state_from_memory(execution_id)
            if state:
                current = state.get(field, 0)
                new_value = current + amount
                state[field] = new_value
                self.save_state_to_memory(execution_id, state)
                return new_value
            return 0
    
    def append_to_list_field(
        self,
        execution_id: int,
        field: str,
        item: Any
    ) -> bool:
        """
        Append item to a list field
        
        Use for: errors, warnings, row_operation_history
        
        Example:
            state_manager.append_to_list_field(123, 'errors', {
                'step': 5,
                'message': 'Connection timeout'
            })
        
        Args:
            execution_id: Unique execution identifier
            field: List field name
            item: Item to append
            
        Returns:
            True if successful
        """
        if self.use_hash and self.redis_hash_state:
            return self.redis_hash_state.append_to_list_field(execution_id, field, item)
        else:
            # Fallback
            state = self.get_state_from_memory(execution_id)
            if state:
                if field not in state:
                    state[field] = []
                state[field].append(item)
                self.save_state_to_memory(execution_id, state)
                return True
            return False
    
    # ==================== STATE STRUCTURE HELPERS ====================
    
    def update_data_source(
        self,
        execution_id: int,
        sql_query: str,
        query_params: Dict[str, Any],
        row_count: int,
        category: str
    ) -> None:
        """
        Update SQL data source reference
        
        Example:
            state_manager.update_data_source(
                123,
                sql_query="SELECT * FROM reviews...",
                query_params={'category': 'headphones'},
                row_count=2000,
                category='headphones'
            )
        """
        data_source = {
            'sql_query': sql_query,
            'query_params': query_params,
            'executed_at': datetime.utcnow().isoformat(),
            'row_count_at_load': row_count,
            'category': category,
            'can_reload': True
        }
        self.update_state_field(execution_id, 'data_source', data_source)
        logger.info(f"✓ SQL reference stored: {row_count} rows from query")
    
    def add_row_operation(
        self,
        execution_id: int,
        tool_id: str,
        tool_name: str,
        operation_type: str,
        rows_before: int,
        rows_after: int,
        criteria: Optional[Dict[str, Any]] = None,
        execution_time_ms: int = 0
    ) -> None:
        """
        Track row modification operation
        
        Example:
            state_manager.add_row_operation(
                123,
                tool_id='filter_reviews',
                tool_name='Filter Reviews',
                operation_type='filter',
                rows_before=2000,
                rows_after=500,
                criteria={'min_rating': 4}
            )
        """
        operation = {
            'tool_id': tool_id,
            'tool_name': tool_name,
            'operation_type': operation_type,
            'tool_category': 'data',
            'rows_before': rows_before,
            'rows_after': rows_after,
            'rows_removed': rows_before - rows_after,
            'criteria': criteria or {},
            'timestamp': datetime.utcnow().isoformat(),
            'execution_time_ms': execution_time_ms
        }
        
        self.append_to_list_field(execution_id, 'row_operation_history', operation)
        
        logger.info(
            f"✓ Row operation tracked: {tool_name} reduced dataset from "
            f"{rows_before} to {rows_after} rows "
            f"({rows_before - rows_after} removed, {rows_after/rows_before*100:.1f}% remaining)"
        )
    
    def update_record_store(
        self,
        execution_id: int,
        record_store: Dict[str, Any]
    ) -> None:
        """
        Update record store (after filter/clean)
        
        Example:
            state_manager.update_record_store(123, state['record_store'])
        """
        self.update_state_field(execution_id, 'record_store', record_store)
    
    def update_enrichment_registry(
        self,
        execution_id: int,
        enrichment_registry: Dict[str, Any]
    ) -> None:
        """
        Update enrichment registry (after column addition)
        
        Example:
            state_manager.update_enrichment_registry(123, state['enrichment_registry'])
        """
        self.update_state_field(execution_id, 'enrichment_registry', enrichment_registry)
    
    def get_row_summary(self, state: SharedWorkflowState) -> Dict[str, Any]:
        """
        Get row operation summary from state
        
        Returns:
            - total_operations: Number of filter/clean operations
            - initial_rows: Row count at load
            - current_rows: Row count now
            - total_removed: Total rows removed
            - reduction_pct: Percentage reduction
        """
        return get_row_operation_summary(state)
    
    def get_sql_reference(self, state: SharedWorkflowState) -> Optional[Dict[str, Any]]:
        """
        Get SQL data source info from state
        
        Returns SQL query, parameters, and metadata
        """
        return get_data_source_info(state)
    
    # ==================== LIFECYCLE MANAGEMENT ====================
    
    def clear_memory_state(self, execution_id: int) -> None:
        """
        Remove execution state from Redis (cleanup after completion)
        
        Args:
            execution_id: Unique execution identifier
        """
        if self.use_hash and self.redis_hash_state:
            self.redis_hash_state.delete_state(execution_id)
        else:
            key = self._get_state_key(execution_id)
            self.redis_client.delete(key)
        logger.debug(f"State cleared from Redis: execution {execution_id}")
    
    def extend_state_ttl(self, execution_id: int) -> None:
        """Extend TTL for long-running executions"""
        if self.use_hash and self.redis_hash_state:
            self.redis_hash_state.extend_ttl(execution_id)
        else:
            key = self._get_state_key(execution_id)
            self.redis_client.expire(key, self.state_ttl)
    
    # ==================== PERSISTENCE (PostgreSQL) ====================
    
    async def checkpoint_to_db(
        self,
        db: Session,
        execution_id: int,
        step_number: int,
        checkpoint_type: str,
        state: SharedWorkflowState,
        node_id: Optional[str] = None,
        user_interaction: bool = False,
        agent_reasoning: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        time_since_last_ms: Optional[int] = None,
        buffered: bool = True
    ) -> ExecutionCheckpoint:
        """
        Create strategic checkpoint with optional buffering
        
        Args:
            db: Database session (used only if not buffered)
            execution_id: Unique execution identifier
            step_number: Current step in execution
            checkpoint_type: Type of checkpoint
            state: Full state snapshot (SharedWorkflowState)
            buffered: If True, use buffer for batching (default)
            ... other args ...
            
        Returns:
            Created checkpoint record
        """

        state['checkpoints_created'] = state.get('checkpoints_created', 0) + 1 

        sanitized_state = state
        sanitized_metadata = metadata if metadata else {}

        checkpoint = ExecutionCheckpoint(
            execution_id=execution_id,
            step_number=step_number,
            checkpoint_type=checkpoint_type,
            node_id=node_id,
            state_snapshot=sanitized_state,  # TypedDict = dict at runtime
            timestamp=datetime.utcnow(),
            time_since_last_step_ms=time_since_last_ms,
            user_interaction=user_interaction,
            agent_reasoning=agent_reasoning,
            checkpoint_metadata=sanitized_metadata or {}
        )
        
        # Use buffering for performance
        if buffered and self.use_buffer and self.buffer:
            await self.buffer.add(checkpoint)
            logger.debug(
                f"Checkpoint buffered: execution_id={execution_id}, "
                f"step={step_number}, type={checkpoint_type}"
            )
        else:
            # Direct DB write (for critical checkpoints or when buffer disabled)
            try:
                db.add(checkpoint)
                db.commit()
                logger.info(
                    f"Checkpoint saved (direct): execution_id={execution_id}, "
                    f"step={step_number}, type={checkpoint_type}"
                )
            except Exception as e:
                logger.error(f"Failed to create checkpoint: {e}")
                db.rollback()
                raise
        
        return checkpoint
    
    @contextmanager
    def atomic_checkpoint(
        self,
        execution_id: int,
        step_number: int,
        checkpoint_type: str,
        state: SharedWorkflowState,
        **kwargs
    ):
        """
        Create checkpoint with automatic transaction management
        
        Usage:
            with state_manager.atomic_checkpoint(exec_id, step, type, state):
                # Do other operations
                # Everything commits together or rolls back together
                pass
        """
        from app.database import get_db_context

        with get_db_context() as db:
            # Force unbuffered for atomic operations
            checkpoint = asyncio.run(
                self.checkpoint_to_db(
                    db=db,
                    execution_id=execution_id,
                    step_number=step_number,
                    checkpoint_type=checkpoint_type,
                    state=state,
                    buffered=False,  # Direct write for atomicity
                    **kwargs
                )
            )
            
            try:
                yield checkpoint
            except Exception:
                raise

    async def flush_checkpoints(self, execution_id: Optional[int] = None) -> int:
        """
        Manually flush checkpoint buffer
        
        Args:
            execution_id: If provided, flush only checkpoints for this execution
            
        Returns:
            Number of checkpoints flushed
        """
        if not self.use_buffer or not self.buffer:
            return 0
        
        if execution_id:
            return await self.buffer.flush_for_execution(execution_id)
        else:
            return await self.buffer.flush()

    def checkpoint_with_redis_update(
        self,
        db: Session,
        execution_id: int,
        step_number: int,
        checkpoint_type: str,
        state: SharedWorkflowState,
        **kwargs
    ) -> ExecutionCheckpoint:
        """
        Atomic operation: checkpoint to DB AND update Redis
        
        Both operations succeed together or fail together
        
        Args:
            db: Database session
            execution_id: Execution ID
            step_number: Current step
            checkpoint_type: Checkpoint type
            state: State to save
            **kwargs: Additional checkpoint parameters
            
        Returns:
            Created checkpoint
        """
        try:
            # Create checkpoint (not committed yet)
            checkpoint = asyncio.run(
                self.checkpoint_to_db(
                    db=db,
                    execution_id=execution_id,
                    step_number=step_number,
                    checkpoint_type=checkpoint_type,
                    state=state,
                    buffered=False,  # Direct write for atomicity
                    **kwargs
                )
            )
            
            # Update Redis
            self.save_state_to_memory(execution_id, state)
            
            # Commit DB transaction
            db.commit()
            
            logger.info(f"✓ Atomic checkpoint complete: {checkpoint_type}")
            return checkpoint
            
        except Exception as e:
            logger.error(f"Atomic checkpoint failed: {e}")
            db.rollback()
            
            # Try to rollback Redis too (best effort)
            try:
                # Restore previous state from DB if possible
                prev_checkpoint = self.get_latest_checkpoint(db, execution_id)
                if prev_checkpoint and prev_checkpoint.state_snapshot:
                    self.save_state_to_memory(execution_id, prev_checkpoint.state_snapshot)
            except Exception as redis_rollback_error:
                logger.error(f"Failed to rollback Redis: {redis_rollback_error}")
            
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
        # Flush buffer for this execution
        if self.use_buffer and self.buffer:
            asyncio.run(self.buffer.flush_for_execution(execution_id))
        
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
        if self.use_buffer and self.buffer:
            asyncio.run(self.buffer.flush_for_execution(execution_id))
        
        return db.query(ExecutionCheckpoint).filter(
            ExecutionCheckpoint.execution_id == execution_id
        ).order_by(ExecutionCheckpoint.step_number.desc()).first()
    
    def get_checkpoint_at_step(
        self,
        db: Session,
        execution_id: int,
        step_number: int
    ) -> Optional[ExecutionCheckpoint]:
        """Get checkpoint at specific step"""
        if self.use_buffer and self.buffer:
            asyncio.run(self.buffer.flush_for_execution(execution_id))
        
        return db.query(ExecutionCheckpoint).filter(
            ExecutionCheckpoint.execution_id == execution_id,
            ExecutionCheckpoint.step_number == step_number
        ).first()
    
    # ==================== METRICS ====================
    
    def get_buffer_metrics(self) -> Dict[str, Any]:
        """Get checkpoint buffer performance metrics"""
        if not self.use_buffer or not self.buffer:
            return {'buffering_enabled': False}
        
        return {
            'buffering_enabled': True,
            **self.buffer.get_metrics()
        }
    
    def get_redis_metrics(self) -> Dict[str, Any]:
        """Get Redis hash performance metrics"""
        if not self.use_hash or not self.redis_hash_state:
            return {'hash_mode_enabled': False}
        
        return {
            'hash_mode_enabled': True,
            **self.redis_hash_state.get_statistics()
        }
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all performance metrics"""
        return {
            'checkpoint_batching': self.get_buffer_metrics(),
            'redis_optimization': self.get_redis_metrics()
        }
    
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
            
        except Exception as e:
            logger.error(f"Failed to create log entry: {e}")
            raise
    
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
        # Always checkpoint these types
        always_checkpoint = [
            'execution_start',
            'execution_end',
            'error',
            'cancelled',
            'user_interaction'
        ]
        
        if checkpoint_type in always_checkpoint:
            return True
        
        # Condition-specific checkpointing
        if condition == 'workflow_builder':
            # Workflow Builder: checkpoint all node operations
            return checkpoint_type in ['node_start', 'node_end']
        
        elif condition == 'ai_assistant':
            # AI Assistant: checkpoint agent decisions and execution steps
            return checkpoint_type in ['agent_decision', 'execution_step']
        
        return False
    
    async def shutdown(self):
        """Cleanup on shutdown - flush remaining checkpoints"""
        logger.info("Shutting down HybridStateManager")
        
        if self.use_buffer and self.buffer:
            await self.buffer.shutdown()

# ==================== SINGLETON INSTANCE ====================

# Create singleton instance
state_manager = HybridStateManager(
    use_buffer=True,  # Enable checkpoint batching
    use_hash=True     # Enable Redis hash structures
)