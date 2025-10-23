# backend/app/websocket/manager.py
"""
WebSocket Manager with Batch Support + Connection Pooling
"""
from fastapi import WebSocket
from typing import Dict, List, Set, Optional, Any, Callable
import logging
import json
import asyncio
import time
from datetime import datetime
from collections import defaultdict

from app.config import settings
from .batch_manager import ws_batch_manager, WebSocketBatchManager

logger = logging.getLogger(__name__)


class ConnectionPool:
    """
    Manages multiple WebSocket connections per session
    
    Features:
    - Multiple connections per session (e.g., multiple browser tabs)
    - Connection health tracking
    - Automatic cleanup of stale connections
    """
    
    def __init__(self):
        # session_id -> List[WebSocket]
        self.connections: Dict[str, List[WebSocket]] = defaultdict(list)
        # websocket -> {session_id, connection_id, connected_at}
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}

    def add_connection(self, session_id: str, websocket: WebSocket, connection_id: str):
        """Add a connection to the pool"""
        self.connections[session_id].append(websocket)
        self.connection_info[websocket] = {
            'session_id': session_id,
            'connection_id': connection_id,
            'connected_at': time.time()
        }
    
    def remove_connection(self, session_id: str, websocket: WebSocket):
        """Remove a connection from the pool"""
        if session_id in self.connections:
            if websocket in self.connections[session_id]:
                self.connections[session_id].remove(websocket)
            
            # Clean up empty session
            if not self.connections[session_id]:
                del self.connections[session_id]
        
        # Remove from connection info
        if websocket in self.connection_info:
            del self.connection_info[websocket]
    
    def get_connections(self, session_id: str) -> List[WebSocket]:
        """Get all connections for a session"""
        return self.connections.get(session_id, [])
    
    def get_all_sessions(self) -> List[str]:
        """Get all active session IDs"""
        return list(self.connections.keys())
    
    def get_connection_count(self) -> int:
        """Get total number of connections"""
        return sum(len(conns) for conns in self.connections.values())
    
    def get_session_count(self) -> int:
        """Get number of active sessions"""
        return len(self.connections)


class WebSocketManager:
    """
    COMPLETE WebSocket Manager with:
    - Connection pooling (multiple connections per session)
    - Message batching for performance
    - Health checks and reconnection
    - Message queuing for offline sessions
    - Rate limiting
    - Channel subscriptions
    - Request-response pattern support
    """
    
    def __init__(self, enable_batching: bool = True):
        # Connection pool
        self.pool = ConnectionPool()
        
        # Message handlers for request-response pattern
        self.handlers: Dict[str, Callable] = {}
                
        # Message queue for offline sessions
        self.message_queue: Dict[str, List[dict]] = defaultdict(list)
        self.max_queue_size = 100
        

        # Rate limiting - respect settings
        self.rate_limit_enabled = settings.rate_limit_enabled
        self.rate_limits: Dict[str, dict] = defaultdict(
            lambda: {'count': 0, 'reset_at': time.time() + 60}
        )
        self.rate_limit_max = 100  # messages per minute
        
        # Channel subscriptions
        self.subscriptions: Dict[str, Set[str]] = defaultdict(set)
        
        # Batch manager for performance
        self.enable_batching = enable_batching
        self.batch_manager: Optional[WebSocketBatchManager] = None
        
        if enable_batching:
            self.batch_manager = ws_batch_manager
            # Set flush callback
            self.batch_manager.flush_callback = self._send_batch_to_session
            # Start background flusher
            self.batch_manager.start()
        
        # Metrics
        self.metrics = {
            'messages_sent': 0,
            'messages_received': 0,
            'connections_total': 0,
            'errors_total': 0,
            'rate_limit_hits': 0
        }
        
        logger.info(
            f"WebSocketManager initialized "
            f"(batching: {enable_batching}, "
            f"rate_limit: {self.rate_limit_enabled})"

        )
    
    # ==================== CONNECTION MANAGEMENT ====================
    
    async def connect(
        self, 
        websocket: WebSocket, 
        session_id: str, 
        connection_id: Optional[str] = None
    ):
        """
        Accept and register a WebSocket connection
        
        Supports multiple connections per session (e.g., multiple tabs)
        """
        await websocket.accept()
        
        if not connection_id:
            connection_id = f"{session_id}_{int(time.time()*1000)}"
        
        self.pool.add_connection(session_id, websocket, connection_id)
        self.metrics['connections_total'] += 1
        
        logger.info(
            f"WebSocket connected: session={session_id}, "
            f"connection={connection_id}, "
            f"total_for_session={len(self.pool.get_connections(session_id))}"
        )
        
        # Send welcome message directly (bypass batching)
        await self._send_direct(websocket, {
            'type': 'connected',
            'session_id': session_id,
            'connection_id': connection_id,
            'timestamp': datetime.utcnow().isoformat(),
            'batching_enabled': self.enable_batching
        })
        
        # Process any queued messages
        await self.process_queue(session_id)
    
    def disconnect(self, session_id: str, websocket: Optional[WebSocket] = None):
        """
        Remove a WebSocket connection
        
        If websocket provided: remove that specific connection
        If websocket None: remove all connections for session
        """
        if websocket:
            # Flush pending batches for this session
            if self.enable_batching and self.batch_manager:
                asyncio.create_task(self.batch_manager.flush_session(session_id))
            
            self.pool.remove_connection(session_id, websocket)
            logger.info(f"WebSocket disconnected: session={session_id}")
        else:
            # Disconnect all connections for the session
            connections = self.pool.get_connections(session_id)
            for ws in connections:
                self.pool.remove_connection(session_id, ws)
            logger.info(f"All WebSockets disconnected for session: {session_id}")
    
    def is_connected(self, session_id: str) -> bool:
        """Check if session has any active connections"""
        return len(self.pool.get_connections(session_id)) > 0
    
    # ==================== MESSAGE SENDING ====================
    
    async def _send_direct(self, websocket: WebSocket, message: Dict[str, Any]) -> bool:
        """
        Send message directly to a specific WebSocket
        
        Returns True if successful, False if failed
        """
        try:
            # Check if websocket is still open
            if websocket.client_state.value != 1:  # 1 = CONNECTED
                logger.warning(f"WebSocket not connected (state: {websocket.client_state.name})")
                return False
            
            await websocket.send_json(message)
            self.metrics['messages_sent'] += 1
            return True
        
        except RuntimeError as e:
            if "WebSocket is not connected" in str(e):
                logger.warning(f"Attempted to send to disconnected WebSocket")
                # Find and remove this connection
                for session_id in list(self.pool.connections.keys()):
                    if websocket in self.pool.connections[session_id]:
                        self.pool.remove_connection(session_id, websocket)
                        break
            else:
                logger.error(f"RuntimeError sending to connection: {e}")
            self.metrics['errors_total'] += 1
            return False
        
        except Exception as e:
            logger.error(f"Error sending to connection: {e}")
            self.metrics['errors_total'] += 1
            return False
    
    async def send_to_session(
        self, 
        session_id: str, 
        message: Dict[str, Any],
        priority: str = 'normal',
        immediate: bool = False
    ):
        """
        Send message to first active connection of a session
        
        With batching support for performance
        """
        # Disable batching for streaming events
        message_type = message.get('type', '')

        # Only rate limit non-streaming messages
        is_streaming = message_type in ['chat_stream', 'chat_complete', 'chat_error']
               
        if is_streaming:
            immediate = True

        has_request_id = 'request_id' in message
        
        is_response = (
            message_type == 'response' or 
            message_type == 'batch_response' or
            message_type == 'error' or
            message_type == 'batch_error' or
            has_request_id
        )
        
        if is_response:
            # Force immediate for responses
            immediate = True
            logger.debug(f"Response message detected, bypassing batch: {message_type}")


        # Only rate limit non immediate (non-streaming, non-response) messages
        if not immediate and self.rate_limit_enabled:
            if not self._check_rate_limit(session_id):
                logger.warning(f"Rate limit exceeded for session: {session_id}")
                self.metrics['rate_limit_hits'] += 1
                return
        
        connections = self.pool.get_connections(session_id)
        
        if not connections:
            # Queue message if no connections
            logger.debug(f"No connections for {session_id}, queueing message")
            self.queue_message(session_id, message)
            return
        
        

        # Use batching if enabled and not immediate
        if self.enable_batching and self.batch_manager and not immediate:
            await self.batch_manager.add_message(
                session_id=session_id,
                message=message,
                priority=priority,
                immediate=immediate
            )
        else:
            # Send immediately to first connection
            connections = self.pool.get_connections(session_id)
            
            if not connections:
                logger.warning(f"No connections for {session_id} when sending immediate")
                return
            
            # Send to first connection
            websocket = connections[0]
            success = await self._send_direct(websocket, message)
                        
            if not success:
                # Try other connections
                for ws in connections[1:]:
                    if await self._send_direct(ws, message):
                        break
    
    async def _send_batch_to_session(
        self, 
        session_id: str, 
        batch_message: Dict[str, Any]
    ):
        """
        Internal: Callback for batch manager to send batched messages
        """
        connections = self.pool.get_connections(session_id)
        
        if not connections:
            logger.warning(f"No connections for {session_id} when flushing batch")
            return
        
        # Send to first connection
        websocket = connections[0]
        success = await self._send_direct(websocket, batch_message)
        
        # If failed, try other connections
        if not success:
            for ws in connections[1:]:
                if await self._send_direct(ws, batch_message):
                    break
    
    async def broadcast_to_session(self, session_id: str, message: Dict[str, Any]):
        """
        Broadcast message to ALL connections of a session
        
        Useful for multi-tab synchronization
        """
        connections = self.pool.get_connections(session_id)
        
        if not connections:
            self.queue_message(session_id, message)
            return
        
        # Send to all connections
        tasks = []
        for ws in connections:
            tasks.append(self._send_direct(ws, message))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Clean up failed connections
        for ws, success in zip(connections, results):
            if not success:
                self.pool.remove_connection(session_id, ws)
    
    # ==================== HANDLER ROUTING ====================
    
    def register_handler(self, message_type: str, handler: Callable):
        """
       Register a message handler
        
        This is called by YOUR handlers.py: register_handlers()
        """
        self.handlers[message_type] = handler
        logger.debug(f"Registered handler: {message_type}")
    
    def _check_rate_limit(self, session_id: str, max_requests: int = None) -> bool:
        """
        Check rate limits
        
        Args:
            session_id: Session to check
            max_requests: Override default limit (optional)
        
        Returns:
            True if under limit, False if exceeded
        """
        # If rate limiting is disabled globally, always pass
        if not self.rate_limit_enabled:
            return True
        
        # Use provided limit or default
        limit = max_requests if max_requests is not None else self.rate_limit_max
        
        now = time.time()
        limits = self.rate_limits[session_id]
        
        # Reset counter if window expired
        if now > limits['reset_at']:
            limits['count'] = 0
            limits['reset_at'] = now + 60

        # Check if over limit
        if limits['count'] >= limit:
            return False
        
        # Increment counter
        limits['count'] += 1
        return True
    
    async def handle_message(
        self, 
        session_id: str, 
        message: dict, 
        websocket: Optional[WebSocket] = None
    ):
        """
       Route message to handler
        
        This is called by YOUR websocket.py router
        """
        # Check rate limit
        if self.rate_limit_enabled:
            if not self._check_rate_limit(session_id):
                await self.send_to_session(session_id, {
                    'type': 'error',
                    'error': 'Rate limit exceeded',
                    'retry_after': 60
                }, immediate=True)
                return
        
        message_type = message.get('type')
        
        if not message_type:
            await self.send_to_session(session_id, {
                'type': 'error',
                'error': 'Message type required'
            }, immediate=True)
            return
        
        handler = self.handlers.get(message_type)
        
        if not handler:
            logger.warning(f"No handler for: {message_type}")
            
            # Send error if request_id present
            request_id = message.get('request_id')
            if request_id:
                await self.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': f'No handler for: {message_type}'
                }, immediate=True)
            return
        
        # Execute handler
        try:
            self.metrics['messages_received'] += 1
            await handler(session_id, message)
        except Exception as e:
            logger.error(f"Handler error ({message_type}): {e}", exc_info=True)
            self.metrics['errors_total'] += 1
            
            # Send error response if request_id present
            request_id = message.get('request_id')
            if request_id:
                await self.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': str(e)
                }, immediate=True)
    
    # ==================== MESSAGE QUEUING ====================
    
    def queue_message(self, session_id: str, message: Dict[str, Any]):
        """Queue message for offline session"""
        if len(self.message_queue[session_id]) < self.max_queue_size:
            self.message_queue[session_id].append(message)
        else:
            logger.warning(f"Message queue full for session: {session_id}")
    
    async def process_queue(self, session_id: str):
        """Process queued messages when session reconnects"""
        if session_id not in self.message_queue:
            return
        
        messages = self.message_queue[session_id]
        self.message_queue[session_id] = []
        
        logger.info(f"Processing {len(messages)} queued messages for {session_id}")
        
        for message in messages:
            await self.send_to_session(session_id, message)
    
    # ==================== SUBSCRIPTIONS ====================
    
    def subscribe(self, session_id: str, channel: str):
        """Subscribe session to a channel"""
        self.subscriptions[session_id].add(channel)
        logger.debug(f"Session {session_id} subscribed to {channel}")
    
    def unsubscribe(self, session_id: str, channel: str):
        """Unsubscribe session from a channel"""
        if session_id in self.subscriptions:
            self.subscriptions[session_id].discard(channel)
            logger.debug(f"Session {session_id} unsubscribed from {channel}")
    
    async def broadcast_to_channel(
        self,
        channel: str,
        message: Dict[str, Any],
        priority: str = 'normal'
    ):
        """Broadcast message to all subscribers of a channel"""
        subscribers = [
            sid for sid, channels in self.subscriptions.items()
            if channel in channels
        ]
        
        if subscribers:
            tasks = [
                self.send_to_session(sid, message, priority)
                for sid in subscribers
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
    
    # ==================== HEALTH & MONITORING ====================

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all connections"""
        healthy = 0
        unhealthy = 0
        
        for session_id in list(self.pool.get_all_sessions()):
            connections = self.pool.get_connections(session_id)
            for ws in connections:
                try:
                    # Try to send ping
                    success = await self._send_direct(ws, {'type': 'ping'})
                    if success:
                        healthy += 1
                    else:
                        unhealthy += 1
                        self.pool.remove_connection(session_id, ws)
                except:
                    unhealthy += 1
                    self.pool.remove_connection(session_id, ws)
        
        return {
            'healthy_connections': healthy,
            'unhealthy_connections': unhealthy,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    # ==================== ORCHESTRATOR INTEGRATION ====================
    
    async def send_execution_progress(
        self,
        session_id: str,
        execution_id: int,
        event_type: str,
        data: Dict[str, Any],
        priority: str = 'normal'
    ):
        """Send execution progress update"""
        message = {
            'type': 'execution_progress',
            'event_type': event_type,
            'execution_id': execution_id,
            'timestamp': datetime.utcnow().isoformat(),
            'data': data
        }
        
        # High priority for critical events
        if event_type in ['execution_failed', 'execution_cancelled', 'error']:
            priority = 'high'
            immediate = True
        else:
            immediate = False
        
        await self.send_to_session(session_id, message, priority, immediate)
    
    async def send_node_progress(
        self,
        session_id: str,
        execution_id: int,
        node_id: str,
        step_number: int,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        node_label: Optional[str] = None
    ):
        """Send node execution progress"""
        message = {
            'type': 'node_progress',
            'execution_id': execution_id,
            'node_id': node_id,
            'node_label': node_label,
            'step_number': step_number,
            'status': status,
            'timestamp': datetime.utcnow().isoformat(),
            'result': result
        }
        
        await self.send_to_session(session_id, message, priority='normal')
    
    async def send_agent_decision(
        self,
        session_id: str,
        execution_id: int,
        step_number: int,
        decision: Dict[str, Any]
    ):
        """Send AI agent decision update"""
        message = {
            'type': 'agent_decision',
            'execution_id': execution_id,
            'step_number': step_number,
            'timestamp': datetime.utcnow().isoformat(),
            'decision': decision
        }
        
        await self.send_to_session(session_id, message, priority='normal')
    
    async def send_agent_thinking(
        self,
        session_id: str,
        execution_id: int,
        thinking: Dict[str, Any]
    ):
        """Send agent thinking/reasoning update"""
        message = {
            'type': 'agent_thinking',
            'execution_id': execution_id,
            'timestamp': datetime.utcnow().isoformat(),
            'thinking': thinking
        }
        
        await self.send_to_session(session_id, message, priority='normal')
    
    # ==================== BATCH CONTROL ====================
    
    async def flush_session_batches(self, session_id: str) -> int:
        """Manually flush all batched messages for a session"""
        if self.enable_batching and self.batch_manager:
            return await self.batch_manager.flush_session(session_id)
        return 0
    
    async def flush_all_batches(self) -> int:
        """Flush all pending batches"""
        if self.enable_batching and self.batch_manager:
            return await self.batch_manager.flush_all()
        return 0
    
    # ==================== METRICS  ====================
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return self.pool.get_connection_count()
    
    def get_session_count(self) -> int:
        """Get number of active sessions"""
        return self.pool.get_session_count()
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics"""
        metrics = {
            'active_sessions': self.pool.get_session_count(),
            'active_connections': self.pool.get_connection_count(),
            'total_subscriptions': sum(len(subs) for subs in self.subscriptions.values()),
            'queued_messages': sum(len(msgs) for msgs in self.message_queue.values()),
            **self.metrics
        }
        
        # Add batch manager metrics
        if self.enable_batching and self.batch_manager:
            metrics['batching'] = self.batch_manager.get_metrics()
        
        return metrics
    
    # ==================== SHUTDOWN ====================
    
    async def shutdown(self):
        """Cleanup on shutdown"""
        logger.info("Shutting down WebSocketManager")
        
        # Flush all pending batches
        if self.enable_batching and self.batch_manager:
            await self.batch_manager.stop()
        
        # Close all connections
        for session_id in list(self.pool.get_all_sessions()):
            connections = self.pool.get_connections(session_id)
            for websocket in connections:
                try:
                    await websocket.close()
                except:
                    pass
                self.pool.remove_connection(session_id, websocket)


# Global instance
ws_manager = WebSocketManager(enable_batching=True)