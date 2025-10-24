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
    handle_execution_cancel,
    handle_session_update,
    handle_session_get,
    handle_session_end,
    handle_chat_history_request,
    handle_chat_clear,
    handle_track_batch,
    handle_get_interactions,
    handle_batch_request,
    handle_get_reviews,
    handle_get_review_stats,
    handle_get_review_by_id,
    register_handlers
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
    'handle_session_update',
    'handle_session_get',
    'handle_session_end',
    'handle_chat_history_request',
    'handle_chat_clear',
    'handle_track_batch',
    'handle_get_interactions',
    'handle_batch_request',
    'handle_get_reviews',
    'handle_get_review_stats',
    'handle_get_review_by_id',
    'register_handlers'
]

__version__ = '1.0.1'