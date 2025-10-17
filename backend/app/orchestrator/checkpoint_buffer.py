# backend/app/orchestrator/checkpoint_buffer.py
"""
Checkpoint Buffer - Batches checkpoint writes for performance

Benefits:
- Reduces DB roundtrips from O(n) to O(n/batch_size)
- Improves throughput for workflows with many nodes
- Automatic flush on buffer full or time limit
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
import logging
from sqlalchemy.orm import Session

from app.models.execution import ExecutionCheckpoint
from app.database import get_db_context

logger = logging.getLogger(__name__)


class CheckpointBuffer:
    """
    Buffers checkpoints and flushes them in batches
    
    Features:
    - Size-based flushing (default: 10 checkpoints)
    - Time-based flushing (default: 5 seconds)
    - Automatic flush on critical checkpoints
    - Thread-safe operations
    """
    
    def __init__(
        self, 
        max_size: int = 10,
        max_age_seconds: float = 5.0,
        auto_flush_critical: bool = True
    ):
        """
        Initialize checkpoint buffer
        
        Args:
            max_size: Flush when buffer reaches this size
            max_age_seconds: Flush when oldest checkpoint exceeds this age
            auto_flush_critical: Immediately flush critical checkpoints
        """
        self.max_size = max_size
        self.max_age = timedelta(seconds=max_age_seconds)
        self.auto_flush_critical = auto_flush_critical
        
        self.buffer: List[ExecutionCheckpoint] = []
        self.buffer_lock = asyncio.Lock()
        
        # Track when buffer was first written to
        self.first_checkpoint_time: Optional[datetime] = None
        
        # Critical checkpoint types that bypass buffering
        self.critical_types = {
            'execution_start',
            'execution_end', 
            'error',
            'cancelled',
            'user_interaction'
        }
        
        # Metrics
        self.total_buffered = 0
        self.total_flushed = 0
        self.flush_count = 0
        
        logger.info(
            f"✅ CheckpointBuffer initialized: "
            f"max_size={max_size}, max_age={max_age_seconds}s"
        )
    
    async def add(
        self, 
        checkpoint: ExecutionCheckpoint,
        force_flush: bool = False
    ) -> None:
        """
        Add checkpoint to buffer
        
        Args:
            checkpoint: Checkpoint to buffer
            force_flush: Immediately flush after adding
        """
        async with self.buffer_lock:
            self.buffer.append(checkpoint)
            self.total_buffered += 1
            
            # Set first checkpoint time
            if self.first_checkpoint_time is None:
                self.first_checkpoint_time = datetime.utcnow()
            
            logger.debug(
                f"Buffered checkpoint: {checkpoint.checkpoint_type} "
                f"(buffer size: {len(self.buffer)}/{self.max_size})"
            )
            
            # Check if we should flush
            should_flush = (
                force_flush or
                len(self.buffer) >= self.max_size or
                self._is_buffer_too_old() or
                (self.auto_flush_critical and checkpoint.checkpoint_type in self.critical_types)
            )
            
            if should_flush:
                await self._flush()
    
    async def add_batch(
        self,
        execution_id: int,
        step_number: int,
        checkpoint_type: str,
        state: Dict[str, Any],
        **kwargs
    ) -> None:
        """
        Convenience method to create and buffer a checkpoint
        
        Args:
            execution_id: Execution ID
            step_number: Current step
            checkpoint_type: Type of checkpoint
            state: State snapshot
            **kwargs: Additional checkpoint parameters
        """
        checkpoint = ExecutionCheckpoint(
            execution_id=execution_id,
            step_number=step_number,
            checkpoint_type=checkpoint_type,
            state_snapshot=state,
            timestamp=datetime.utcnow(),
            node_id=kwargs.get('node_id'),
            time_since_last_step_ms=kwargs.get('time_since_last_ms'),
            user_interaction=kwargs.get('user_interaction', False),
            agent_reasoning=kwargs.get('agent_reasoning'),
            checkpoint_metadata=kwargs.get('metadata', {})
        )
        
        await self.add(checkpoint)
    
    def _is_buffer_too_old(self) -> bool:
        """Check if oldest checkpoint exceeds max age"""
        if not self.first_checkpoint_time:
            return False
        
        age = datetime.utcnow() - self.first_checkpoint_time
        return age > self.max_age
    
    async def _flush(self) -> int:
        """
        Flush buffered checkpoints to database
        
        Returns:
            Number of checkpoints flushed
        """
        if not self.buffer:
            return 0
        
        checkpoints_to_flush = self.buffer.copy()
        self.buffer.clear()
        self.first_checkpoint_time = None
        
        count = len(checkpoints_to_flush)
        
        try:
            # Use bulk insert for performance
            with get_db_context() as db:
                db.bulk_save_objects(checkpoints_to_flush)
                # Commit happens via context manager
            
            self.total_flushed += count
            self.flush_count += 1
            
            logger.info(
                f"✓ Flushed {count} checkpoints to DB "
                f"(total: {self.total_flushed}, flushes: {self.flush_count})"
            )
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to flush checkpoints: {e}")
            # Re-add to buffer for retry
            async with self.buffer_lock:
                self.buffer.extend(checkpoints_to_flush)
            raise
    
    async def flush(self) -> int:
        """
        Manually flush the buffer
        
        Returns:
            Number of checkpoints flushed
        """
        async with self.buffer_lock:
            return await self._flush()
    
    async def flush_for_execution(self, execution_id: int) -> int:
        """
        Flush only checkpoints for a specific execution
        
        Useful when an execution completes and you want to ensure
        all its checkpoints are persisted.
        
        Args:
            execution_id: Execution ID to flush
            
        Returns:
            Number of checkpoints flushed
        """
        async with self.buffer_lock:
            # Separate checkpoints for this execution
            to_flush = [cp for cp in self.buffer if cp.execution_id == execution_id]
            remaining = [cp for cp in self.buffer if cp.execution_id != execution_id]
            
            if not to_flush:
                return 0
            
            # Update buffer
            self.buffer = remaining
            
            # Reset timer if buffer now empty
            if not self.buffer:
                self.first_checkpoint_time = None
            
            # Flush execution checkpoints
            try:
                with get_db_context() as db:
                    db.bulk_save_objects(to_flush)
                
                count = len(to_flush)
                self.total_flushed += count
                self.flush_count += 1
                
                logger.info(f"✓ Flushed {count} checkpoints for execution {execution_id}")
                return count
                
            except Exception as e:
                logger.error(f"Failed to flush execution checkpoints: {e}")
                # Re-add to buffer
                self.buffer.extend(to_flush)
                raise
    
    def get_buffer_size(self) -> int:
        """Get current buffer size"""
        return len(self.buffer)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get buffer performance metrics"""
        return {
            'buffer_size': len(self.buffer),
            'max_size': self.max_size,
            'total_buffered': self.total_buffered,
            'total_flushed': self.total_flushed,
            'flush_count': self.flush_count,
            'avg_batch_size': self.total_flushed / self.flush_count if self.flush_count > 0 else 0,
            'buffer_age_seconds': (
                (datetime.utcnow() - self.first_checkpoint_time).total_seconds()
                if self.first_checkpoint_time else 0
            )
        }
    
    async def shutdown(self) -> None:
        """Flush remaining checkpoints on shutdown"""
        logger.info("Shutting down CheckpointBuffer, flushing remaining checkpoints")
        await self.flush()


# Global buffer instance
checkpoint_buffer = CheckpointBuffer(
    max_size=10,
    max_age_seconds=5.0,
    auto_flush_critical=True
)