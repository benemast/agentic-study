# backend/tests/test_llm_isolated.py
"""
Isolated LLM Module Tests

These tests import ONLY the LLM modules, not the full app.
This avoids issues with WebSocket initialization and other async startup.

Run: pytest tests/test_llm_isolated.py -v
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch


# ============================================================
# CIRCUIT BREAKER TESTS (Isolated)
# ============================================================

def test_circuit_breaker_tool_types():
    """Test circuit breaker tool type definitions"""
    # Import only what we need
    import sys
    sys.modules.pop('app.orchestrator.llm.circuit_breaker_enhanced', None)
    
    from app.orchestrator.llm.circuit_breaker_enhanced import ToolType
    
    # Verify all tool types exist
    assert ToolType.DECISION == "decision"
    assert ToolType.DATA_OPERATION == "data"
    assert ToolType.ANALYSIS == "analysis"
    assert ToolType.GENERATION == "generation"
    assert ToolType.OUTPUT == "output"
    
    print("✓ Tool types defined correctly")


def test_circuit_breaker_config():
    """Test circuit breaker configurations"""
    from app.orchestrator.llm.circuit_breaker_enhanced import BREAKER_CONFIGS
    
    # Verify all tool types have configs
    assert 'decision' in BREAKER_CONFIGS
    assert 'data' in BREAKER_CONFIGS
    assert 'analysis' in BREAKER_CONFIGS
    assert 'generation' in BREAKER_CONFIGS
    assert 'output' in BREAKER_CONFIGS
    
    # Verify decision config (most strict)
    decision_config = BREAKER_CONFIGS['decision']
    assert decision_config['failure_threshold'] == 3
    assert decision_config['timeout'] == 60
    
    # Verify generation config (expensive ops)
    gen_config = BREAKER_CONFIGS['generation']
    assert gen_config['failure_threshold'] == 2
    
    print("✓ Circuit breaker configs correct")


# ============================================================
# STREAMING CALLBACK TESTS (Isolated)
# ============================================================

def test_stream_config():
    """Test streaming configuration"""
    from app.orchestrator.llm.streaming_callbacks import get_stream_config
    
    # Decision maker should be fine-grained
    config = get_stream_config('decision_maker')
    assert config['stream_level'] == 'fine_grained'
    assert config['throttle'] == 10
    
    # Sentiment analysis should be batch
    config = get_stream_config('review_sentiment_analysis')
    assert config['stream_level'] == 'batch'
    
    # Generate insights should be fine-grained
    config = get_stream_config('generate_insights')
    assert config['stream_level'] == 'fine_grained'
    
    print("✓ Stream configs correct")


@pytest.mark.asyncio
async def test_callback_creation_isolated():
    """Test callback creation without full app"""
    from app.orchestrator.llm.streaming_callbacks import (
        CallbackFactory,
        WebSocketStreamingCallback
    )
    
    # Mock WebSocket manager
    ws_manager = Mock()
    ws_manager.send_to_session = AsyncMock()
    
    # Create factory
    factory = CallbackFactory(ws_manager)
    
    # Create callback
    callback = factory.create_callback(
        session_id='test_session',
        execution_id=123,
        tool_name='decision_maker',
        step_number=1
    )
    
    assert callback.session_id == 'test_session'
    assert callback.execution_id == 123
    assert callback.tool_name == 'decision_maker'
    assert callback.stream_level == 'fine_grained'
    
    print("✓ Callback creation works")


# ============================================================
# TOOL SCHEMAS TESTS (Isolated)
# ============================================================

def test_action_type_enum():
    """Test ActionType enum"""
    from backend.app.orchestrator.tools.output_schemas.tool_output_schemas import ActionType
    
    # Verify all action types
    assert ActionType.LOAD.value == "load"
    assert ActionType.FILTER.value == "filter"
    assert ActionType.ANALYZE.value == "analyze"
    assert ActionType.GENERATE.value == "generate"
    assert ActionType.OUTPUT.value == "output"
    assert ActionType.FINISH.value == "finish"
    
    print("✓ ActionType enum correct")


def test_agent_decision_schema():
    """Test AgentDecisionOutput schema"""
    from backend.app.orchestrator.tools.output_schemas.tool_output_schemas import AgentDecisionOutput
    
    # Create valid decision
    decision = AgentDecisionOutput(
        action="load",
        tool_name="load_reviews",
        reasoning="Need to load data first",
        confidence=0.95,
        tool_params={'limit': 1000},
        alternatives_considered=["filter_reviews"]
    )
    
    assert decision.action == "load"
    assert decision.tool_name == "load_reviews"
    assert decision.confidence == 0.95
    assert len(decision.alternatives_considered) == 1
    
    print("✓ AgentDecisionOutput schema works")


# ============================================================
# LANGSMITH INTEGRATION TESTS (Isolated)
# ============================================================

def test_trace_name_generation():
    """Test trace name generation"""
    from app.orchestrator.llm.langsmith_integration import generate_trace_name
    
    # Basic trace
    name = generate_trace_name(execution_id=456)
    assert name == "execution-456"
    
    # With step
    name = generate_trace_name(execution_id=456, step_number=3)
    assert name == "execution-456-step-3"
    
    # With tool
    name = generate_trace_name(
        execution_id=456,
        step_number=3,
        tool_name='sentiment_analysis'
    )
    assert name == "execution-456-step-3-sentiment_analysis"
    
    print("✓ Trace naming correct")


def test_langsmith_config_structure():
    """Test LangSmith config structure"""
    from app.orchestrator.llm.langsmith_integration import build_trace_metadata
    
    metadata = build_trace_metadata(
        execution_id=456,
        session_id='sess_123',
        condition='ai_assistant',
        task_data={'category': 'shoes'},
        step_number=3,
        tool_name='sentiment_analysis'
    )
    
    assert metadata['execution_id'] == 456
    assert metadata['session_id'] == 'sess_123'
    assert metadata['condition'] == 'ai_assistant'
    assert metadata['step_number'] == 3
    assert metadata['tool_name'] == 'sentiment_analysis'
    assert 'started_at' in metadata
    
    print("✓ Metadata structure correct")


# ============================================================
# RUN STANDALONE
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Running Isolated LLM Tests")
    print("=" * 60)
    print()
    
    # Circuit breaker tests
    test_circuit_breaker_tool_types()
    test_circuit_breaker_config()
    print()
    
    # Streaming tests
    test_stream_config()
    asyncio.run(test_callback_creation_isolated())
    print()
    
    # Schema tests
    test_action_type_enum()
    test_agent_decision_schema()
    print()
    
    # LangSmith tests
    test_trace_name_generation()
    test_langsmith_config_structure()
    
    print()
    print("=" * 60)
    print("✅ All isolated tests passed!")
    print("=" * 60)