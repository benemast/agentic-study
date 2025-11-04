# backend/app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import json
import asyncio

from app.database import get_db
from app.websocket.manager import get_ws_manager

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
        
    Note: Handlers are registered at application startup in main.py
    """
    connection_id = f"{session_id}_{id(websocket)}"

    try:
        # Connect
        ws_manager = get_ws_manager()
        await ws_manager.connect(websocket, session_id, connection_id)
        
        logger.info(f"WebSocket connected: session={session_id}, connection={connection_id}")
    
        # Main message loop
        while True:
            try:
                # Receive message with timeout to prevent hanging
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=600.0  # 10 minute timeout for long-running workflows
                )
                
                # Parse and handle message
                try:
                    message = json.loads(data)
                    
                    # Log the message type for debugging
                    logger.debug(f"Received message type: {message.get('type')}, request_id: {message.get('request_id')}")

                    # Handle message through registered handlers
                    await ws_manager.handle_message(session_id, message, websocket)

                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received: {e}")
                    # Check connection before sending error
                    if websocket.client_state.value == 1:
                        try:
                            await websocket.send_json({
                                'type': 'error',
                                'error': 'Invalid JSON',
                                'details': str(e)
                            })
                        except:
                            break
                    
                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)
                    
                    # Try to send error response if connection is alive
                    if websocket.client_state.value == 1:
                        try:
                            error_response = {
                                'type': 'error',
                                'error': str(e),
                                'error_type': type(e).__name__
                            }
                            
                            if isinstance(message, dict) and 'request_id' in message:
                                error_response['request_id'] = message['request_id']
                                error_response['type'] = 'response'
                                error_response['status'] = 'error'
                            
                            await websocket.send_json(error_response)
                        except:
                            break
            
            # Handle timeout gracefully        
            except asyncio.TimeoutError:
                logger.debug(f"WebSocket timeout for session {session_id}, checking if still alive")
                # Check if connection is still valid
                if websocket.client_state.value != 1:
                    logger.info(f"WebSocket disconnected during timeout: {connection_id}")
                    break
                # Connection still alive, continue
                continue
                    
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected normally: {connection_id}")
                break
            
            # Catch RuntimeError for "WebSocket is not connected"    
            except RuntimeError as e:
                if "not connected" in str(e).lower():
                    logger.info(f"WebSocket already disconnected: {connection_id}")
                else:
                    logger.error(f"RuntimeError in message loop: {e}", exc_info=True)
                break
                
            except Exception as e:
                logger.error(f"Unexpected error in message loop: {e}", exc_info=True)
                break
    
    except Exception as e:
        logger.error(f"Error in WebSocket endpoint: {e}", exc_info=True)
        
    finally:
        # Clean up connection safely
        try:
            ws_manager.disconnect(session_id, websocket)
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
        logger.info(f"WebSocket cleaned up: session={session_id}, connection={connection_id}")