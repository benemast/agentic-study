# backend/tests/test_llm_client.py
"""
Test LLM Client

Run from backend directory:
    python -m pytest tests/test_llm_client.py -v
    
Or run directly:
    python tests/test_llm_client.py
"""
import pytest
import asyncio
from app.orchestrator.llm.client_langchain import get_llm_client


@pytest.mark.asyncio
async def test_client_initialization():
    """Test LLM client initialization"""
    client = get_llm_client()
    
    assert client.model is not None
    assert len(client._proxies) == 0  # No proxies created yet
    
    print(f"✓ Client initialized with model: {client.model}")


@pytest.mark.asyncio  
async def test_proxy_creation():
    """Test circuit breaker proxy creation"""
    client = get_llm_client()
    
    # Get proxy for decision_maker
    proxy = client._get_proxy(
        tool_name='decision_maker',
        temperature=0.3,
        max_tokens=500,
        streaming=True
    )
    
    assert proxy.tool_name == 'decision_maker'
    assert proxy.model == client.model
    assert proxy.streaming is True
    
    print("✓ Circuit breaker proxy created successfully")


def test_metrics():
    """Test metrics collection"""
    client = get_llm_client()
    metrics = client.get_metrics()
    
    assert 'total_requests' in metrics
    assert 'circuit_breaker_manager' in metrics
    
    print("✓ Metrics collection working")


if __name__ == "__main__":
    print("=" * 60)
    print("Testing LLM Client")
    print("=" * 60)
    
    # Run async tests
    asyncio.run(test_client_initialization())
    asyncio.run(test_proxy_creation())
    
    # Run sync tests
    test_metrics()
    
    print("\n" + "=" * 60)
    print("✅ All LLM client tests passed!")
    print("=" * 60)
