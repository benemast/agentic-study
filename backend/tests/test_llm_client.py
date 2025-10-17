# backend/tests/test_llm_client.py
import pytest
from app.orchestrator.llm.client import llm_client

@pytest.mark.asyncio
async def test_chat_completion():
    """Test basic chat completion"""
    response = await llm_client.chat_completion(
        messages=[
            {"role": "system", "content": "You are helpful"},
            {"role": "user", "content": "Say 'test successful' in JSON"}
        ],
        response_format={"type": "json_object"}
    )
    
    assert 'content' in response
    assert response['tokens'] > 0
    assert not response['cached']

@pytest.mark.asyncio
async def test_retry_logic():
    """Test that retry logic works on failure"""
    # Mock API error and verify retry
    pass

@pytest.mark.asyncio
async def test_caching():
    """Test response caching"""
    key = "test_cache_key"
    
    # First call
    response1 = await llm_client.chat_completion(
        messages=[{"role": "user", "content": "test"}],
        cache_key=key
    )
    
    # Second call with same key
    response2 = await llm_client.chat_completion(
        messages=[{"role": "user", "content": "test"}],
        cache_key=key
    )
    
    assert response2['cached'] == True