# backend/tests/test_circuit_breakers.py
"""
Test Circuit Breakers

Run from backend directory:
    python -m pytest tests/test_circuit_breakers.py -v
    
Or run directly:
    python tests/test_circuit_breakers.py
"""
import pytest
from app.orchestrator.llm.circuit_breaker_enhanced import (
    circuit_breaker_manager,
    ToolType
)


def test_breaker_initialization():
    """Test that all circuit breakers are initialized"""
    metrics = circuit_breaker_manager.get_metrics()
    
    assert len(metrics['breakers']) == 5  # 5 tool types
    assert metrics['summary']['breakers_closed'] == 5  # All closed initially
    
    print("✓ Circuit breakers initialized correctly")
    print(f"  Total breakers: {len(metrics['breakers'])}")
    print(f"  Closed: {metrics['summary']['breakers_closed']}")
    print(f"  Open: {metrics['summary']['breakers_open']}")


def test_tool_type_mapping():
    """Test tool → type mapping"""
    breaker = circuit_breaker_manager.get_breaker('decision_maker')
    assert breaker.failure_threshold == 3  # Decision tools
    
    breaker = circuit_breaker_manager.get_breaker('review_sentiment_analysis')
    assert breaker.failure_threshold == 5  # Analysis tools
    
    breaker = circuit_breaker_manager.get_breaker('generate_insights')
    assert breaker.failure_threshold == 2  # Generation tools
    
    print("✓ Tool type mapping correct")
    print("  decision_maker → threshold=3")
    print("  review_sentiment_analysis → threshold=5")
    print("  generate_insights → threshold=2")


def test_metrics_structure():
    """Test metrics structure"""
    metrics = circuit_breaker_manager.get_metrics()
    
    assert 'breakers' in metrics
    assert 'summary' in metrics
    assert 'total_calls' in metrics['summary']
    assert 'total_failures' in metrics['summary']
    
    print("✓ Metrics structure correct")


def test_get_state():
    """Test getting breaker state"""
    state = circuit_breaker_manager.get_state('decision_maker')
    
    assert 'tool_name' in state
    assert 'tool_type' in state
    assert 'state' in state
    assert state['state'] == 'closed'  # Should be closed initially
    
    print("✓ Get state working")
    print(f"  Tool: {state['tool_name']}")
    print(f"  Type: {state['tool_type']}")
    print(f"  State: {state['state']}")


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Circuit Breakers")
    print("=" * 60)
    
    test_breaker_initialization()
    print()
    
    test_tool_type_mapping()
    print()
    
    test_metrics_structure()
    print()
    
    test_get_state()
    
    print("\n" + "=" * 60)
    print("✅ All circuit breaker tests passed!")
    print("=" * 60)
