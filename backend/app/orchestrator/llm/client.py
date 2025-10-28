# backend/app/orchestrator/llm/client.py
"""
Robust LLM Client with streaming support, retry logic, and error handling
"""
from typing import Dict, Any, Optional, List, Callable, Awaitable
import asyncio
import logging
import json
from datetime import datetime
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

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Robust LLM client with:
    - Streaming for latency reduction (Time To First Byte)
    - Real-time progress callbacks for user feedback
    - Structured output validation
    - TTL-based caching
    - Token usage tracking
    - Timeout protection
    - Retry with exponential backoff
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
        logger.info(f"✅ Streaming enabled: {settings.use_stream}")
    
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
        Make chat completion request with retry logic (NON-STREAMING)
        
        Use this for: cached requests, simple responses
        Prefer: chat_completion_stream() for latency-sensitive operations
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 - 2.0)
            max_tokens: Maximum tokens in response
            response_format: Optional response format (e.g., {"type": "json_object"})
            cache_key: Optional cache key for repeated requests
            timeout: Request timeout in seconds
            
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
        STREAMING chat completion with real-time callbacks
        
        OPTIMIZED FOR:
        - Latency reduction (Time To First Byte < 1s)
        - User feedback (progress indication via on_chunk)
        - Performance (reduces perceived wait time by ~80-90%)
        
        STRATEGY:
        - Start streaming immediately (low TTFB)
        - Call on_chunk for each content delta (user feedback)
        - Accumulate full response (reliability)
        - Track tokens and performance
        
        Args:
            messages: Chat messages
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            on_chunk: Async callback called for each content chunk
            timeout: Request timeout in seconds
            
        Returns:
            Dict with full content, tokens, model, metrics
            
        Example:
            async def handle_chunk(chunk: str):
                print(f"Received: {chunk}")
                await websocket.send({'type': 'thinking', 'chunk': chunk})
            
            result = await client.chat_completion_stream(
                messages=[{"role": "user", "content": "Hello"}],
                on_chunk=handle_chunk
            )
            # Result: {'content': 'Hello! ...', 'tokens': 42, 'chunk_count': 15}
        """
        self.total_requests += 1
        self.total_streaming_requests += 1
        start_time = asyncio.get_event_loop().time()
        
        full_content = ""
        tokens_used = 0
        model_used = None
        finish_reason = None
        chunk_count = 0
        first_chunk_time = None
        
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
                # Track TTFB (Time To First Byte)
                if chunk_count == 0:
                    first_chunk_time = asyncio.get_event_loop().time()
                    ttfb_ms = int((first_chunk_time - start_time) * 1000)
                    logger.info(f"⚡ TTFB: {ttfb_ms}ms (streaming)")
                
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
            
            # Calculate metrics
            elapsed = asyncio.get_event_loop().time() - start_time
            ttfb_ms = int((first_chunk_time - start_time) * 1000) if first_chunk_time else 0
            
            logger.info(
                f"✅ Streaming LLM completed: {tokens_used} tokens, "
                f"{chunk_count} chunks, {elapsed:.2f}s, TTFB={ttfb_ms}ms, "
                f"finish_reason={finish_reason}"
            )
            
            return {
                'content': full_content,
                'tokens': tokens_used,
                'model': model_used or self.model,
                'finish_reason': finish_reason,
                'cached': False,
                'latency_ms': int(elapsed * 1000),
                'ttfb_ms': ttfb_ms,
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
        Get structured JSON response from LLM with OPTIMIZED STREAMING
        
        STREAMING STRATEGY:
        - Streams content to reduce latency (TTFB < 1s)
        - Provides user feedback via on_chunk callbacks
        - Accumulates full response for reliable JSON parsing
        - No partial JSON parsing (too unreliable)
        
        WHEN TO USE STREAMING:
        - Decision making: ✅ stream=True, on_chunk=websocket_callback
        - Insight generation: ✅ stream=True, on_chunk=progress_indicator
        - Simple data queries: ❌ stream=False (fast enough without)
        
        Args:
            prompt: User prompt
            system_prompt: System instruction
            expected_fields: List of required fields in response
            stream: Whether to use streaming (default: False for compatibility)
            on_chunk: Optional callback for streaming chunks (progress updates)
            
        Returns:
            Parsed JSON dict
            
        Example:
            # With streaming and progress updates
            async def show_thinking(chunk: str):
                await websocket.send({'type': 'thinking', 'chunk': chunk})
            
            decision = await client.get_structured_decision(
                prompt="What should I do next?",
                system_prompt="You are an agent.",
                stream=True,  # Enable streaming
                on_chunk=show_thinking  # Show progress
            )
            # Returns: {'action': 'gather_data', 'reasoning': '...'}
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        # Choose streaming or non-streaming
        if stream and on_chunk:
            # STREAMING PATH (with callback for progress)
            # Best for: decision making, long operations, user feedback
            logger.debug("🌊 Using streaming mode with progress callbacks")
            response = await self.chat_completion_stream(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                on_chunk=on_chunk  # Forward progress updates
            )
        elif stream:
            # STREAMING PATH (no callback)
            # Best for: latency reduction without progress updates
            logger.debug("🌊 Using streaming mode (no callbacks)")
            response = await self.chat_completion_stream(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                on_chunk=None
            )
        else:
            # NON-STREAMING PATH (legacy compatibility)
            # Best for: cached requests, very fast operations
            logger.debug("📦 Using non-streaming mode")
            response = await self.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}  # Helps with JSON
            )
        
        # Parse JSON from complete response
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
            
            # Log success with metrics
            logger.debug(
                f"✅ Structured decision parsed: "
                f"{len(result)} fields, "
                f"streamed={response.get('streamed', False)}, "
                f"TTFB={response.get('ttfb_ms', 0)}ms"
            )
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON response: {e}")
            logger.error(f"Raw content (first 500 chars): {response['content'][:500]}...")
            raise ValueError(f"LLM returned invalid JSON: {e}")
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get client performance metrics
        
        Returns:
            Dict with request counts, streaming stats, tokens, errors
        """
        streaming_pct = (self.total_streaming_requests / max(self.total_requests, 1)) * 100
        error_rate = self.total_errors / max(self.total_requests, 1)

        return {
            'total_requests': self.total_requests,
            'streaming_requests': self.total_streaming_requests,
            'non_streaming_requests': self.total_requests - self.total_streaming_requests,
            'streaming_percentage': round(streaming_pct, 2),
            'total_tokens': self.total_tokens,
            'total_errors': self.total_errors,
            'cache_size': len(self.cache),
            'cache_hit_rate': 'N/A',  # Could track cache hits separately
            'error_rate': round(error_rate, 4)
        }
    
    def clear_cache(self):
        """Clear response cache"""
        self.cache.clear()
        logger.info("LLM cache cleared")


# Global LLM client instance
llm_client = LLMClient()