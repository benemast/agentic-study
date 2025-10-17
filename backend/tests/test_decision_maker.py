# backend/tests/test_decision_maker.py
import pytest
from app.orchestrator.llm.decision_maker import decision_maker

@pytest.mark.asyncio
async def test_get_next_decision():
    """Test decision making"""
    state = {
        'working_data': {'records': []},
        'step_number': 0,
        'errors': []
    }
    
    decision = await decision_maker.get_next_decision(
        task_description="Analyze customer feedback",
        state=state,
        memory=[]
    )
    
    assert decision.action is not None
    assert decision.reasoning != ""
    assert 0.0 <= decision.confidence <= 1.0

@pytest.mark.asyncio
async def test_fallback_decision():
    """Test fallback strategy on LLM failure"""
    # Mock LLM failure
    state = {'working_data': {'records': []}}
    
    decision = decision_maker._get_safe_fallback_decision(
        state, "Test error"
    )
    
    assert decision.tool_name == ToolName.GATHER_DATA
    assert "Fallback" in decision.reasoning