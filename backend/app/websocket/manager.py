# backend/app/websocket/manager.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Callable, Any, Optional, List
import json
import logging
import asyncio
from datetime import datetime
from collections import defaultdict
import time

logger = logging.getLogger(__name__)

class ConnectionPool:
    """Manage multiple connections per session (tabs/windows)"""
    
    def __init__(self):
        # session_id -> list of WebSocket connections
        self.connections: Dict[str, List[WebSocket]] = defaultdict(list)
        # connection_id -> session_id mapping
        self.connection_sessions: Dict[str, str] = {}
        # connection_id -> metadata
        self.connection_metadata: Dict[str, dict] = {}
    
    def add_connection(self, session_id: str, websocket: WebSocket, connection_id: str):
        """Add a connection to the pool"""
        self.connections[session_id].append(websocket)
        self.connection_sessions[connection_id] = session_id
        self.connection_metadata[connection_id] = {
            'connected_at': datetime.utcnow().isoformat(),
            'last_activity': time.time()
        }
    
    def remove_connection(self, session_id: str, websocket: WebSocket):
        """Remove a connection from the pool"""
        if session_id in self.connections:
            if websocket in self.connections[session_id]:
                self.connections[session_id].remove(websocket)
            
            # Clean up empty lists
            if not self.connections[session_id]:
                del self.connections[session_id]
        
        # Clean up metadata
        conn_id = None
        for cid, sid in list(self.connection_sessions.items()):
            if sid == session_id:
                conn_id = cid
                break
        
        if conn_id:
            del self.connection_sessions[conn_id]
            if conn_id in self.connection_metadata:
                del self.connection_metadata[conn_id]
    
    def get_connections(self, session_id: str) -> List[WebSocket]:
        """Get all connections for a session"""
        return self.connections.get(session_id, [])
    
    def get_all_sessions(self) -> Set[str]:
        """Get all active session IDs"""
        return set(self.connections.keys())


class WebSocketManager:
    """
    Enhanced WebSocket connection manager with:
    - Multiple connections per session
    - Broadcasting capabilities
    - Message queuing
    - Request-response pattern
    - Connection pooling
    - Rate limiting
    """
    
    def __init__(self):
        self.pool = ConnectionPool()
        self.handlers: Dict[str, Callable] = {}
        self.message_queue: Dict[str, List[dict]] = defaultdict(list)
        self.rate_limits: Dict[str, dict] = defaultdict(lambda: {'count': 0, 'reset_at': time.time() + 60})
        self.subscriptions: Dict[str, Set[str]] = defaultdict(set)
        
        # Metrics
        self.metrics = {
            'messages_sent': 0,
            'messages_received': 0,
            'connections_total': 0,
            'errors_total': 0
        }
        
        logger.info("Enhanced WebSocket Manager initialized")
    
    async def connect(self, websocket: WebSocket, session_id: str, connection_id: Optional[str] = None):
        """Accept and register a WebSocket connection"""
        await websocket.accept()
        
        if not connection_id:
            connection_id = f"{session_id}_{int(time.time()*1000)}"
        
        self.pool.add_connection(session_id, websocket, connection_id)
        self.metrics['connections_total'] += 1
        
        logger.info(f"WebSocket connected: session={session_id}, connection={connection_id}")
        
        # Send welcome message
        await self.send_to_connection(websocket, {
            'type': 'connected',
            'session_id': session_id,
            'connection_id': connection_id,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Send any queued messages
        await self.process_queue(session_id)
    
    def disconnect(self, session_id: str, websocket: Optional[WebSocket] = None):
        """Remove a WebSocket connection"""
        if websocket:
            self.pool.remove_connection(session_id, websocket)
            logger.info(f"WebSocket disconnected: session={session_id}")
        else:
            # Disconnect all connections for the session
            connections = self.pool.get_connections(session_id)
            for ws in connections:
                self.pool.remove_connection(session_id, ws)
            logger.info(f"All WebSockets disconnected for session: {session_id}")
    
    def is_connected(self, session_id: str) -> bool:
        """Check if a session has any active connections"""
        return len(self.pool.get_connections(session_id)) > 0
    
    async def send_to_connection(self, websocket: WebSocket, message: dict):
        """Send message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
            self.metrics['messages_sent'] += 1
        except Exception as e:
            logger.error(f"Error sending to connection: {e}")
            self.metrics['errors_total'] += 1
    
    async def send_to_session(self, session_id: str, message: dict):
        """Send message to first connection of a session"""
        connections = self.pool.get_connections(session_id)
        
        if not connections:
            # Queue message if no connections
            self.queue_message(session_id, message)
            return
        
        # Send to first connection
        await self.send_to_connection(connections[0], message)
    
    async def broadcast_to_session(self, session_id: str, message: dict):
        """Broadcast message to all connections of a session"""
        connections = self.pool.get_connections(session_id)
        
        if not connections:
            self.queue_message(session_id, message)
            return
        
        # Send to all connections concurrently
        tasks = [self.send_to_connection(ws, message) for ws in connections]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_to_all(self, message: dict, exclude_sessions: Optional[Set[str]] = None):
        """Broadcast message to all connected sessions"""
        exclude_sessions = exclude_sessions or set()
        
        tasks = []
        for session_id in self.pool.get_all_sessions():
            if session_id not in exclude_sessions:
                tasks.append(self.broadcast_to_session(session_id, message))
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    def queue_message(self, session_id: str, message: dict):
        """Queue a message for offline delivery"""
        self.message_queue[session_id].append({
            **message,
            'queued_at': datetime.utcnow().isoformat()
        })
        
        # Limit queue size
        if len(self.message_queue[session_id]) > 100:
            self.message_queue[session_id] = self.message_queue[session_id][-100:]
    
    async def process_queue(self, session_id: str):
        """Process queued messages for a session"""
        if session_id not in self.message_queue:
            return
        
        messages = self.message_queue.pop(session_id, [])
        
        for message in messages:
            await self.send_to_session(session_id, {
                **message,
                'from_queue': True
            })
    
    def register_handler(self, message_type: str, handler: Callable):
        """Register a message handler"""
        self.handlers[message_type] = handler
        logger.info(f"Registered handler for: {message_type}")
    
    def check_rate_limit(self, session_id: str, max_requests: int = 100) -> bool:
        """Check if session is within rate limits"""
        now = time.time()
        limits = self.rate_limits[session_id]
        
        # Reset if window expired
        if now > limits['reset_at']:
            limits['count'] = 0
            limits['reset_at'] = now + 60
        
        # Check limit
        if limits['count'] >= max_requests:
            return False
        
        limits['count'] += 1
        return True
    
    async def handle_message(self, session_id: str, message: dict, websocket: Optional[WebSocket] = None):
        """Route message to appropriate handler"""
        # Check rate limit
        if not self.check_rate_limit(session_id):
            await self.send_to_session(session_id, {
                'type': 'error',
                'error': 'Rate limit exceeded',
                'retry_after': 60
            })
            return
        
        message_type = message.get('type')
        
        if not message_type:
            await self.send_to_session(session_id, {
                'type': 'error',
                'error': 'Message type is required'
            })
            return
        
        handler = self.handlers.get(message_type)
        
        if not handler:
            await self.send_to_session(session_id, {
                'type': 'error',
                'error': f'No handler for message type: {message_type}'
            })
            return
        
        # Execute handler
        try:
            self.metrics['messages_received'] += 1
            await handler(session_id, message)
        except Exception as e:
            logger.error(f"Error in handler {message_type}: {e}")
            self.metrics['errors_total'] += 1
            
            await self.send_to_session(session_id, {
                'type': 'error',
                'error': str(e),
                'handler': message_type
            })
    
    def subscribe(self, session_id: str, channel: str):
        """Subscribe session to a channel"""
        self.subscriptions[session_id].add(channel)
    
    def unsubscribe(self, session_id: str, channel: str):
        """Unsubscribe session from a channel"""
        if session_id in self.subscriptions:
            self.subscriptions[session_id].discard(channel)
    
    async def publish_to_channel(self, channel: str, message: dict):
        """Publish message to all sessions subscribed to a channel"""
        tasks = []
        
        for session_id, channels in self.subscriptions.items():
            if channel in channels:
                tasks.append(self.broadcast_to_session(session_id, {
                    **message,
                    'channel': channel
                }))
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    def get_metrics(self) -> dict:
        """Get manager metrics"""
        return {
            **self.metrics,
            'active_sessions': len(self.pool.connections),
            'total_connections': sum(len(conns) for conns in self.pool.connections.values()),
            'queued_messages': sum(len(msgs) for msgs in self.message_queue.values())
        }
    
    async def health_check(self) -> dict:
        """Perform health check on all connections"""
        healthy = 0
        unhealthy = 0
        
        for session_id in list(self.pool.get_all_sessions()):
            connections = self.pool.get_connections(session_id)
            for ws in connections:
                try:
                    await ws.send_json({'type': 'ping'})
                    healthy += 1
                except:
                    unhealthy += 1
                    self.pool.remove_connection(session_id, ws)
        
        return {
            'healthy_connections': healthy,
            'unhealthy_connections': unhealthy,
            'timestamp': datetime.utcnow().isoformat()
        }


# Create singleton instance
ws_manager = WebSocketManager()