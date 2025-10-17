# backend/tests/test_orchestrator_service.py
import pytest
from app.orchestrator.service import orchestrator

def test_orchestrator_uses_global_ws_manager():
    """Verify orchestrator uses global ws_manager"""
    from app.websocket.manager import ws_manager
    assert orchestrator.ws_manager is ws_manager

@pytest.mark.asyncio
async def test_workflow_execution_sends_progress():
    """Test that workflow execution sends WebSocket updates"""
    # Test execution start/complete events
    pass