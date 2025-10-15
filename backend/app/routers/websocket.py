# backend/app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import logging
import json

from app.database import get_db
from app.websocket.manager import ws_manager
from app.websocket.handlers import (
    handle_chat_message,
    handle_session_sync,
    handle_session_heartbeat,
    handle_tracking_event,
    handle_workflow_execute,
    handle_execution_cancel
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Main WebSocket endpoint for real-time communication
    
    Handles:
    - Chat messages
    - Session sync
    - Heartbeats
    - Workflow execution
    - Analytics tracking
    """
    await ws_manager.connect(websocket, session_id)
    
    # Register message handlers
    ws_manager.register_handler('chat', handle_chat_message)
    ws_manager.register_handler('session_sync', handle_session_sync)
    ws_manager.register_handler('heartbeat', handle_session_heartbeat)
    ws_manager.register_handler('track', handle_tracking_event)
    ws_manager.register_handler('workflow_execute', handle_workflow_execute)
    ws_manager.register_handler('execution_cancel', handle_execution_cancel)
    
    try:
        # Main message loop
        while True:
            # Receive message
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await ws_manager.handle_message(session_id, message)
            except json.JSONDecodeError:
                await ws_manager.send_to_session(session_id, {
                    'type': 'error',
                    'error': 'Invalid JSON'
                })
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await ws_manager.send_to_session(session_id, {
                    'type': 'error',
                    'error': str(e)
                })
    
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id)
        logger.info(f"Client disconnected: {session_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}")
        ws_manager.disconnect(session_id)


# Legacy endpoint for execution progress (keep for backward compatibility)
@router.websocket("/execution/{session_id}")
async def execution_websocket(websocket: WebSocket, session_id: str):
    """
    Legacy WebSocket endpoint for execution progress
    Redirects to main WebSocket with execution channel subscription
    """
    await ws_manager.connect(websocket, session_id)
    await ws_manager.subscribe(session_id, 'execution')
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await ws_manager.handle_message(session_id, message)
    
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id)