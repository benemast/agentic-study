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
        self.websocket_manager = None   # Injected by orchestrator
        self.llm_client = None          # Injected by orchestrator
        
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
        """Inject WebSocket manager for tool"""
        self.websocket_manager = ws_manager
        logger.debug(f"WebSocket manager injected into {self.name}")
    
    def set_llm_client(self, client):
        """Inject LLM client for AI-powered operations"""
        self.llm_client = client
        logger.info(f"LLM client injected into {self.name}")


# START: Websocket Notification helpers
    
    # =====================================
    # LEVEL 1: Direct WebSocket Send (Maximum Flexibility)
    # =====================================
    
    async def _send_websocket(
        self,
        session_id: Optional[str],
        message: Dict[str, Any],
        priority: str = 'normal',
        immediate: bool = False,
        broadcast: bool = False
    ) -> bool:
        """
        Send WebSocket message (LOWEST LEVEL - Direct Access to WS Manager)
        
        Provides direct access to all WebSocket manager capabilities:
        - Custom message structure (no automatic fields added)
        - Priority control ('normal' or 'high')
        - Batching control (immediate=True bypasses batching)
        - Broadcast option (send to all connections vs first connection)
        
        Args:
            session_id: Session to send to (required)
            message: Complete message payload (sent as-is)
            priority: Message priority - 'normal' or 'high' (default: 'normal')
            immediate: Bypass batching, send immediately (default: False)
            broadcast: Send to all connections instead of just first (default: False)
            
        Returns:
            True if sent successfully, False otherwise
        
        Examples:
            # Basic send
            await self._send_websocket(session_id, {'type': 'custom', 'data': 'value'})
            
            # High priority, immediate
            await self._send_websocket(
                session_id, 
                {'type': 'critical_alert', 'message': 'Error!'},
                priority='high',
                immediate=True
            )
            
            # Broadcast to all tabs
            await self._send_websocket(
                session_id,
                {'type': 'sync', 'state': {...}},
                broadcast=True
            )
        """
        if not self.websocket_manager or not session_id:
            return False
        
        try:
            if broadcast:
                # Send to ALL connections for this session
                await self.websocket_manager.broadcast_to_session(session_id, message)
            else:
                # Send to first connection (default)
                await self.websocket_manager.send_to_session(
                    session_id=session_id,
                    message=message,
                    priority=priority,
                    immediate=immediate
                )
            return True
            
        except Exception as e:
            logger.warning(
                f"Failed to send WebSocket message: {e}",
                extra={
                    'tool_name': self.name,
                    'session_id': session_id,
                    'message_type': message.get('type'),
                    'error': str(e)
                }
            )
            return False
    
    # =====================================
    # LEVEL 2: Structured Message Builder (Convenient + Flexible)
    # =====================================
    
    async def _send_tool_message(
        self,
        session_id: str,
        message_type: str,
        execution_id: Optional[int] = None,
        priority: str = 'normal',
        immediate: bool = False,
        broadcast: bool = False,
        add_tool_name: bool = True,
        add_timestamp: bool = True,
        **kwargs
    ) -> bool:
        """
        Send tool message with optional standard fields (MID LEVEL)
        
        Builds structured message with configurable automatic fields.
        All WebSocket manager features available.
        
        Args:
            session_id: Session to send to
            message_type: Message type (e.g., 'tool_progress', 'tool_error')
            execution_id: Execution ID (optional, auto-added if provided)
            priority: 'normal' or 'high' (default: 'normal')
            immediate: Bypass batching (default: False)
            broadcast: Send to all connections (default: False)
            add_tool_name: Auto-add 'tool_name' field (default: True)
            add_timestamp: Auto-add 'timestamp' field (default: True)
            **kwargs: Additional custom fields
            
        Returns:
            True if sent successfully
        
        Examples:
            # Minimal message
            await self._send_tool_message(
                session_id, 
                'data_loaded',
                records=1000
            )
            
            # Full control
            await self._send_tool_message(
                session_id,
                message_type='critical_update',
                execution_id=123,
                priority='high',
                immediate=True,
                broadcast=True,
                add_tool_name=True,
                add_timestamp=True,
                custom_field='value',
                nested={'data': 'structure'}
            )
            
            # Minimal with no auto-fields
            await self._send_tool_message(
                session_id,
                'clean_event',
                add_tool_name=False,
                add_timestamp=False,
                data='minimal'
            )
        """
        # Build message payload
        payload = {'type': message_type}
        
        # Add optional standard fields
        if add_tool_name:
            payload['tool_name'] = self.name
        if add_timestamp:
            payload['timestamp'] = time.time()
        if execution_id is not None:
            payload['execution_id'] = execution_id
        
        # Add all custom fields
        payload.update(kwargs)
        
        # Send using base function
        return await self._send_websocket(
            session_id=session_id,
            message=payload,
            priority=priority,
            immediate=immediate,
            broadcast=broadcast
        )
    
    # =====================================
    # LEVEL 3: Progress Tracking Helpers (High-Level Convenience)
    # =====================================
    
    async def _send_progress(
        self,
        session_id: str,
        execution_id: int,
        progress: int,
        message: str = None,
        step: str = None,
        details: Dict[str, Any] = None,
        priority: str = 'normal',
        immediate: bool = False
    ) -> bool:
        """
        Send progress update (HIGH LEVEL - Progress Tracking)
        
        Standard progress tracking with all WebSocket options.
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            progress: Progress percentage (0-100, -1 for error)
            message: Progress message
            step: Current step name
            details: Additional details dict
            priority: 'normal' or 'high'
            immediate: Bypass batching
            
        Returns:
            True if sent successfully
        """
        kwargs = {'progress': progress}
        
        if message:
            kwargs['message'] = message
        if step:
            kwargs['step'] = step
        if details:
            kwargs['details'] = details
        
        return await self._send_tool_message(
            session_id=session_id,
            message_type='tool_progress',
            execution_id=execution_id,
            priority=priority,
            immediate=immediate,
            **kwargs
        )
    
    async def _send_progress_start(
        self,
        session_id: str,
        execution_id: int,
        message: str = None,
        total_steps: int = None,
        immediate: bool = False
    ) -> bool:
        """
        Send progress start notification
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            message: Start message (default: "{tool_name} starting...")
            total_steps: Total number of steps (optional)
            immediate: Bypass batching (default: False)
        """
        details = {}
        if total_steps:
            details['total_steps'] = total_steps
        
        return await self._send_progress(
            session_id=session_id,
            execution_id=execution_id,
            progress=0,
            message=message or f"{self.name} starting...",
            step="start",
            details=details if details else None,
            immediate=immediate
        )
    
    async def _send_progress_update(
        self,
        session_id: str,
        execution_id: int,
        progress: int,
        message: str,
        step: str = None,
        details: Dict[str, Any] = None
    ) -> bool:
        """
        Send progress update (convenience wrapper)
        
        Always uses normal priority and batching for efficiency.
        """
        return await self._send_progress(
            session_id=session_id,
            execution_id=execution_id,
            progress=progress,
            message=message,
            step=step,
            details=details,
            priority='normal',
            immediate=False
        )
    
    async def _send_progress_complete(
        self,
        session_id: str,
        execution_id: int,
        message: str = None,
        summary: Dict[str, Any] = None,
        immediate: bool = True
    ) -> bool:
        """
        Send progress completion notification
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            message: Completion message (default: "{tool_name} complete")
            summary: Summary statistics
            immediate: Send immediately (default: True for completion)
        """
        return await self._send_progress(
            session_id=session_id,
            execution_id=execution_id,
            progress=100,
            message=message or f"{self.name} complete",
            step="complete",
            details=summary,
            immediate=immediate
        )
    
    async def _send_progress_error(
        self,
        session_id: str,
        execution_id: int,
        error_message: str,
        error_type: str = None,
        details: Dict[str, Any] = None
    ) -> bool:
        """
        Send progress error notification
        
        Always high priority and immediate.
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            error_message: Error description
            error_type: Error type classification
            details: Additional error details
        """
        error_details = details or {}
        if error_type:
            error_details['error_type'] = error_type
        
        return await self._send_progress(
            session_id=session_id,
            execution_id=execution_id,
            progress=-1,
            message=f"Error: {error_message}",
            step="error",
            details=error_details,
            priority='high',
            immediate=True
        )
    
    # =====================================
    # LEVEL 4: Broadcast Helpers (Multi-Tab Sync)
    # =====================================
    
    async def _broadcast_state_sync(
        self,
        session_id: str,
        execution_id: int,
        state_update: Dict[str, Any],
        immediate: bool = True
    ) -> bool:
        """
        Broadcast state update to all connections (multi-tab sync)
        
        Args:
            session_id: User session ID
            execution_id: Current execution ID
            state_update: State changes to sync
            immediate: Send immediately (default: True for sync)
        """
        return await self._send_tool_message(
            session_id=session_id,
            message_type='state_sync',
            execution_id=execution_id,
            broadcast=True,  # ✅ Send to all tabs
            immediate=immediate,
            state=state_update
        )

# END: Websocket Notification helpers
    
    def _extract_session_info(self, input_data: Dict[str, Any]) -> tuple[Optional[str], Optional[int]]:
        """
        Extract session_id and execution_id from input_data
        
        Supports both formats:
        1. NEW (top-level): input_data['session_id']
        2. OLD (nested): input_data['state']['session_id']
        
        Args:
            input_data: Tool input data
            
        Returns:
            Tuple of (session_id, execution_id)
        """
        # Try new format first (top-level) - PREFERRED
        session_id = input_data.get('session_id')
        execution_id = input_data.get('execution_id')
        
        # Fallback to legacy format (nested in 'state')
        if not session_id:
            state = input_data.get('state', {})
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            
            if session_id:
                logger.debug(
                    f"{self.name}: Using legacy nested 'state' format. "
                    "Consider passing session_id/execution_id at top level for better compatibility."
                )
        
        return session_id, execution_id
    
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
        session_id, execution_id = self._extract_session_info(input_data)
        
        # Send tool start notification
        await self._send_tool_message(
            session_id=session_id,
            message_type='tool_execution_start',
            execution_id=execution_id,
            timeout_seconds = effective_timeout
        )
        
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
            
            # Add execution time to result if not present
            if 'execution_time_ms' not in result:
                result['execution_time_ms'] = execution_time_ms
            
            # Send tool complete notification
            await self._send_tool_message(
                session_id=session_id,
                message_type='tool_execution_complete',
                execution_id=execution_id,
                success= result.get('success'),
                execution_time_ms=execution_time_ms
            )
            
            logger.info(
                f"{self.name} completed: {execution_time_ms}ms, success={result.get('success')}",
                extra={
                    'tool_name': self.name,
                    'execution_time_ms': execution_time_ms,
                    'success': result.get('success'),
                    'session_id': session_id,
                    'execution_id': execution_id
                }
            )
            
            return result
            
        except asyncio.TimeoutError:
            # Tool execution timeout
            self.total_timeouts += 1
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            logger.error(
                f"{self.name} TIMEOUT after {effective_timeout}s (actual: {execution_time_ms}ms)",
                extra={
                    'tool_name': self.name,
                    'timeout_seconds': effective_timeout,
                    'execution_time_ms': execution_time_ms,
                    'session_id': session_id,
                    'execution_id': execution_id
                }
            )
            
            # Send timeout notification
            await self._send_tool_message(
                session_id=session_id,
                message_type='tool_execution_timeout',
                execution_id=execution_id,
                timeout_seconds= effective_timeout,
                execution_time_ms= execution_time_ms
            )
            
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
                f"{self.name} error: {e.__class__.__name__}: {str(e)[:200]}",
                extra={
                    'tool_name': self.name,
                    'error_type': e.__class__.__name__,
                    'error_message': str(e)[:500],  # ✅ Increased from 200 to 500
                    'execution_time_ms': execution_time_ms,
                    'session_id': session_id,
                    'execution_id': execution_id
                },
                exc_info=True
            )
            
            # Send error notification
            await self._send_tool_message(
                session_id=session_id,
                message_type='tool_execution_error',
                execution_id=execution_id,
                error_type=e.__class__.__name__,
                error_message=str(e)[:200],
                execution_time_ms=execution_time_ms
            )
            
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


    def _log_to_file(self, data: dict, filename: str = None):
        """
        Log to a JSON file
        
        Args:
            data: Dictionary of data to log
            filename: Optional custom filename (without .json extension)
        
        Returns:
            Path: Filepath where data was logged
        """
        import json
        from pathlib import Path
        from datetime import datetime

        try:
            # Create logs directory if it doesn't exist
            log_dir = Path("logs/tools_data")
            log_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate filename with timestamp if not provided
            if filename is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"data_{timestamp}"
                
            if not filename.endswith('.json'):
                filename = f"{filename}.json"
            
            filepath = log_dir / filename
            
            # Write results to file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Data logged to: {filepath}")
            return filepath
        
        except Exception as e:
            logger.info(f"Failed to log data to file: {e}")
            return None


    def _log_results_to_file(self, data: dict, add_timestamp: bool = False):
        """
        Log results data to a JSON file with class name prefix
        
        Args:
            data: Dictionary of results to log
        
        Returns:
            Path: Filepath where data was logged
        """
        from datetime import datetime
        
        class_name = self.__class__.__name__
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S") if add_timestamp else ""
        filename = f"{class_name}_results_{timestamp}" if add_timestamp else f"{class_name}_results"
        
        return self._log_to_file(data, filename)


    def _log_input_to_file(self, data: dict, add_timestamp: bool = False):
        """
        Log input data to a JSON file with class name prefix
        
        Args:
            data: Dictionary of input data to log
        
        Returns:
            Path: Filepath where data was logged
        """
        from datetime import datetime
        
        class_name = self.__class__.__name__
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S") if add_timestamp else ""
        filename = f"{class_name}_input_{timestamp}"
        
        return self._log_to_file(data, filename)

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