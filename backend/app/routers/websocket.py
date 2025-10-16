# backend/app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import logging
import json
import asyncio

from app.database import get_db
from app.websocket.manager import ws_manager
from app.websocket.handlers import (
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
    register_handlers
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

    connection_id = f"{session_id}_{id(websocket)}"

    try:
        # Connect
        await ws_manager.connect(websocket, session_id, connection_id)
        
        # IMPORTANT: Register ALL handlers
        # This should be done once globally, but we'll ensure it's done here
        if not ws_manager.handlers:
            logger.info("Registering WebSocket handlers...")
            
            # Session handlers
            ws_manager.register_handler('session_update', handle_session_update)
            ws_manager.register_handler('session_get', handle_session_get)
            ws_manager.register_handler('session_end', handle_session_end)
            ws_manager.register_handler('session_sync', handle_session_sync)
            ws_manager.register_handler('session_quicksave', handle_session_update)  # Alias
            
            # Heartbeat
            ws_manager.register_handler('heartbeat', handle_session_heartbeat)
            
            # Chat handlers
            ws_manager.register_handler('chat', handle_chat_message)
            ws_manager.register_handler('chat_history', handle_chat_history_request)
            ws_manager.register_handler('chat_clear', handle_chat_clear)
            ws_manager.register_handler('chat_save', handle_chat_message)
            
            # Tracking handlers
            ws_manager.register_handler('track', handle_tracking_event)
            ws_manager.register_handler('track_batch', handle_track_batch)
            ws_manager.register_handler('get_interactions', handle_get_interactions)
            
            # Workflow handlers
            ws_manager.register_handler('workflow_execute', handle_workflow_execute)
            ws_manager.register_handler('execution_cancel', handle_execution_cancel)
            
            # Batch handler
            ws_manager.register_handler('batch', handle_batch_request)
            
            logger.info(f"Registered {len(ws_manager.handlers)} handlers")
        
        logger.info(f"WebSocket connected: session={session_id}, connection={connection_id}")
    
        # Main message loop
        while True:
            try:
                # Receive message with timeout
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=None  # No timeout on receive
                )
                
                # Parse and handle message
                try:
                    message = json.loads(data)
                    
                    # Log the message type for debugging
                    logger.debug(f"Received message type: {message.get('type')}, request_id: {message.get('request_id')}")
                    
                    # Handle message
                    await ws_manager.handle_message(session_id, message, websocket)
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received: {e}")
                    await ws_manager.send_to_session(session_id, {
                        'type': 'error',
                        'error': 'Invalid JSON',
                        'details': str(e)
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)
                    
                    # Send error response with request_id if available
                    error_response = {
                        'type': 'error',
                        'error': str(e),
                        'error_type': type(e).__name__
                    }
                    
                    if 'request_id' in message:
                        error_response['request_id'] = message['request_id']
                        error_response['type'] = 'response'
                        error_response['status'] = 'error'
                    
                    await ws_manager.send_to_session(session_id, error_response)
                    
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected normally: {connection_id}")
                break
                
            except Exception as e:
                logger.error(f"Unexpected error in message loop: {e}", exc_info=True)
                break
    
    except Exception as e:
        logger.error(f"Error in WebSocket endpoint: {e}", exc_info=True)
        
    finally:
        # Clean up connection
        ws_manager.disconnect(session_id, websocket)
        logger.info(f"WebSocket cleaned up: session={session_id}, connection={connection_id}")


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