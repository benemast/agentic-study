import pytest
import asyncio
from app.orchestrator.llm.react_agent import ReactAgent
from app.orchestrator.tools.registry import tool_registry

class MockWebSocketManager:
    async def send_to_session(self, session_id, message):
        print(f"WS: {message['type']}")

@pytest.mark.asyncio
async def test_react_agent_initialization():
    """Test ReAct agent initialization"""
    ws_manager = MockWebSocketManager()
    
    agent = ReactAgent(
        tool_registry=tool_registry,
        ws_manager=ws_manager
    )
    
    assert agent.confidence_threshold == 0.6
    assert agent.max_iterations == 3
    print("✓ ReAct agent initialized")

@pytest.mark.asyncio
async def test_react_decision():
    """Test ReAct decision making"""
    ws_manager = MockWebSocketManager()
    agent = ReactAgent(tool_registry, ws_manager)
    
    # Mock state (no data loaded yet)
    state = {
        'session_id': 'test_session',
        'execution_id': 999,
        'step_number': 0,
        'working_data': {'records': []},
        'agent_memory': []
    }
    
    # Get decision
    decision = await agent.get_next_decision(
        task_description="Analyze customer reviews for headphones",
        state=state,
        memory=[]
    )
    
    # Should decide to load data first
    assert decision.action == 'load'
    assert decision.tool_name == 'load_reviews'
    assert decision.confidence > 0.0
    
    print(f"✓ Decision: {decision.action} → {decision.tool_name}")
    print(f"  Reasoning: {decision.reasoning[:100]}...")
    print(f"  Confidence: {decision.confidence}")

if __name__ == "__main__":
    asyncio.run(test_react_agent_initialization())
    asyncio.run(test_react_decision())
    print("\n✅ ReAct agent tests passed!")