# backend/tests/test_ai_assistant_integration.py
import pytest
from app.orchestrator.service import orchestrator
from app.database import SessionLocal

@pytest.mark.asyncio
async def test_ai_assistant_execution():
    """Test full AI assistant execution"""
    db = SessionLocal()
    
    try:
        # Create test session
        session_id = "test_session_ai"
        
        # Execute task
        execution = await orchestrator.execute_workflow(
            db=db,
            session_id=session_id,
            condition='ai_assistant',
            task_data={
                'task_description': 'Analyze sample data and provide insights',
                'input_data': {}
            }
        )
        
        # Verify execution
        assert execution.status in ['completed', 'running']
        assert execution.condition == 'ai_assistant'
        
        # Check decision checkpoints
        checkpoints = orchestrator.state_manager.get_checkpoint_history(
            db, execution.id
        )
        
        # Should have at least one agent_decision checkpoint
        decision_checkpoints = [
            cp for cp in checkpoints 
            if cp.checkpoint_type == 'agent_decision'
        ]
        assert len(decision_checkpoints) > 0
        
        # Verify agent reasoning is stored
        assert decision_checkpoints[0].agent_reasoning is not None
        
    finally:
        db.close()