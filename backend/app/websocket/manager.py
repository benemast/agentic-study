# backend/app/websocket/manager.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Callable, Any
import json
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Centralized WebSocket connection manager
    
    Handles:
    - Connection lifecycle
    - Message routing
    - Broadcasting
    - Session management
    """
    
    def __init__(self):
        # session_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        
        # session_id -> set of subscribed channels
        self.subscriptions: Dict[str, Set[str]] = {}
        
        # channel -> handler function
        self.handlers: Dict[str, Callable] = {}
        
        logger.info("WebSocket Manager initialized")
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and register a WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.subscriptions[session_id] = set()
        
        logger.info(f"WebSocket connected: {session_id}")
        
        # Send welcome message
        await self.send_to_session(session_id, {
            'type': 'connected',
            'session_id': session_id,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def disconnect(self, session_id: str):
        """Remove a WebSocket connection"""
        if session_id in self.active_connections:
            self.active_connections.pop(session_id)
            self.subscriptions.pop(session_id, None)
            logger.info(f"WebSocket disconnected: {session_id}")
    
    def is_connected(self, session_id: str) -> bool:
        """Check if a session has an active connection"""
        return session_id in self.active_connections
    
    async def send_to_session(self, session_id: str, message: dict):
        """Send message to a specific session"""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to {session_id}: {e}")
                self.disconnect(session_id)
    
    async def broadcast(self, message: dict, exclude: Set[str] = None):
        """Broadcast message to all connected sessions"""
        exclude = exclude or set()
        
        for session_id, websocket in list(self.active_connections.items()):
            if session_id not in exclude:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {session_id}: {e}")
                    self.disconnect(session_id)
    
    async def subscribe(self, session_id: str, channel: str):
        """Subscribe a session to a channel"""
        if session_id in self.subscriptions:
            self.subscriptions[session_id].add(channel)
            await self.send_to_session(session_id, {
                'type': 'subscribed',
                'channel': channel
            })
            logger.debug(f"{session_id} subscribed to {channel}")
    
    async def unsubscribe(self, session_id: str, channel: str):
        """Unsubscribe a session from a channel"""
        if session_id in self.subscriptions:
            self.subscriptions[session_id].discard(channel)
            await self.send_to_session(session_id, {
                'type': 'unsubscribed',
                'channel': channel
            })
            logger.debug(f"{session_id} unsubscribed from {channel}")
    
    async def publish(self, channel: str, message: dict):
        """Publish message to all subscribers of a channel"""
        for session_id, channels in self.subscriptions.items():
            if channel in channels:
                message_with_channel = {
                    'channel': channel,
                    **message
                }
                await self.send_to_session(session_id, message_with_channel)
    
    def register_handler(self, message_type: str, handler: Callable):
        """Register a handler for a message type"""
        self.handlers[message_type] = handler
        logger.debug(f"Registered handler for: {message_type}")
    
    async def handle_message(self, session_id: str, message: dict):
        """Route incoming message to appropriate handler"""
        message_type = message.get('type')
        
        if not message_type:
            await self.send_to_session(session_id, {
                'type': 'error',
                'error': 'Message type is required'
            })
            return
        
        handler = self.handlers.get(message_type)
        
        if handler:
            try:
                await handler(session_id, message)
            except Exception as e:
                logger.error(f"Error handling {message_type}: {e}")
                await self.send_to_session(session_id, {
                    'type': 'error',
                    'error': str(e),
                    'original_type': message_type
                })
        else:
            logger.warning(f"No handler for message type: {message_type}")
            await self.send_to_session(session_id, {
                'type': 'error',
                'error': f'Unknown message type: {message_type}'
            })
    
    async def keep_alive(self, session_id: str):
        """Send periodic ping to keep connection alive"""
        while session_id in self.active_connections:
            try:
                await self.send_to_session(session_id, {
                    'type': 'ping',
                    'timestamp': datetime.utcnow().isoformat()
                })
                await asyncio.sleep(30)  # Ping every 30 seconds
            except:
                break


# Global WebSocket manager instance
ws_manager = WebSocketManager()