# backend/app/orchestrator/llm/streaming_callbacks.py
"""
Streaming Callback Factory for LangChain + WebSocket Integration

Creates per-execution callbacks that stream LLM outputs to frontend:
- Fine-grained streaming: Token-by-token (with throttling)
- Batch-level streaming: Progress updates per batch
- Tool execution tracking
- LangSmith trace integration

Architecture:
- Callback factory creates new callbacks per execution
- Callbacks know their session_id and execution_id
- WebSocket manager handles actual message delivery
"""
import asyncio
import time
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timezone 
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.outputs import LLMResult
from langchain_core.agents import AgentAction, AgentFinish

logger = logging.getLogger(__name__)

# ============================================================
# STREAMING CONFIGURATION
# ============================================================

STREAMING_CONFIG = {
    'decision_maker': {
        'stream_level': 'fine_grained',  # Every token (throttled)
        'throttle': 10,  # Send every 10th token
        'event_type': 'agent_thinking'
    },
    'review_sentiment_analysis': {
        'stream_level': 'batch',  # Per-batch progress
        'reasoning_stream': 'fine_grained',  # But reasoning streams tokens
        'throttle': 1,
        'event_type': 'sentiment_analysis_progress'
    },
    'generate_insights': {
        'stream_level': 'fine_grained',  # Full ReAct streaming
        'throttle': 5,
        'event_type': 'insight_thinking'
    },
    'default': {
        'stream_level': 'batch',
        'throttle': 1,
        'event_type': 'tool_progress'
    }
}


def get_stream_config(tool_name: str) -> Dict[str, Any]:
    """Get streaming configuration for a tool"""
    return STREAMING_CONFIG.get(tool_name, STREAMING_CONFIG['default'])


# ============================================================
# WEBSOCKET STREAMING CALLBACK
# ============================================================

class WebSocketStreamingCallback(AsyncCallbackHandler):
    """
    LangChain callback that streams to WebSocket
    
    Features:
    - Token-by-token streaming (throttled)
    - Tool execution tracking
    - Agent decision tracking
    - Automatic event typing
    - Error handling
    
    Usage:
        callback = WebSocketStreamingCallback(
            ws_manager=ws_manager,
            session_id=session_id,
            execution_id=execution_id,
            tool_name='decision_maker'
        )
        
        # Pass to LangChain
        llm = ChatOpenAI(callbacks=[callback])
    """
    
    def __init__(
        self,
        ws_manager,
        session_id: str,
        execution_id: int,
        condition: str,
        tool_name: str = 'default',
        step_number: Optional[int] = None
    ):
        """
        Initialize streaming callback
        
        Args:
            ws_manager: WebSocket manager instance
            session_id: Session identifier
            execution_id: Execution identifier
            condition: 'workflow_builder' or 'ai_assistant'
            tool_name: Tool name for config lookup
            step_number: Optional step number
        """
        super().__init__()
        
        self.ws_manager = ws_manager
        self.session_id = session_id
        self.execution_id = execution_id
        self.condition = condition
        self.tool_name = tool_name
        self.step_number = step_number
        
        # Get streaming config
        self.config = get_stream_config(tool_name)
        self.stream_level = self.config['stream_level']
        self.throttle = self.config['throttle']
        
        # Throttling state
        self.token_count = 0
        self.chunk_count = 0
        self.full_content = ""
        
        # Timing
        self.start_time = time.time()
        self.first_token_time = None
        
        logger.debug(
            f"WebSocketStreamingCallback initialized: "
            f"tool={tool_name}, stream_level={self.stream_level}, "
            f"throttle={self.throttle}"
        )
    
    # ========================================
    # LLM CALLBACKS
    # ========================================
    
    async def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        **kwargs
    ) -> None:
        """Called when LLM starts generating"""
        logger.debug(f"LLM started for {self.tool_name}")
        
        # Send unified message
        await self._send_unified_message(
            msg_type='llm',
            subtype='start',
            data={
                'tool_name': self.tool_name,
                'step_number': self.step_number,
                'prompts_count': len(prompts)
            }
        )
    
    async def on_llm_new_token(
        self,
        token: str,
        **kwargs
    ) -> None:
        """
        Called for each new token
        
        Implements throttling based on config
        """
        self.token_count += 1
        self.full_content += token
        
        # Track first token time (TTFB)
        if self.first_token_time is None:
            self.first_token_time = time.time()
            ttfb_ms = int((self.first_token_time - self.start_time) * 1000)
            logger.debug(f"First token received: TTFB={ttfb_ms}ms")
        
        # Throttle based on config
        if self.stream_level == 'fine_grained':
            if self.token_count % self.throttle == 0:
                self.chunk_count += 1
                
                # Send unified token message
                await self._send_unified_message(
                    msg_type='llm',
                    subtype='token',
                    data={
                        'tool_name': self.tool_name,
                        'step_number': self.step_number,
                        'chunk': token,
                        'chunks_received': self.chunk_count,
                        'total_tokens': self.token_count
                    }
                )
    
    async def on_llm_end(
        self,
        response: LLMResult,
        **kwargs
    ) -> None:
        """Called when LLM finishes generating"""
        elapsed_ms = int((time.time() - self.start_time) * 1000)
        ttfb_ms = int((self.first_token_time - self.start_time) * 1000) if self.first_token_time else None
        
        logger.debug(
            f"LLM completed for {self.tool_name}: "
            f"{self.token_count} tokens, {elapsed_ms}ms, TTFB={ttfb_ms}ms"
        )
        
        # Send unified completion message
        await self._send_unified_message(
            msg_type='llm',
            subtype='end',
            data={
                'tool_name': self.tool_name,
                'step_number': self.step_number,
                'tokens_generated': self.token_count,
                'chunks_sent': self.chunk_count,
                'elapsed_ms': elapsed_ms,
                'ttfb_ms': ttfb_ms,
                'full_content_length': len(self.full_content)
            }
        )
    
    async def on_llm_error(
        self,
        error: Union[Exception, KeyboardInterrupt],
        **kwargs
    ) -> None:
        """Called when LLM encounters an error"""
        logger.error(f"LLM error for {self.tool_name}: {error}")
        
        await self._send_unified_message(
            msg_type='llm',
            subtype='error',
            data={
                'tool_name': self.tool_name,
                'step_number': self.step_number,
                'error': str(error),
                'error_type': type(error).__name__
            }
        )
    
    # ========================================
    # TOOL CALLBACKS
    # ========================================
    
    async def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        **kwargs
    ) -> None:
        """Called when a tool starts executing"""
        tool_name = serialized.get('name', 'unknown')
        
        logger.debug(f"Tool started: {tool_name}")
        
        await self._send_unified_message(
            msg_type='tool',
            subtype='start',
            data={
                'tool_name': tool_name,
                'step_number': self.step_number,
                'input_length': len(input_str)
            }
        )
    
    async def on_tool_end(
        self,
        output: str,
        **kwargs
    ) -> None:
        """Called when a tool finishes executing"""
        logger.debug(f"Tool completed: output length={len(output)}")
        
        await self._send_unified_message(
            msg_type='tool',
            subtype='end',
            data={
                'tool_name': self.tool_name,
                'step_number': self.step_number,
                'output_length': len(output)
            }
        )
    
    async def on_tool_error(
        self,
        error: Union[Exception, KeyboardInterrupt],
        **kwargs
    ) -> None:
        """Called when a tool encounters an error"""
        logger.error(f"Tool error: {error}")
        
        await self._send_unified_message(
            msg_type='tool',
            subtype='error',
            data={
                'tool_name': self.tool_name,
                'step_number': self.step_number,
                'error': str(error),
                'error_type': type(error).__name__
            }
        )
    
    # ========================================
    # AGENT CALLBACKS
    # ========================================
    
    async def on_agent_action(
        self,
        action: AgentAction,
        **kwargs
    ) -> None:
        """Called when agent takes an action"""
        logger.debug(f"Agent action: {action.tool}")
        
        await self._send_unified_message(
            msg_type='agent',
            subtype='action',
            data={
                'step_number': self.step_number,
                'tool': action.tool,
                'tool_input': str(action.tool_input)[:200],  # Truncate
                'log': action.log[:500] if action.log else None
            }
        )
    
    async def on_agent_finish(
        self,
        finish: AgentFinish,
        **kwargs
    ) -> None:
        """Called when agent finishes"""
        logger.debug("Agent finished")
        
        await self._send_unified_message(
            msg_type='agent',
            subtype='finish',
            data={
                'step_number': self.step_number,
                'output': str(finish.return_values)[:500]  # Truncate
            }
        )
    
    # ========================================
    # UNIFIED MESSAGE HELPER
    # ========================================
    
    async def _send_unified_message(
        self,
        msg_type: str,
        subtype: str,
        data: Dict[str, Any]
    ):
        """
        Send unified three-tier message
        
        Format:
            {
                'type': 'llm',              # Category
                'subtype': 'token',          # Action
                'execution_id': 123,
                'condition': 'workflow_builder',
                'timestamp': '2024-01-01T12:00:00+00:00',
                'data': {                    # Context
                    'tool_name': 'decision_maker',
                    'chunk': 'thinking...'
                }
            }
        
        Args:
            msg_type: Message category ('llm', 'tool', 'agent')
            subtype: Action type ('start', 'token', 'end', 'error', 'action', 'finish')
            data: Context data specific to the event
        """
        try:
            message = {
                'type': msg_type,
                'subtype': subtype,
                'execution_id': self.execution_id,
                'condition': self.condition,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'data': data
            }
            
            await self.ws_manager.send_to_session(
                self.session_id,
                message
            )
            
        except Exception as e:
            logger.warning(
                f"Failed to send {msg_type}/{subtype} message: {e}",
                exc_info=True
            )
    
    def get_full_content(self) -> str:
        """Get accumulated content"""
        return self.full_content
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get streaming metrics"""
        elapsed_ms = int((time.time() - self.start_time) * 1000)
        ttfb_ms = int((self.first_token_time - self.start_time) * 1000) if self.first_token_time else None
        
        return {
            'tool_name': self.tool_name,
            'tokens_generated': self.token_count,
            'chunks_sent': self.chunk_count,
            'elapsed_ms': elapsed_ms,
            'ttfb_ms': ttfb_ms,
            'stream_level': self.stream_level,
            'throttle': self.throttle
        }


# ============================================================
# CALLBACK FACTORY
# ============================================================

class CallbackFactory:
    """
    Factory for creating streaming callbacks
    
    Features:
    - Per-execution callback creation
    - Automatic config selection
    - WebSocket manager injection
    - Metrics aggregation
    
    Usage:
        factory = CallbackFactory(ws_manager)
        
        # Create callback for an execution
        callback = factory.create_callback(
            session_id='sess_123',
            execution_id=456,
            condition='workflow_builder',
            tool_name='decision_maker',
            step_number=3
        )
        
        # Use with LangChain
        llm = ChatOpenAI(callbacks=[callback])
    """
    
    def __init__(self, ws_manager):
        """
        Initialize callback factory
        
        Args:
            ws_manager: WebSocket manager instance
        """
        self.ws_manager = ws_manager        
        self._active_callbacks: Dict[str, WebSocketStreamingCallback] = {}
        
        logger.info("CallbackFactory initialized")
    
    def create_callback(
        self,
        session_id: str,
        execution_id: int,
        condition: str,
        tool_name: str = 'default',
        step_number: Optional[int] = None
    ) -> WebSocketStreamingCallback:
        """
        Create a new streaming callback
        
        Args:
            session_id: Session identifier
            execution_id: Execution identifier
            condition: 'workflow_builder' or 'ai_assistant'
            tool_name: Tool name for config lookup
            step_number: Optional step number
            
        Returns:
            WebSocketStreamingCallback instance
        """


        callback = WebSocketStreamingCallback(
            ws_manager=self.ws_manager,
            session_id=session_id,
            execution_id=execution_id,
            condition=condition,
            tool_name=tool_name,
            step_number=step_number
        )
        
        # Track active callback
        callback_key = f"{session_id}_{execution_id}_{tool_name}_{step_number}"
        self._active_callbacks[callback_key] = callback
        
        logger.debug(
            f"Created callback: session={session_id}, "
            f"execution={execution_id}, tool={tool_name}, condition={condition}"
        )
        
        return callback
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get metrics across all active callbacks"""
        return {
            'active_callbacks': len(self._active_callbacks),
            'callbacks': [
                cb.get_metrics()
                for cb in self._active_callbacks.values()
            ]
        }
    
    def cleanup_callback(self, session_id: str, execution_id: int):
        """Remove callbacks for a completed execution"""
        keys_to_remove = [
            key for key in self._active_callbacks.keys()
            if key.startswith(f"{session_id}_{execution_id}_")
        ]
        
        for key in keys_to_remove:
            del self._active_callbacks[key]
        
        logger.debug(f"Cleaned up {len(keys_to_remove)} callbacks")


# ============================================================
# GLOBAL FACTORY INSTANCE (initialized by orchestrator)
# ============================================================

_callback_factory: Optional[CallbackFactory] = None


def initialize_callback_factory(ws_manager):
    """Initialize global callback factory"""
    global _callback_factory
    _callback_factory = CallbackFactory(ws_manager)
    logger.info("Global callback factory initialized with unified messages")


def get_callback_factory() -> CallbackFactory:
    """Get global callback factory instance"""
    if _callback_factory is None:
        raise RuntimeError(
            "CallbackFactory not initialized. "
            "Call initialize_callback_factory(ws_manager) first."
        )
    return _callback_factory