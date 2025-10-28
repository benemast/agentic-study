# backend/app/orchestrator/tools/base_tool.py
"""
Base Tool with Timeout Protection

All tools should inherit from BaseTool to get:
- Automatic timeout protection
- Progress tracking
- Error handling
- Metrics collection
"""
import asyncio
import time
import logging
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class ToolTimeoutError(Exception):
    """Raised when tool execution exceeds timeout"""
    def __init__(self, tool_name: str, timeout: int):
        self.tool_name = tool_name
        self.timeout = timeout
        self.message = f"{tool_name} timed out after {timeout}s"
        super().__init__(self.message)


class BaseTool(ABC):
    """
    Base class for all tools with timeout protection
    
    Features:
    - Automatic timeout handling
    - WebSocket progress updates
    - Error tracking
    - Execution metrics
    
    Example:
        class MyTool(BaseTool):
            def __init__(self):
                super().__init__(
                    name="My Tool",
                    timeout=300  # 5 minutes
                )
            
            async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
                # Your tool logic here
                return {'success': True, 'data': result}
    """
    
    def __init__(
        self,
        name: str = "Base Tool",
        timeout: int = 300,  # 5 minutes default
        allow_timeout_override: bool = True
    ):
        """
        Initialize base tool
        
        Args:
            name: Human-readable tool name
            timeout: Default timeout in seconds
            allow_timeout_override: Allow per-call timeout override
        """
        self.name = name
        self.default_timeout = timeout
        self.allow_timeout_override = allow_timeout_override
        self.websocket_manager = None
        
        # Metrics
        self.total_executions = 0
        self.total_successes = 0
        self.total_failures = 0
        self.total_timeouts = 0
        self.total_execution_time_ms = 0
        
        logger.debug(
            f"Tool initialized: {name} "
            f"(timeout={timeout}s, override={allow_timeout_override})"
        )
    
    def set_websocket_manager(self, ws_manager):
        """Set WebSocket manager for progress updates"""
        self.websocket_manager = ws_manager
        logger.debug(f"WebSocket manager injected into {self.name}")
    
    async def run(
        self,
        input_data: Dict[str, Any],
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute tool with timeout protection
        
        Args:
            input_data: Tool input data
            timeout: Optional timeout override (seconds)
            
        Returns:
            Result dict with 'success', 'data', 'error', etc.
        """
        # Determine timeout
        if timeout and self.allow_timeout_override:
            effective_timeout = timeout
        else:
            effective_timeout = self.default_timeout
        
        # Update metrics
        self.total_executions += 1
        
        # Extract session info for progress updates
        state = input_data.get('state', {})
        session_id = state.get('session_id')
        execution_id = state.get('execution_id')
        
        # Send tool start notification
        if self.websocket_manager and session_id:
            try:
                await self.websocket_manager.send_to_session(session_id, {
                    'type': 'tool_execution_start',
                    'tool_name': self.name,
                    'execution_id': execution_id,
                    'timeout_seconds': effective_timeout,
                    'timestamp': time.time()
                })
            except Exception as e:
                logger.warning(f"Failed to send tool start notification: {e}")
        
        # Execute with timeout
        start_time = time.time()
        
        try:
            # Run tool with timeout protection
            result = await asyncio.wait_for(
                self._execute(input_data),
                timeout=effective_timeout
            )
            
            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)
            self.total_execution_time_ms += execution_time_ms
            
            # Update metrics
            if result.get('success'):
                self.total_successes += 1
            else:
                self.total_failures += 1
            
            # Add execution time to result
            if 'execution_time_ms' not in result:
                result['execution_time_ms'] = execution_time_ms
            
            # Send tool complete notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'tool_execution_complete',
                        'tool_name': self.name,
                        'execution_id': execution_id,
                        'success': result.get('success'),
                        'execution_time_ms': execution_time_ms,
                        'timestamp': time.time()
                    })
                except Exception as e:
                    logger.warning(f"Failed to send tool complete notification: {e}")
            
            logger.info(
                f"✅ {self.name} completed: {execution_time_ms}ms, "
                f"success={result.get('success')}"
            )
            
            return result
            
        except asyncio.TimeoutError:
            # Tool execution timeout
            self.total_timeouts += 1
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            logger.error(
                f"⏱️  {self.name} TIMEOUT after {effective_timeout}s "
                f"(actual: {execution_time_ms}ms)"
            )
            
            # Send timeout notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'tool_execution_timeout',
                        'tool_name': self.name,
                        'execution_id': execution_id,
                        'timeout_seconds': effective_timeout,
                        'execution_time_ms': execution_time_ms,
                        'timestamp': time.time()
                    })
                except Exception as e:
                    logger.warning(f"Failed to send timeout notification: {e}")
            
            # Return timeout error
            return {
                'success': False,
                'error': 'timeout',
                'error_message': f'{self.name} execution timeout ({effective_timeout}s)',
                'error_type': 'ToolTimeoutError',
                'tool_name': self.name,
                'timeout_seconds': effective_timeout,
                'execution_time_ms': execution_time_ms,
                'data': None,
                'metadata': {
                    'timeout': True,
                    'recoverable': True  # Caller can retry
                }
            }
            
        except Exception as e:
            # Tool execution error
            self.total_failures += 1
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            logger.error(
                f"❌ {self.name} error: {e.__class__.__name__}: {str(e)[:200]}",
                exc_info=True
            )
            
            # Send error notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'tool_execution_error',
                        'tool_name': self.name,
                        'execution_id': execution_id,
                        'error_type': e.__class__.__name__,
                        'error_message': str(e)[:200],
                        'execution_time_ms': execution_time_ms,
                        'timestamp': time.time()
                    })
                except Exception as ws_error:
                    logger.warning(f"Failed to send error notification: {ws_error}")
            
            # Return error result
            return {
                'success': False,
                'error': 'execution_error',
                'error_message': str(e),
                'error_type': e.__class__.__name__,
                'tool_name': self.name,
                'execution_time_ms': execution_time_ms,
                'data': None,
                'metadata': {
                    'timeout': False,
                    'recoverable': self._is_recoverable_error(e)
                }
            }
    
    @abstractmethod
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute tool logic (to be implemented by subclasses)
        
        Args:
            input_data: Tool input data
            
        Returns:
            Result dict with 'success', 'data', 'error', etc.
        """
        raise NotImplementedError("Subclasses must implement _execute()")
    
    def _is_recoverable_error(self, error: Exception) -> bool:
        """
        Determine if error is recoverable (can retry)
        
        Override in subclass for custom logic
        
        Args:
            error: Exception that occurred
            
        Returns:
            True if error is recoverable
        """
        # Default: network errors and timeouts are recoverable
        recoverable_types = (
            asyncio.TimeoutError,
            ConnectionError,
            TimeoutError,
        )
        
        return isinstance(error, recoverable_types)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get tool execution metrics"""
        avg_execution_time = (
            self.total_execution_time_ms / self.total_executions
            if self.total_executions > 0
            else 0
        )
        
        success_rate = (
            self.total_successes / self.total_executions * 100
            if self.total_executions > 0
            else 0
        )
        
        return {
            'tool_name': self.name,
            'total_executions': self.total_executions,
            'total_successes': self.total_successes,
            'total_failures': self.total_failures,
            'total_timeouts': self.total_timeouts,
            'success_rate': round(success_rate, 2),
            'avg_execution_time_ms': round(avg_execution_time, 2),
            'total_execution_time_ms': self.total_execution_time_ms,
            'default_timeout_seconds': self.default_timeout
        }
    
    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"name='{self.name}', "
            f"timeout={self.default_timeout}s, "
            f"executions={self.total_executions})"
        )


class ToolExecutionContext:
    """
    Context manager for tool execution with automatic cleanup
    
    Usage:
        async with ToolExecutionContext(tool, input_data) as ctx:
            result = await tool._execute(input_data)
            ctx.set_result(result)
    """
    
    def __init__(self, tool: BaseTool, input_data: Dict[str, Any]):
        self.tool = tool
        self.input_data = input_data
        self.start_time = None
        self.result = None
        self.error = None
    
    async def __aenter__(self):
        self.start_time = time.time()
        logger.debug(f"Starting {self.tool.name} execution")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        execution_time = int((time.time() - self.start_time) * 1000)
        
        if exc_type:
            logger.error(
                f"{self.tool.name} failed after {execution_time}ms: "
                f"{exc_type.__name__}: {exc_val}"
            )
        else:
            logger.debug(
                f"{self.tool.name} completed in {execution_time}ms"
            )
        
        return False  # Don't suppress exceptions
    
    def set_result(self, result: Dict[str, Any]):
        """Set execution result"""
        self.result = result