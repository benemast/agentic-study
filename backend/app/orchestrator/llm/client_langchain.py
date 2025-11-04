# backend/app/orchestrator/llm/client_langchain.py
"""
LangChain ChatOpenAI Wrapper with Circuit Breaker Protection

Replaces direct OpenAI API calls with LangChain integration while maintaining:
- Circuit breaker fault tolerance
- Streaming support
- GPT-5 parameter handling
- Metrics tracking
- LangSmith tracing
- Sentry error capture

Architecture:
- CircuitBreakerProxy wraps ChatOpenAI instances
- Per-tool-type circuit breakers via CircuitBreakerManager
- Callback-based streaming
- Pydantic output parsing
"""
import asyncio
import time
import logging
from typing import Any, Dict, List, Optional, Union, Callable, Literal
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_core.outputs import ChatGeneration, LLMResult
from langchain_core.callbacks.base import AsyncCallbackHandler
from pydantic import BaseModel

from app.configs.config import settings
from .circuit_breaker_enhanced import circuit_breaker_manager, CircuitBreakerOpen, ToolType

logger = logging.getLogger(__name__)


# ============================================================
# CIRCUIT BREAKER PROXY FOR CHATOPEN AI
# ============================================================

class CircuitBreakerProxy:
    """
    Proxy that wraps ChatOpenAI with circuit breaker protection
    
    Features:
    - Automatic circuit breaker selection by tool type
    - Preserves all ChatOpenAI functionality
    - Transparent streaming support
    - Error handling with graceful degradation
    
    Usage:
        # Create wrapped client
        client = CircuitBreakerProxy(
            tool_name='decision_maker',
            model='gpt-5-nano'
        )
        
        # Use like normal ChatOpenAI
        result = await client.ainvoke(messages, callbacks=[...])
    """
    
    def __init__(
        self,
        tool_name: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        streaming: bool = True,
        verbosity: Optional[Literal["low", "medium", "high"]] = None,
        **kwargs
    ):
        """
        Initialize circuit breaker proxy
        
        Args:
            tool_name: Tool name for circuit breaker selection
            model: OpenAI model name (defaults to settings)
            temperature: Sampling temperature
            max_tokens: Max completion tokens
            streaming: Enable streaming
            **kwargs: Additional ChatOpenAI parameters
        """
        self.tool_name = tool_name
        self.model = model or settings.llm_model
        self.streaming = streaming
        
        # Build ChatOpenAI parameters
        chat_params = {
            'model': self.model,
            'streaming': streaming,
            'openai_api_key': settings.openai_api_key,
            **kwargs
        }
        
        # Add temperature (not supported by o1/o3/gpt-5)
        if temperature is not None and not self.model.startswith(('o1', 'o3', 'gpt-5')):
            chat_params['temperature'] = temperature
        
        # Add max_tokens with correct parameter name
        if max_tokens:
            if self.model.startswith(('gpt-4', 'gpt-5', 'o1', 'o3')):
                chat_params['max_completion_tokens'] = max_tokens
            else:
                chat_params['max_tokens'] = max_tokens
        
        # Add GPT-5 specific parameters if available
        if self.model.startswith('gpt-5'):
            # These can be set via model_kwargs if needed
            if 'model_kwargs' not in chat_params:
                chat_params['model_kwargs'] = {}
            # GPT-5 specific parameter
            if verbosity:
                chat_params["verbosity"] = verbosity
        
        # Create underlying ChatOpenAI instance
        self._chat = ChatOpenAI(**chat_params)
        
        # Get circuit breaker
        self.circuit_breaker = circuit_breaker_manager.get_breaker(tool_name)
        
        # Metrics
        self.total_calls = 0
        self.total_tokens = 0
        self.circuit_breaker_rejections = 0
        
        logger.debug(
            f"CircuitBreakerProxy created: tool={tool_name}, "
            f"model={self.model}, streaming={streaming}"
        )
    
    async def ainvoke(
        self,
        messages: Union[List[BaseMessage], List[Dict[str, str]]],
        callbacks: Optional[List[AsyncCallbackHandler]] = None,
        **kwargs
    ) -> AIMessage:
        """
        Invoke LLM with circuit breaker protection
        
        Args:
            messages: List of messages (BaseMessage or dicts)
            callbacks: Optional callbacks for streaming
            **kwargs: Additional parameters
            
        Returns:
            AIMessage with response
            
        Raises:
            CircuitBreakerOpen: If circuit breaker is open
        """
        self.total_calls += 1
        start_time = time.time()
        
        # Convert dict messages to BaseMessage if needed
        if messages and isinstance(messages[0], dict):
            messages = self._convert_messages(messages)
        
        try:
            # Call through circuit breaker
            result = await circuit_breaker_manager.call(
                tool_name=self.tool_name,
                func=self._do_invoke,
                messages=messages,
                callbacks=callbacks,
                **kwargs
            )
            
            # Track tokens if available
            if hasattr(result, 'response_metadata'):
                token_usage = result.response_metadata.get('token_usage', {})
                self.total_tokens += token_usage.get('total_tokens', 0)
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.debug(
                f"LLM call completed: tool={self.tool_name}, "
                f"elapsed={elapsed_ms}ms"
            )
            
            return result
            
        except CircuitBreakerOpen as e:
            # Circuit breaker rejected call
            self.circuit_breaker_rejections += 1
            logger.error(
                f"Circuit breaker blocked {self.tool_name}: {e.message}"
            )
            
            # Return error as AIMessage for graceful handling
            return AIMessage(
                content="",
                additional_kwargs={
                    'error': 'circuit_breaker_open',
                    'error_message': e.message,
                    'circuit_breaker_state': self.circuit_breaker.get_state()
                }
            )
    
    async def _do_invoke(
        self,
        messages: List[BaseMessage],
        callbacks: Optional[List[AsyncCallbackHandler]] = None,
        **kwargs
    ) -> AIMessage:
        """Internal invoke method (protected by circuit breaker)"""
        return await self._chat.ainvoke(messages, config={'callbacks': callbacks}, **kwargs)
    
    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[BaseMessage]:
        """Convert dict messages to LangChain BaseMessage objects"""
        converted = []
        
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            if role == 'system' or role == 'developer':
                converted.append(SystemMessage(content=content))
            elif role == 'assistant':
                converted.append(AIMessage(content=content))
            else:  # user or default
                converted.append(HumanMessage(content=content))
        
        return converted
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get client metrics"""
        return {
            'tool_name': self.tool_name,
            'model': self.model,
            'total_calls': self.total_calls,
            'total_tokens': self.total_tokens,
            'circuit_breaker_rejections': self.circuit_breaker_rejections,
            'circuit_breaker_state': self.circuit_breaker.get_state()
        }
    
    @property
    def model_name(self) -> str:
        """Get model name (for compatibility)"""
        return self.model


# ============================================================
# LANGCHAIN LLM CLIENT
# ============================================================

class LangChainLLMClient:
    """
    High-level LLM client using LangChain + Circuit Breakers
    
    Features:
    - Multiple model support with proper parameterization
    - Circuit breaker protection per tool type
    - Streaming with callback support
    - Structured output parsing
    - LangSmith tracing integration
    - Metrics tracking
    
    Usage:
        client = LangChainLLMClient()
        
        # Decision-making with streaming
        result = await client.chat_completion(
            tool_name='decision_maker',
            messages=[...],
            callbacks=[streaming_callback],
            stream=True
        )
        
        # Structured output
        decision = await client.get_structured_output(
            tool_name='decision_maker',
            messages=[...],
            output_schema=AgentDecision
        )
    """
    
    def __init__(self):
        """Initialize LangChain LLM client"""
        self.model = settings.llm_model
        self.default_temperature = settings.default_temperature
        self.default_max_tokens = settings.default_max_tokens
        
        # Cache for proxy instances (one per tool)
        self._proxies: Dict[str, CircuitBreakerProxy] = {}
        
        # Metrics
        self.total_requests = 0
        self.total_streaming_requests = 0
        
        logger.info(
            f"LangChainLLMClient initialized: model={self.model}, "
            f"streaming={'enabled' if settings.use_stream else 'disabled'}"
        )
    
    def _get_proxy(
        self,
        tool_name: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        streaming: bool = True,
        verbosity: Optional[str] = None
    ) -> CircuitBreakerProxy:
        """
        Get or create proxy for a tool
        
        Proxies are cached per tool for reuse
        """
        # Use default values if not provided
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens or self.default_max_tokens
        
        # Create cache key
        cache_key = f"{tool_name}_{temp}_{tokens}_{streaming}"
        
        if cache_key not in self._proxies:
            kwargs = {}

            self._proxies[cache_key] = CircuitBreakerProxy(
                tool_name=tool_name,
                model=self.model,
                temperature=temp,
                max_tokens=tokens,
                streaming=streaming,
                verbosity=verbosity,
                **kwargs
            )
        
        return self._proxies[cache_key]
    
    async def chat_completion(
        self,
        tool_name: str,
        messages: Union[List[BaseMessage], List[Dict[str, str]]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        callbacks: Optional[List[AsyncCallbackHandler]] = None,
        stream: bool = True,
        verbosity: Optional[Literal["low", "medium", "high"]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make chat completion request
        
        Args:
            tool_name: Tool name for circuit breaker selection.
            messages: Message list
            temperature: Sampling temperature
            max_tokens: Max completion tokens
            callbacks: Streaming callbacks
            stream: Enable streaming
            **kwargs: Additional parameters
            
        Returns:
            Dict with 'content', 'tokens', 'model', etc.
        """
        self.total_requests += 1
        if stream:
            self.total_streaming_requests += 1
        
        start_time = time.time()
        
        # Get proxy with circuit breaker
        proxy = self._get_proxy(
            tool_name=tool_name,
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=stream,
            verbosity=verbosity
        )
        
        # Invoke
        result = await proxy.ainvoke(
            messages=messages,
            callbacks=callbacks,
            **kwargs
        )
        
        # Check for circuit breaker error
        if hasattr(result, 'additional_kwargs') and 'error' in result.additional_kwargs:
            return {
                'content': None,
                'error': result.additional_kwargs['error'],
                'error_message': result.additional_kwargs['error_message'],
                'circuit_breaker_state': result.additional_kwargs.get('circuit_breaker_state'),
                'cached': False
            }
        
        # Extract content and metadata
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        response = {
            'content': result.content,
            'model': proxy.model_name,
            'latency_ms': elapsed_ms,
            'streamed': stream,
            'cached': False
        }
        
        # Add token usage if available
        if hasattr(result, 'response_metadata'):
            token_usage = result.response_metadata.get('token_usage', {})
            response['tokens'] = token_usage.get('total_tokens', 0)
            response['prompt_tokens'] = token_usage.get('prompt_tokens', 0)
            response['completion_tokens'] = token_usage.get('completion_tokens', 0)
        
        return response
    
    async def get_structured_output(
        self,
        tool_name: str,
        messages: Union[List[BaseMessage], List[Dict[str, str]]],
        output_schema: type[BaseModel],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        callbacks: Optional[List[AsyncCallbackHandler]] = None,
        stream: bool = False,
        verbosity: Optional[Literal["low", "medium", "high"]] = None,
        **kwargs
    ) -> Union[BaseModel, Dict[str, Any]]:
        """
        Get structured output using Pydantic schema
        
        Args:
            tool_name: Tool name for circuit breaker selection
            messages: Message list
            output_schema: Pydantic model class
            temperature: Sampling temperature
            max_tokens: Max completion tokens
            callbacks: Streaming callbacks
            stream: Enable streaming
            **kwargs: Additional parameters
            
        Returns:
            Parsed Pydantic model or error dict
        """
        # Get chat completion
        result = await self.chat_completion(
            tool_name=tool_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            callbacks=callbacks,
            stream=stream,
            verbosity=verbosity,
            **kwargs
        )
        
        # Check for error
        if 'error' in result:
            return result
        
        # Parse JSON content
        try:
            import json
            content = result['content']
            
            # Try to extract JSON if wrapped in markdown
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            parsed = json.loads(content)
            
            # Validate with Pydantic
            validated = output_schema(**parsed)
            
            return validated
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}\nContent: {result['content'][:200]}")
            return {
                'error': 'json_parse_error',
                'error_message': f"Failed to parse JSON: {str(e)}",
                'raw_content': result['content'][:500]
            }
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return {
                'error': 'validation_error',
                'error_message': f"Failed to validate output: {str(e)}",
                'raw_content': result['content'][:500]
            }
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive client metrics"""
        proxy_metrics = [
            proxy.get_metrics()
            for proxy in self._proxies.values()
        ]
        
        return {
            'total_requests': self.total_requests,
            'total_streaming_requests': self.total_streaming_requests,
            'active_proxies': len(self._proxies),
            'proxies': proxy_metrics,
            'circuit_breaker_manager': circuit_breaker_manager.get_metrics()
        }
    
    def get_circuit_breaker_state(self, tool_name: Optional[str] = None) -> Dict[str, Any]:
        """Get circuit breaker state"""
        return circuit_breaker_manager.get_state(tool_name)


# ============================================================
# GLOBAL INSTANCE
# ============================================================

# Singleton instance
langchain_llm_client = LangChainLLMClient()


def get_llm_client() -> LangChainLLMClient:
    """Get global LangChain LLM client instance"""
    return langchain_llm_client