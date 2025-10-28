# backend/app/orchestrator/llm/circuit_breaker.py
"""
Circuit Breaker Pattern for LLM API Calls

Prevents cascading failures and protects OpenAI API from abuse during outages.

States:
- CLOSED: Normal operation, requests pass through
- OPEN: Failure threshold exceeded, requests fail fast
- HALF_OPEN: Testing if service recovered, limited requests allowed

Usage:
    circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=60)
    result = await circuit_breaker.call(llm_function, *args, **kwargs)
"""
import asyncio
import time
import logging
from typing import Callable, Any, Optional
from enum import Enum
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, rejecting requests
    HALF_OPEN = "half_open"  # Testing recovery


class CircuitBreakerOpen(Exception):
    """Exception raised when circuit breaker is open"""
    def __init__(self, message: str = "Circuit breaker is OPEN - service unavailable"):
        self.message = message
        super().__init__(self.message)


class CircuitBreaker:
    """
    Circuit Breaker for LLM API calls
    
    Features:
    - Automatic state transitions
    - Configurable failure threshold
    - Recovery testing
    - Metrics tracking
    - Thread-safe operation
    
    Example:
        breaker = CircuitBreaker(
            failure_threshold=5,    # Open after 5 failures
            timeout=60,             # Test recovery after 60s
            half_open_max_calls=3   # Allow 3 test calls
        )
        
        try:
            result = await breaker.call(llm_client.chat_completion, messages)
        except CircuitBreakerOpen:
            # Use fallback logic
            result = fallback_decision()
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: int = 60,
        half_open_max_calls: int = 3,
        success_threshold: int = 2
    ):
        """
        Initialize circuit breaker
        
        Args:
            failure_threshold: Number of failures before opening circuit
            timeout: Seconds to wait before testing recovery (OPEN → HALF_OPEN)
            half_open_max_calls: Max calls to allow in HALF_OPEN state
            success_threshold: Successful calls needed to close circuit from HALF_OPEN
        """
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.half_open_max_calls = half_open_max_calls
        self.success_threshold = success_threshold
        
        # State
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.last_state_change: Optional[float] = None
        
        # Metrics
        self.total_calls = 0
        self.total_failures = 0
        self.total_successes = 0
        self.times_opened = 0
        self.half_open_calls = 0
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
        
        logger.info(
            f"Circuit breaker initialized: "
            f"failure_threshold={failure_threshold}, "
            f"timeout={timeout}s"
        )
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection
        
        Args:
            func: Async function to call
            *args, **kwargs: Arguments for function
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerOpen: If circuit is open
            Exception: Original exception from function
        """
        async with self._lock:
            self.total_calls += 1
            
            # Check if we should transition states
            await self._check_state_transition()
            
            # If circuit is open, fail fast
            if self.state == CircuitState.OPEN:
                logger.warning(
                    f"Circuit breaker OPEN - rejecting call "
                    f"(failures={self.failure_count}/{self.failure_threshold})"
                )
                raise CircuitBreakerOpen(
                    f"Circuit breaker is OPEN after {self.failure_count} failures. "
                    f"Will retry in {self._time_until_half_open():.0f}s"
                )
            
            # If half-open, limit concurrent calls
            if self.state == CircuitState.HALF_OPEN:
                if self.half_open_calls >= self.half_open_max_calls:
                    logger.warning(
                        f"Circuit breaker HALF_OPEN - max test calls reached "
                        f"({self.half_open_calls}/{self.half_open_max_calls})"
                    )
                    raise CircuitBreakerOpen(
                        "Circuit breaker is testing recovery - please wait"
                    )
                self.half_open_calls += 1
        
        # Execute function (release lock during execution)
        try:
            start_time = time.time()
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Success!
            await self._record_success(execution_time)
            return result
            
        except Exception as e:
            # Failure
            await self._record_failure(e)
            raise
    
    async def _check_state_transition(self):
        """Check if circuit breaker should transition states"""
        if self.state == CircuitState.OPEN:
            # Check if timeout expired → HALF_OPEN
            if self._should_attempt_reset():
                await self._transition_to_half_open()
        
        elif self.state == CircuitState.HALF_OPEN:
            # Check if enough successes → CLOSED
            if self.success_count >= self.success_threshold:
                await self._transition_to_closed()
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time passed to attempt recovery"""
        if self.last_failure_time is None:
            return False
        
        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure >= self.timeout
    
    def _time_until_half_open(self) -> float:
        """Calculate seconds until HALF_OPEN state"""
        if self.last_failure_time is None:
            return 0
        
        time_since_failure = time.time() - self.last_failure_time
        return max(0, self.timeout - time_since_failure)
    
    async def _record_success(self, execution_time: float):
        """Record successful call"""
        async with self._lock:
            self.total_successes += 1
            
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                logger.info(
                    f"Circuit breaker HALF_OPEN - success {self.success_count}/{self.success_threshold} "
                    f"({execution_time:.2f}s)"
                )
                
                # Check if we can close circuit
                if self.success_count >= self.success_threshold:
                    await self._transition_to_closed()
            
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on success
                if self.failure_count > 0:
                    logger.debug(
                        f"Circuit breaker CLOSED - resetting failure count "
                        f"(was {self.failure_count})"
                    )
                    self.failure_count = 0
    
    async def _record_failure(self, exception: Exception):
        """Record failed call"""
        async with self._lock:
            self.total_failures += 1
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            logger.warning(
                f"Circuit breaker failure {self.failure_count}/{self.failure_threshold}: "
                f"{exception.__class__.__name__}: {str(exception)[:100]}"
            )
            
            if self.state == CircuitState.HALF_OPEN:
                # Failed during recovery test → back to OPEN
                logger.error("Circuit breaker HALF_OPEN → OPEN (recovery failed)")
                await self._transition_to_open()
            
            elif self.state == CircuitState.CLOSED:
                # Check if threshold exceeded
                if self.failure_count >= self.failure_threshold:
                    await self._transition_to_open()
    
    async def _transition_to_open(self):
        """Transition to OPEN state"""
        self.state = CircuitState.OPEN
        self.last_state_change = time.time()
        self.times_opened += 1
        self.half_open_calls = 0
        self.success_count = 0
        
        logger.error(
            f"🔴 Circuit breaker OPENED (failures={self.failure_count}/{self.failure_threshold}). "
            f"Will test recovery in {self.timeout}s"
        )
    
    async def _transition_to_half_open(self):
        """Transition to HALF_OPEN state"""
        self.state = CircuitState.HALF_OPEN
        self.last_state_change = time.time()
        self.half_open_calls = 0
        self.success_count = 0
        
        logger.info(
            f"🟡 Circuit breaker HALF_OPEN - testing recovery "
            f"(will allow {self.half_open_max_calls} test calls)"
        )
    
    async def _transition_to_closed(self):
        """Transition to CLOSED state"""
        self.state = CircuitState.CLOSED
        self.last_state_change = time.time()
        self.failure_count = 0
        self.success_count = 0
        self.half_open_calls = 0
        
        logger.info(
            f"🟢 Circuit breaker CLOSED - service recovered "
            f"(total failures: {self.total_failures})"
        )
    
    async def force_open(self):
        """Manually open circuit breaker"""
        async with self._lock:
            logger.warning("Circuit breaker manually opened")
            await self._transition_to_open()
    
    async def force_close(self):
        """Manually close circuit breaker (use with caution!)"""
        async with self._lock:
            logger.warning("Circuit breaker manually closed")
            self.failure_count = 0
            await self._transition_to_closed()
    
    def get_state(self) -> dict:
        """Get current circuit breaker state"""
        return {
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'total_calls': self.total_calls,
            'total_failures': self.total_failures,
            'total_successes': self.total_successes,
            'times_opened': self.times_opened,
            'time_until_half_open': self._time_until_half_open() if self.state == CircuitState.OPEN else None,
            'last_state_change': datetime.fromtimestamp(self.last_state_change).isoformat() if self.last_state_change else None
        }
    
    def __repr__(self) -> str:
        return (
            f"CircuitBreaker(state={self.state.value}, "
            f"failures={self.failure_count}/{self.failure_threshold}, "
            f"successes={self.success_count}/{self.success_threshold})"
        )