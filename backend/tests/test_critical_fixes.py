# backend/tests/integration/test_critical_fixes.py
"""
Integration tests for critical fixes:
1. DB session management
2. Execution race conditions
3. Transaction boundaries
"""
import pytest
import asyncio
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import SessionLocal, get_db_context
from app.models.execution import WorkflowExecution, ExecutionCheckpoint
from app.models.session import Session as SessionModel
from app.orchestrator.service import orchestrator
from app.orchestrator.state_manager import HybridStateManager


@pytest.fixture
def test_session():
    """Create test session"""
    db = SessionLocal()
    try:
        # Create test session
        session = SessionModel(
            session_id="test_session_critical",
            condition="workflow_builder",
            user_id="test_user"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        yield session
        
        # Cleanup
        db.query(ExecutionCheckpoint).delete()
        db.query(WorkflowExecution).delete()
        db.query(SessionModel).filter(
            SessionModel.session_id == "test_session_critical"
        ).delete()
        db.commit()
    finally:
        db.close()


# ==================== FIX #1: DB SESSION MANAGEMENT ====================

@pytest.mark.asyncio
async def test_db_context_manager_success(test_session):
    """Test context manager commits on success"""
    execution_id = None
    
    try:
        # Use context manager
        with get_db_context() as db:
            execution = WorkflowExecution(
                session_id=test_session.session_id,
                condition="workflow_builder",
                status="pending"
            )
            db.add(execution)
            # No explicit commit needed
        
        execution_id = execution.id
        
        # Verify it was committed
        with get_db_context() as db:
            saved = db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).first()
            
            assert saved is not None
            assert saved.status == "pending"
    
    finally:
        # Cleanup
        if execution_id:
            with get_db_context() as db:
                db.query(WorkflowExecution).filter(
                    WorkflowExecution.id == execution_id
                ).delete()


@pytest.mark.asyncio
async def test_db_context_manager_rollback(test_session):
    """Test context manager rolls back on error"""
    execution_id = None
    
    try:
        with get_db_context() as db:
            execution = WorkflowExecution(
                session_id=test_session.session_id,
                condition="workflow_builder",
                status="pending"
            )
            db.add(execution)
            db.flush()  # Get ID but don't commit yet
            execution_id = execution.id
            
            # Force an error
            raise ValueError("Simulated error")
    
    except ValueError:
        pass  # Expected
    
    # Verify it was rolled back
    with get_db_context() as db:
        saved = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        
        # Should NOT exist due to rollback
        assert saved is None


@pytest.mark.asyncio
async def test_checkpoint_uses_context_manager(test_session):
    """Test checkpoints use context manager correctly"""
    state_manager = HybridStateManager()
    
    # Create execution
    with get_db_context() as db:
        execution = WorkflowExecution(
            session_id=test_session.session_id,
            condition="workflow_builder",
            status="running"
        )
        db.add(execution)
    
    execution_id = execution.id
    
    try:
        # Use atomic checkpoint
        with state_manager.atomic_checkpoint(
            execution_id=execution_id,
            step_number=1,
            checkpoint_type='test_checkpoint',
            state={'test': 'data'}
        ) as checkpoint:
            # Checkpoint is prepared but not committed yet
            assert checkpoint.execution_id == execution_id
        
        # After context exit, should be committed
        with get_db_context() as db:
            saved = db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).first()
            
            assert saved is not None
            assert saved.checkpoint_type == 'test_checkpoint'
            assert saved.state_snapshot == {'test': 'data'}
    
    finally:
        with get_db_context() as db:
            db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).delete()
            db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).delete()


# ==================== FIX #2: RACE CONDITION ====================

@pytest.mark.asyncio
async def test_no_duplicate_executions(test_session):
    """Test that execution is created only once"""
    
    # Prepare workflow
    workflow = {
        'nodes': [
            {
                'id': 'node1',
                'type': 'tool',
                'data': {'template_id': 'gather_data', 'label': 'Gather'}
            }
        ],
        'edges': [
            {'source': 'START', 'target': 'node1'},
            {'source': 'node1', 'target': 'END'}
        ]
    }
    
    task_data = {
        'workflow': workflow,
        'input_data': {},
        'metadata': {}
    }
    
    # Create execution record ONCE
    with get_db_context() as db:
        execution = WorkflowExecution(
            session_id=test_session.session_id,
            condition='workflow_builder',
            status='pending',
            workflow_definition=workflow
        )
        db.add(execution)
    
    execution_id = execution.id
    
    try:
        # Execute using existing ID (should not create new record)
        with get_db_context() as db:
            result = await orchestrator.execute_workflow_with_id(
                db=db,
                execution_id=execution_id,
                session_id=test_session.session_id,
                condition='workflow_builder',
                task_data=task_data
            )
        
        # Verify only ONE execution exists
        with get_db_context() as db:
            count = db.query(WorkflowExecution).filter(
                WorkflowExecution.session_id == test_session.session_id
            ).count()
            
            assert count == 1, f"Expected 1 execution, found {count}"
            assert result.id == execution_id
    
    finally:
        with get_db_context() as db:
            db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).delete()
            db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).delete()


# ==================== FIX #3: TRANSACTION BOUNDARIES ====================

@pytest.mark.asyncio
async def test_atomic_checkpoint_with_state(test_session):
    """Test checkpoint and state update are atomic"""
    state_manager = HybridStateManager()
    
    # Create execution
    with get_db_context() as db:
        execution = WorkflowExecution(
            session_id=test_session.session_id,
            condition="ai_assistant",
            status="running"
        )
        db.add(execution)
    
    execution_id = execution.id
    
    try:
        # Test atomic operation
        state = {
            'execution_id': execution_id,
            'step_number': 1,
            'working_data': {'key': 'value'}
        }
        
        with get_db_context() as db:
            checkpoint = state_manager.checkpoint_with_redis_update(
                db=db,
                execution_id=execution_id,
                step_number=1,
                checkpoint_type='test_atomic',
                state=state
            )
        
        # Verify both DB and Redis were updated
        with get_db_context() as db:
            db_checkpoint = db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).first()
            
            assert db_checkpoint is not None
            assert db_checkpoint.state_snapshot == state
        
        redis_state = state_manager.get_state_from_memory(execution_id)
        assert redis_state == state
    
    finally:
        state_manager.clear_memory_state(execution_id)
        with get_db_context() as db:
            db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).delete()
            db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).delete()


@pytest.mark.asyncio
async def test_transaction_rollback_on_error(test_session):
    """Test that failed transactions roll back completely"""
    state_manager = HybridStateManager()
    
    # Create execution
    with get_db_context() as db:
        execution = WorkflowExecution(
            session_id=test_session.session_id,
            condition="workflow_builder",
            status="running"
        )
        db.add(execution)
    
    execution_id = execution.id
    
    try:
        # Try to create checkpoint with error
        with pytest.raises(ValueError):
            with get_db_context() as db:
                state_manager.checkpoint_to_db(
                    db=db,
                    execution_id=execution_id,
                    step_number=1,
                    checkpoint_type='test_rollback',
                    state={'data': 'value'}
                )
                
                # Force an error before commit
                raise ValueError("Simulated error")
        
        # Verify checkpoint was NOT saved
        with get_db_context() as db:
            checkpoint = db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).first()
            
            assert checkpoint is None, "Checkpoint should not exist after rollback"
    
    finally:
        with get_db_context() as db:
            db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).delete()


# ==================== CONCURRENCY TESTS ====================

@pytest.mark.asyncio
async def test_concurrent_checkpoints(test_session):
    """Test multiple concurrent checkpoint operations"""
    state_manager = HybridStateManager()
    
    # Create execution
    with get_db_context() as db:
        execution = WorkflowExecution(
            session_id=test_session.session_id,
            condition="workflow_builder",
            status="running"
        )
        db.add(execution)
    
    execution_id = execution.id
    
    try:
        # Create multiple checkpoints concurrently
        async def create_checkpoint(step: int):
            with get_db_context() as db:
                return state_manager.checkpoint_to_db(
                    db=db,
                    execution_id=execution_id,
                    step_number=step,
                    checkpoint_type=f'concurrent_test_{step}',
                    state={'step': step}
                )
        
        # Run 5 concurrent checkpoint operations
        tasks = [create_checkpoint(i) for i in range(5)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all succeeded
        assert all(not isinstance(r, Exception) for r in results)
        
        # Verify all checkpoints were saved
        with get_db_context() as db:
            checkpoints = db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).all()
            
            assert len(checkpoints) == 5
    
    finally:
        with get_db_context() as db:
            db.query(ExecutionCheckpoint).filter(
                ExecutionCheckpoint.execution_id == execution_id
            ).delete()
            db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).delete()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])