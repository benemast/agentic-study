# backend/app/orchestrator/llm/client.py
"""
Robust LLM Client with circuit breaker, streaming support, and error handling
"""
from typing import Dict, Any, Optional, List, Callable, Awaitable
import asyncio
import logging
import json
from datetime import datetime
import time
from openai import AsyncOpenAI
from openai import APIError, RateLimitError, APITimeoutError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
from cachetools import TTLCache

from app.configs.config import settings
from .circuit_breaker import CircuitBreaker, CircuitBreakerOpen

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Robust LLM client with:
    - Circuit breaker for fault tolerance
    - Streaming for latency reduction
    - Real-time progress callbacks
    - Structured output validation
    - TTL-based caching
    - Token usage tracking
    - Timeout protection
    - Retry with exponential backoff
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.llm_model
        
        # Circuit breaker for fault tolerance
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,      # Open after 5 failures
            timeout=60,               # Test recovery after 60s
            half_open_max_calls=3,    # Allow 3 test calls
            success_threshold=2       # Need 2 successes to close
        )
        
        # Metrics
        self.total_requests = 0
        self.total_tokens = 0
        self.total_errors = 0
        self.total_streaming_requests = 0
        self.circuit_breaker_rejections = 0
        
        # Cache with TTL (1 hour) and size limit (100 entries)
        self.cache = TTLCache(maxsize=100, ttl=3600)
        
        logger.info(f"✅ LLM Client initialized with model: {self.model}")
        logger.info(f"✅ Streaming enabled: {settings.use_stream}")
        logger.info(f"✅ Circuit breaker enabled: {self.circuit_breaker}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((RateLimitError, APITimeoutError)),
        before_sleep=before_sleep_log(logger, logging.WARNING)
    )
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 500,
        response_format: Optional[Dict[str, str]] = None,
        cache_key: Optional[str] = None,
        timeout: float = 60.0
    ) -> Dict[str, Any]:
        """
        Make chat completion request with circuit breaker protection
        
        Args:
            messages: List of message dicts
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            response_format: Optional response format
            cache_key: Optional cache key
            timeout: Request timeout
            
        Returns:
            Response dict with 'content', 'tokens', 'model', 'cached'
            
        Raises:
            CircuitBreakerOpen: If circuit breaker is open
            APIError: OpenAI API errors
        """
        # Check cache first
        if cache_key and cache_key in self.cache:
            logger.info(f"Cache hit for key: {cache_key}")
            return {**self.cache[cache_key], 'cached': True}
        
        self.total_requests += 1
        
        # Execute with circuit breaker protection
        try:
            result = await self.circuit_breaker.call(
                self._do_chat_completion,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
                timeout=timeout
            )
            
            # Cache result
            if cache_key:
                self.cache[cache_key] = result
            
            return result
            
        except CircuitBreakerOpen as e:
            # Circuit breaker rejected call
            self.circuit_breaker_rejections += 1
            logger.error(f"Circuit breaker rejection: {e.message}")
            
            # Return error response instead of raising
            # This allows callers to implement fallback logic
            return {
                'content': None,
                'error': 'circuit_breaker_open',
                'error_message': e.message,
                'circuit_breaker_state': self.circuit_breaker.get_state(),
                'cached': False
            }
    
    async def _do_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict[str, str]],
        timeout: float
    ) -> Dict[str, Any]:
        """Internal method for actual API call"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Create completion with timeout
            completion = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format
                ),
                timeout=timeout
            )
            
            # Extract response
            content = completion.choices[0].message.content
            tokens = completion.usage.total_tokens if completion.usage else 0
            
            # Update metrics
            self.total_tokens += tokens
            elapsed = asyncio.get_event_loop().time() - start_time
            
            logger.info(
                f"✅ LLM completion: {tokens} tokens, {elapsed:.2f}s, "
                f"model={completion.model}"
            )
            
            return {
                'content': content,
                'tokens': tokens,
                'model': completion.model,
                'latency_ms': int(elapsed * 1000),
                'cached': False,
                'streamed': False
            }
            
        except asyncio.TimeoutError:
            logger.error(f"LLM request timeout after {timeout}s")
            self.total_errors += 1
            raise APITimeoutError(f"Request timed out after {timeout}s")
            
        except Exception as e:
            logger.error(f"LLM API error: {e}", exc_info=True)
            self.total_errors += 1
            raise
    
    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 500,
        on_chunk: Optional[Callable[[str], Awaitable[None]]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """
        STREAMING chat completion with circuit breaker protection
        
        Args:
            messages: Chat messages
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            on_chunk: Async callback for each content chunk
            timeout: Request timeout
            
        Returns:
            Dict with full content, tokens, model, metrics
            
        Raises:
            CircuitBreakerOpen: If circuit breaker is open
        """
        self.total_requests += 1
        self.total_streaming_requests += 1
        
        # Execute with circuit breaker protection
        try:
            result = await self.circuit_breaker.call(
                self._do_chat_completion_stream,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                on_chunk=on_chunk,
                timeout=timeout
            )
            
            return result
            
        except CircuitBreakerOpen as e:
            # Circuit breaker rejected call
            self.circuit_breaker_rejections += 1
            logger.error(f"Circuit breaker rejection (streaming): {e.message}")
            
            return {
                'content': None,
                'error': 'circuit_breaker_open',
                'error_message': e.message,
                'circuit_breaker_state': self.circuit_breaker.get_state(),
                'streamed': False
            }
    
    async def _do_chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        on_chunk: Optional[Callable[[str], Awaitable[None]]],
        timeout: float
    ) -> Dict[str, Any]:
        """Internal method for streaming API call"""
        start_time = time.time()
        full_content = ''
        chunk_count = 0
        first_chunk_time = None
        tokens_used = 0
        model_used = None
        finish_reason = None
        
        try:
            # Create streaming completion
            stream = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True
                ),
                timeout=5  # Quick timeout for stream setup
            )
            
            # Process stream
            async for chunk in stream:
                if not first_chunk_time:
                    first_chunk_time = time.time()
                
                # Extract content
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    content = delta.content
                    full_content += content
                    chunk_count += 1
                    
                    # Call progress callback
                    if on_chunk:
                        try:
                            await on_chunk(content)
                        except Exception as e:
                            logger.warning(f"Error in chunk callback: {e}")
                
                # Extract metadata
                if not model_used and hasattr(chunk, 'model'):
                    model_used = chunk.model
                
                if chunk.choices and chunk.choices[0].finish_reason:
                    finish_reason = chunk.choices[0].finish_reason
                
                # Extract token usage (if available)
                if hasattr(chunk, 'usage') and chunk.usage:
                    tokens_used = chunk.usage.total_tokens
            
            # Calculate metrics
            elapsed = time.time() - start_time
            ttfb_ms = int((first_chunk_time - start_time) * 1000) if first_chunk_time else 0
            
            # Update global metrics
            self.total_tokens += tokens_used
            
            logger.info(
                f"✅ Streaming LLM completed: {tokens_used} tokens, "
                f"{chunk_count} chunks, {elapsed:.2f}s, TTFB={ttfb_ms}ms"
            )
            
            return {
                'content': full_content,
                'tokens': tokens_used,
                'model': model_used or self.model,
                'finish_reason': finish_reason,
                'latency_ms': int(elapsed * 1000),
                'ttfb_ms': ttfb_ms,
                'streamed': True,
                'chunk_count': chunk_count,
                'cached': False
            }
            
        except asyncio.TimeoutError:
            logger.error(f"Streaming LLM request timed out after {timeout}s")
            self.total_errors += 1
            raise APITimeoutError(f"Streaming request timed out after {timeout}s")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            self.total_errors += 1
            raise
    
    async def get_structured_decision(
        self,
        prompt: str,
        system_prompt: str = "You are a helpful AI assistant.",
        expected_fields: List[str] = None,
        stream: bool = False,
        on_chunk: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> Dict[str, Any]:
        """
        Get structured JSON response with circuit breaker protection
        
        If circuit breaker is open, returns error dict instead of raising
        Callers should check for 'error' key in response
        
        Args:
            prompt: User prompt
            system_prompt: System instruction
            expected_fields: List of required fields
            stream: Whether to use streaming
            on_chunk: Optional callback for streaming chunks
            
        Returns:
            Parsed JSON dict or error dict with 'error' key
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        # Choose streaming or non-streaming
        if stream and on_chunk:
            response = await self.chat_completion_stream(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                on_chunk=on_chunk
            )
        elif stream:
            response = await self.chat_completion_stream(
                messages=messages,
                temperature=0.3,
                max_tokens=500
            )
        else:
            response = await self.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
        
        # Check for circuit breaker error
        if 'error' in response:
            logger.error(f"Circuit breaker blocked structured decision: {response['error_message']}")
            return response  # Return error dict for caller to handle
        
        # Parse JSON from complete response
        try:
            result = json.loads(response['content'])
            
            # Validate expected fields
            if expected_fields:
                missing = [f for f in expected_fields if f not in result]
                if missing:
                    logger.warning(f"Missing expected fields: {missing}")
                    for field in missing:
                        result[field] = None
            
            logger.debug(
                f"✅ Structured decision parsed: {len(result)} fields, "
                f"streamed={response.get('streamed', False)}"
            )
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}\nContent: {response['content'][:200]}")
            return {
                'error': 'json_parse_error',
                'error_message': f"Failed to parse LLM response as JSON: {str(e)}",
                'raw_content': response['content'][:500]
            }
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get client metrics"""
        cb_state = self.circuit_breaker.get_state()
        
        return {
            'total_requests': self.total_requests,
            'total_streaming_requests': self.total_streaming_requests,
            'total_tokens': self.total_tokens,
            'total_errors': self.total_errors,
            'circuit_breaker_rejections': self.circuit_breaker_rejections,
            'cache_size': len(self.cache),
            'circuit_breaker': cb_state
        }
    
    def get_circuit_breaker_state(self) -> Dict[str, Any]:
        """Get circuit breaker state"""
        return self.circuit_breaker.get_state()
    
    async def force_circuit_breaker_open(self):
        """Manually open circuit breaker (for testing/maintenance)"""
        await self.circuit_breaker.force_open()
    
    async def force_circuit_breaker_close(self):
        """Manually close circuit breaker (use with caution!)"""
        await self.circuit_breaker.force_close()


# Global LLM client instance
llm_client = LLMClient()