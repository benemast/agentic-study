# backend/tests/test_circuit_breaker.py
import pytest
import asyncio
from app.orchestrator.llm.circuit_breaker import CircuitBreaker, CircuitBreakerOpen

@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_threshold():
    """Test circuit breaker opens after failure threshold"""
    breaker = CircuitBreaker(failure_threshold=3, timeout=60)
    
    async def failing_function():
        raise Exception("Simulated failure")
    
    # Cause failures
    for i in range(3):
        with pytest.raises(Exception):
            await breaker.call(failing_function)
    
    # Circuit should now be open
    assert breaker.state.value == 'open'
    
    # Next call should fail fast
    with pytest.raises(CircuitBreakerOpen):
        await breaker.call(failing_function)

@pytest.mark.asyncio
async def test_circuit_breaker_recovers():
    """Test circuit breaker can recover"""
    breaker = CircuitBreaker(
        failure_threshold=3,
        timeout=1,  # Short timeout for testing
        success_threshold=2
    )
    
    async def successful_function():
        return "success"
    
    # Open circuit manually
    await breaker.force_open()
    
    # Wait for timeout
    await asyncio.sleep(1.5)
    
    # Should allow test calls (half-open)
    result1 = await breaker.call(successful_function)
    result2 = await breaker.call(successful_function)
    
    # Should be closed now
    assert breaker.state.value == 'closed'