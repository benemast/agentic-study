# backend/tests/test_callbacks.py
"""
Test Streaming Callbacks

Run from backend directory:
    python -m pytest tests/test_callbacks.py -v
    
Or run directly:
    python tests/test_callbacks.py
"""
import pytest
import asyncio
from app.orchestrator.llm.streaming_callbacks import (
    initialize_callback_factory,
    get_callback_factory,
    WebSocketStreamingCallback,
    get_stream_config
)


@pytest.mark.asyncio
async def test_callback_creation(mock_websocket_manager):
    """Test callback factory"""
    # Initialize with mock
    ws_manager = mock_websocket_manager
    initialize_callback_factory(ws_manager)
    
    # Get factory
    factory = get_callback_factory()
    
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
    assert callback.stream_level == 'fine_grained'  # From config
    
    print("✓ Callback created successfully")
    print(f"  Session: {callback.session_id}")
    print(f"  Execution: {callback.execution_id}")
    print(f"  Tool: {callback.tool_name}")
    print(f"  Stream level: {callback.stream_level}")


@pytest.mark.asyncio
async def test_callback_token_streaming(mock_websocket_manager):
    """Test token streaming"""
    ws_manager = mock_websocket_manager
    initialize_callback_factory(ws_manager)
    factory = get_callback_factory()
    
    callback = factory.create_callback(
        session_id='test_session',
        execution_id=123,
        tool_name='decision_maker'
    )
    
    # Simulate token streaming
    await callback.on_llm_start({}, ["test prompt"])
    await callback.on_llm_new_token("Hello")
    await callback.on_llm_new_token(" world")
    await callback.on_llm_end(None)
    
    # Check messages were sent
    assert len(ws_manager.messages_sent) >= 2  # start + end
    assert callback.token_count == 2
    
    print("✓ Token streaming working")
    print(f"  Tokens received: {callback.token_count}")
    print(f"  Messages sent: {len(ws_manager.messages_sent)}")


def test_stream_config():
    """Test stream configuration"""
    # Decision maker config
    config = get_stream_config('decision_maker')
    assert config['stream_level'] == 'fine_grained'
    assert config['throttle'] == 10
    
    # Analysis config
    config = get_stream_config('review_sentiment_analysis')
    assert config['stream_level'] == 'batch'
    
    print("✓ Stream config correct")
    print("  decision_maker: fine_grained (throttle=10)")
    print("  sentiment_analysis: batch")


def test_factory_metrics(mock_websocket_manager):
    """Test factory metrics"""
    ws_manager = mock_websocket_manager
    initialize_callback_factory(ws_manager)
    factory = get_callback_factory()
    
    # Create some callbacks
    factory.create_callback('sess1', 1, 'tool1')
    factory.create_callback('sess2', 2, 'tool2')
    
    metrics = factory.get_metrics()
    assert 'active_callbacks' in metrics
    assert metrics['active_callbacks'] >= 2
    
    print("✓ Factory metrics working")
    print(f"  Active callbacks: {metrics['active_callbacks']}")


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Streaming Callbacks")
    print("=" * 60)
    
    # Run async tests
    asyncio.run(test_callback_creation())
    print()
    
    asyncio.run(test_callback_token_streaming())
    print()
    
    # Run sync tests
    test_stream_config()
    print()
    
    test_factory_metrics()
    
    print("\n" + "=" * 60)
    print("✅ All callback tests passed!")
    print("=" * 60)
