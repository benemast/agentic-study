import pytest
from app.orchestrator.llm.langsmith_integration import (
    initialize_langsmith,
    create_langsmith_config,
    check_langsmith_status,
    generate_trace_name
)

def test_langsmith_status():
    """Test LangSmith configuration status"""
    status = check_langsmith_status()
    
    print("LangSmith Status:")
    for key, value in status.items():
        print(f"  {key}: {value}")
    
    # Note: May be disabled if API key not set
    assert 'enabled' in status

def test_trace_name_generation():
    """Test trace name generation"""
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

def test_config_creation():
    """Test LangSmith config creation"""
    config = create_langsmith_config(
        execution_id=999,
        session_id='test_session',
        condition='ai_assistant',
        task_data={'category': 'shoes'}
    )
    
    assert 'callbacks' in config
    assert 'metadata' in config
    assert config['metadata']['execution_id'] == 999
    
    print("✓ Config created successfully")

if __name__ == "__main__":
    test_langsmith_status()
    test_trace_name_generation()
    test_config_creation()
    print("\n✅ LangSmith tests passed!")