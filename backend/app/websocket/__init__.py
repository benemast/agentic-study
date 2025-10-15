# backend/app/websocket/__init__.py
"""
WebSocket Communication Module

Provides real-time bidirectional communication between frontend and backend.

Key Components:
- WebSocketManager: Connection lifecycle management
- Message Handlers: Process different message types
- Routes: WebSocket endpoints

Features:
- Automatic reconnection
- Message queuing
- Channel subscriptions
- Heartbeat monitoring
"""

from .manager import WebSocketManager, ws_manager
from .handlers import (
    handle_chat_message,
    handle_session_sync,
    handle_session_heartbeat,
    handle_tracking_event,
    handle_workflow_execute,
    handle_execution_cancel
)

__all__ = [
    'WebSocketManager',
    'ws_manager',
    'handle_chat_message',
    'handle_session_sync',
    'handle_session_heartbeat',
    'handle_tracking_event',
    'handle_workflow_execute',
    'handle_execution_cancel',
]

__version__ = '1.0.0'