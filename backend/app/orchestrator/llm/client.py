# backend/app/orchestrator/llm/client.py
"""
Robust LLM Client with streaming support, retry logic, and error handling
"""
from typing import Dict, Any, Optional, List, Callable, Awaitable
import asyncio
import logging
from datetime import datetime
from openai import AsyncOpenAI
from openai import APIError, RateLimitError, APITimeoutError
import json
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
from cachetools import TTLCache

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Robust LLM client with:
    - Streaming Support
    - Automatic retry with exponential backoff
    - Structured output validation
    - TTL-based caching (improved from plain dict)
    - Token usage tracking
    - Timeout protection
    - Multiple provider support
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.llm_model
        
        # Metrics
        self.total_requests = 0
        self.total_tokens = 0
        self.total_errors = 0
        self.total_streaming_requests = 0
        
        # Improved cache with TTL (1 hour) and size limit (100 entries)
        self.cache = TTLCache(maxsize=100, ttl=3600)
        
        logger.info(f"✅ LLM Client initialized with model: {self.model}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((RateLimitError, APITimeoutError, APIError)),
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
        Make chat completion request with retry logic
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 - 2.0)
            max_tokens: Maximum tokens in response
            response_format: Optional response format (e.g., {"type": "json_object"})
            cache_key: Optional cache key for repeated requests
            
        Returns:
            Response dict with 'content', 'tokens', 'model', 'cached'
        """
        # Check cache
        if cache_key and cache_key in self.cache:
            logger.info(f"Cache hit for key: {cache_key}")
            return {**self.cache[cache_key], 'cached': True}
        
        self.total_requests += 1
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
            finish_reason = completion.choices[0].finish_reason
            
            # Track tokens
            tokens_used = completion.usage.total_tokens
            self.total_tokens += tokens_used
            
            elapsed = asyncio.get_event_loop().time() - start_time
            
            logger.info(
                f"LLM request completed: {tokens_used} tokens, "
                f"{elapsed:.2f}s, finish_reason={finish_reason}"
            )
            
            result = {
                'content': content,
                'tokens': tokens_used,
                'model': completion.model,
                'finish_reason': finish_reason,
                'cached': False,
                'latency_ms': int(elapsed * 1000),
                'streamed': False
            }
            
            # Cache if requested
            if cache_key:
                self.cache[cache_key] = result
            
            return result
            
        except asyncio.TimeoutError:
            logger.error(f"LLM request timed out after {timeout}s")
            self.total_errors += 1
            raise APITimeoutError(f"Request timed out after {timeout}s")
            
        except RateLimitError as e:
            logger.warning(f"Rate limit hit: {e}")
            self.total_errors += 1
            raise
            
        except APITimeoutError as e:
            logger.warning(f"API timeout: {e}")
            self.total_errors += 1
            raise
            
        except APIError as e:
            logger.error(f"API error: {e}")
            self.total_errors += 1
            raise
            
        except Exception as e:
            logger.error(f"Unexpected error in LLM call: {e}", exc_info=True)
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
        ✨ NEW: Streaming chat completion with real-time callbacks
        
        Args:
            messages: Chat messages
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            on_chunk: Async callback called for each content chunk
            timeout: Request timeout in seconds
            
        Returns:
            Dict with full content, tokens, model, etc.
            
        Example:
            async def handle_chunk(chunk: str):
                print(f"Received: {chunk}")
            
            result = await client.chat_completion_stream(
                messages=[{"role": "user", "content": "Hello"}],
                on_chunk=handle_chunk
            )
        """
        self.total_requests += 1
        self.total_streaming_requests += 1
        start_time = asyncio.get_event_loop().time()
        
        full_content = ""
        tokens_used = 0
        model_used = None
        finish_reason = None
        chunk_count = 0
        
        try:
            # Create streaming completion with timeout
            stream = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    stream_options={"include_usage": True}
                ),
                timeout=timeout
            )
            
            # Process stream
            async for chunk in stream:
                # Extract content from chunk
                if chunk.choices and chunk.choices[0].delta.content:
                    content_chunk = chunk.choices[0].delta.content
                    full_content += content_chunk
                    chunk_count += 1
                    
                    # Call callback if provided
                    if on_chunk:
                        try:
                            await on_chunk(content_chunk)
                        except Exception as e:
                            logger.warning(f"Chunk callback error: {e}")
                
                # Extract finish reason
                if chunk.choices and chunk.choices[0].finish_reason:
                    finish_reason = chunk.choices[0].finish_reason
                
                # Extract model (available in first chunk)
                if chunk.model and not model_used:
                    model_used = chunk.model
                
                # Extract usage (available in final chunk with include_usage=True)
                if hasattr(chunk, 'usage') and chunk.usage:
                    tokens_used = chunk.usage.total_tokens
            
            # Update total token count
            self.total_tokens += tokens_used
            
            elapsed = asyncio.get_event_loop().time() - start_time
            
            logger.info(
                f"Streaming LLM request completed: {tokens_used} tokens, "
                f"{chunk_count} chunks, {elapsed:.2f}s, finish_reason={finish_reason}"
            )
            
            return {
                'content': full_content,
                'tokens': tokens_used,
                'model': model_used or self.model,
                'finish_reason': finish_reason,
                'cached': False,
                'latency_ms': int(elapsed * 1000),
                'streamed': True,
                'chunk_count': chunk_count
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
        Get structured JSON response from LLM
        
        Args:
            prompt: User prompt
            system_prompt: System instruction
            expected_fields: List of required fields in response
            stream: Whether to use streaming
            on_chunk: Optional callback for streaming chunks
            
        Returns:
            Parsed JSON dict
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        # Choose streaming or non-streaming
        if stream:
            response = await self.chat_completion_stream(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                on_chunk=on_chunk
            )
        else:
            response = await self.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
        
        # Parse JSON
        try:
            result = json.loads(response['content'])
            
            # Validate expected fields
            if expected_fields:
                missing = [f for f in expected_fields if f not in result]
                if missing:
                    logger.warning(f"Missing expected fields: {missing}")
                    # Add defaults for missing fields
                    for field in missing:
                        result[field] = None
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON response: {e}")
            logger.error(f"Raw content: {response['content']}")
            raise ValueError(f"LLM returned invalid JSON: {e}")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get client metrics"""
        return {
            'total_requests': self.total_requests,
            'streaming_requests': self.total_streaming_requests,
            'non_streaming_requests': self.total_requests - self.total_streaming_requests,
            'streaming_percentage': (self.total_streaming_requests / max(self.total_requests, 1)) * 100,
            'total_tokens': self.total_tokens,
            'total_errors': self.total_errors,
            'cache_size': len(self.cache),
            'error_rate': self.total_errors / max(self.total_requests, 1)
        }
    
    def clear_cache(self):
        """Clear response cache"""
        self.cache.clear()
        logger.info("LLM cache cleared")


# Global LLM client instance
llm_client = LLMClient()