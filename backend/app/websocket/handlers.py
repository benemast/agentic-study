# backend/app/websocket/handlers.py
from datetime import datetime, timezone
import logging
import traceback
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import asyncio
import httpx

from app.database import get_db_context
from app.models.session import Session as SessionModel, Interaction
from app.models.ai_chat import ChatMessage, ChatConversation
from app.websocket.manager import ws_manager
from app.config import settings

logger = logging.getLogger(__name__)

# ============================================================
# SESSION OPERATIONS
# ============================================================
async def handle_session_get(session_id: str, message: dict):
    """Get session details via WebSocket"""
    request_id = message.get('request_id')

    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if not session:
                await ws_manager.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': 'Session not found'
                })
                return
            
            # Get interaction count
            interaction_count = db.query(Interaction).filter(
                Interaction.session_id == session_id
            ).count()
            
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'session_id': session.session_id,
                    'participant_id': session.participant_id,
                    'start_time': session.start_time.isoformat(),
                    'end_time': session.end_time.isoformat() if session.end_time else None,
                    'last_activity': session.last_activity.isoformat(),
                    'connection_status': session.connection_status,
                    'session_data': session.session_data,
                    'interaction_count': interaction_count
                }
            })
        
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })

async def handle_session_update(session_id: str, message: dict):
    """Handle session update via WebSocket"""
    request_id = message.get('request_id')
    
    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if not session:
                await ws_manager.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': 'Session not found'
                })
                return
            
            data = message.get('data', {})
            if 'session_data' in data:
                # Merge session data
                if session.session_data:
                    session.session_data = {**session.session_data, **data['session_data']}
                else:
                    session.session_data = data['session_data']
            
            if 'participant_id' in data:
                session.participant_id = data['participant_id']
            
            if 'connection_status' in data:
                session.connection_status = data['connection_status']
            
            session.last_activity = datetime.now(timezone.utc)
            
            # Send success response
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'session_id': session.session_id,
                    'updated_at': session.last_activity.isoformat(),
                    'session_data': session.session_data
                }
            })
        
    except Exception as e:
        logger.error(f"Error updating session: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })

async def handle_session_sync(session_id: str, message: dict):
    """Handle session data sync"""
    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if not session:
                await ws_manager.send_to_session(session_id, {
                    'type': 'error',
                    'error': 'Session not found'
                })
                return
            
            # Update session data
            sync_data = message.get('data', {})
            if sync_data:
                session.session_data = sync_data
                session.last_activity = datetime.utcnow()
            
            await ws_manager.send_to_session(session_id, {
                'type': 'session_synced',
                'timestamp': datetime.utcnow().isoformat()
            })
    
    except Exception as e:
        logger.error(f"Error in session sync: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'error',
            'error': str(e)
        })

async def handle_session_end(session_id: str, message: dict):
    """End session via WebSocket"""
    request_id = message.get('request_id')
    
    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if not session:
                await ws_manager.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': 'Session not found'
                })
                return
            
            # End session
            session.end_time = datetime.now(timezone.utc)
            session.connection_status = 'completed'
            
            # Update with any final data
            end_data = message.get('data', {})
            if 'session_data' in end_data:
                session.session_data = {
                    **session.session_data,
                    **end_data['session_data']
                }
            
            duration = (session.end_time - session.start_time).total_seconds()
            
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'session_id': session.session_id,
                    'end_time': session.end_time.isoformat(),
                    'duration_seconds': duration
                }
            })
            
            # Disconnect WebSocket after ending session
            await asyncio.sleep(0.5)  # Give time for response to be sent
            ws_manager.disconnect(session_id)
        
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })

async def handle_session_heartbeat(session_id: str, message: dict):
    """Handle session heartbeat"""
    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if session:
                session.last_activity = datetime.utcnow()
                session.connection_status = 'online'
            
            await ws_manager.send_to_session(session_id, {
                'type': 'heartbeat_ack',
                'timestamp': datetime.utcnow().isoformat()
            })
    
    except Exception as e:
        logger.error(f"Error in heartbeat: {e}")

# ============================================================
# CHAT OPERATIONS
# ============================================================

async def handle_chat_message(session_id: str, message: dict):
    """
    Handle chat message via WebSocket
    Streams AI response back in real-time
    """
    request_id = message.get('request_id')
    
    try:
        with get_db_context() as db:
            # Verify session exists
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if not session:
                await ws_manager.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': 'Session not found'
                })
                return
            
            # Get or create conversation
            conversation = db.query(ChatConversation).filter(
                ChatConversation.session_id == session_id
            ).first()
            
            if not conversation:
                conversation = ChatConversation(
                    session_id=session_id,
                    started_at=datetime.utcnow(),
                    message_count=0,
                    total_user_messages=0,
                    total_assistant_messages=0,
                    total_tokens_used=0
                )
                db.add(conversation)
                db.flush()
            
            # Save user message
            user_message = ChatMessage(
                session_id=session_id,
                conversation_id=conversation.id,
                role='user',
                content=message.get('content', ''),
                timestamp=datetime.utcnow()
            )
            db.add(user_message)
            
            # Update conversation stats
            conversation.message_count += 1
            conversation.total_user_messages += 1
            conversation.last_message_at = datetime.utcnow()
            
            # Send acknowledgment
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'message_id': user_message.id,
                    'timestamp': user_message.timestamp.isoformat()
                }
            })

            context_messages = message.get('messages', [])
            
            # Stream AI response
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    settings.openai_api_url,
                    headers={
                        "Authorization": f"Bearer {settings.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.llm_model,
                        "messages": context_messages + [{"role": "user", "content": user_message}],
                        "stream": True,
                        "max_tokens": settings.default_max_tokens
                    },
                    timeout=60.0
                )
                
                full_content = ''
                
                async for line in response.aiter_lines():
                    if line.startswith('data: '):
                        data = line[6:]
                        
                        if data.strip() == '[DONE]':
                            break
                        
                        try:
                            import json
                            parsed = json.loads(data)
                            
                            if parsed.get('choices'):
                                delta = parsed['choices'][0].get('delta', {})
                                content = delta.get('content', '')
                                
                                if content:
                                    full_content += content
                                    
                                    # Stream chunk to client
                                    await ws_manager.send_to_session(session_id, {
                                        'type': 'chat_stream',
                                        'content': content,
                                        'full_content': full_content
                                    })
                        except:
                            continue
                
                # Save complete assistant message
                assistant_message = ChatMessage(
                    session_id=session_id,
                    role='assistant',
                    content=full_content,
                    timestamp=datetime.utcnow()
                )
                db.add(assistant_message)
                
                # Send completion
                await ws_manager.send_to_session(session_id, {
                    'type': 'chat_complete',
                    'content': full_content,
                    'message_id': assistant_message.id
                })
        
    except Exception as e:
        logger.error(f"Error in chat handler: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'chat_error',
            'error': str(e)
        })

async def handle_chat_message_update(session_id: str, message: dict):
    """Update/edit a chat message"""
    request_id = message.get('request_id')
    message_id = message.get('message_id')
    new_content = message.get('content')
    
    try:
        with get_db_context() as db:
            chat_message = db.query(ChatMessage).filter(
                ChatMessage.id == message_id,
                ChatMessage.session_id == session_id
            ).first()
            
            if not chat_message:
                await ws_manager.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': 'Message not found'
                })
                return
            
            # Update fields
            if 'content' in message:
                chat_message.content = message['content']
            if 'tokens_used' in message:
                chat_message.tokens_used = message['tokens_used']
            if 'model_used' in message:
                chat_message.model_used = message['model_used']
            
            chat_message.message_metadata['edited'] = True
            chat_message.message_metadata['edited_at'] = datetime.now(timezone.utc).isoformat()
            
            # Broadcast update to all connected clients for this session
            await ws_manager.broadcast_to_session(session_id, {
                'type': 'chat_message_updated',
                'message_id': message_id,
                'content': new_content,
                'edited': True,
                'edited_at': chat_message.edited_at.isoformat()
            })
            
            # Send response to requester
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'message_id': message_id,
                    'updated': True
                }
            })
        
    except Exception as e:
        logger.error(f"Error updating chat message: {e}")
        logger.error(traceback.format_exc())
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'data': {'message_id': message_id}
        })
        raise

async def handle_chat_history_request(session_id: str, message: dict):
    """Get chat history via WebSocket with caching"""
    request_id = message.get('request_id')
    limit = message.get('limit', 50)
    offset = message.get('offset', 0)
    
    try:
        with get_db_context() as db:
            # Get messages with pagination
            messages = db.query(ChatMessage).filter(
                ChatMessage.session_id == session_id
            ).order_by(
                ChatMessage.timestamp.desc()
            ).offset(offset).limit(limit).all()
            
            # Reverse to get chronological order
            messages = list(reversed(messages))
            
            # Get conversation metadata
            conversation = db.query(ChatConversation).filter(
                ChatConversation.session_id == session_id
            ).first()
            
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'messages': [
                        {
                            'id': msg.id,
                            'role': msg.role,
                            'content': msg.content,
                            'timestamp': msg.timestamp.isoformat(),
                            'edited': getattr(msg, 'edited', False),
                            'metadata': msg.message_metadata
                        }
                        for msg in messages
                    ],
                    'total_messages': conversation.message_count if conversation else 0,
                    'has_more': len(messages) == limit,
                    'offset': offset,
                    'limit': limit
                }
            })
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })

async def handle_chat_clear(session_id: str, message: dict):
    """Clear chat history via WebSocket"""
    request_id = message.get('request_id')
    
    try:
        with get_db_context() as db:
            # Delete all messages for session
            deleted_count = db.query(ChatMessage).filter(
                ChatMessage.session_id == session_id
            ).delete()
            
            # Reset conversation metadata
            conversation = db.query(ChatConversation).filter(
                ChatConversation.session_id == session_id
            ).first()
            
            if conversation:
                conversation.message_count = 0
                conversation.total_user_messages = 0
                conversation.total_assistant_messages = 0
                conversation.total_tokens_used = 0
            
            
        # Broadcast clear event to all connected clients
        await ws_manager.broadcast_to_session(session_id, {
            'type': 'chat_cleared',
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'data': {
                'messages_cleared': deleted_count
            }
        })
        
    except Exception as e:
        logger.error(f"Error clearing chat: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })

# ============================================================
# PHASE 3: TRACKING/ANALYTICS
# ============================================================

async def handle_tracking_event(session_id: str, message: dict):
    """Handle analytics tracking event"""
    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if not session:
                logger.warning(f"Session not found for tracking: {session_id}")
                return
            
            event_type = message.get('event_type')
            event_data = message.get('event_data', {})
            current_view = message.get('current_view')
            
            # Create interaction record
            interaction = Interaction(
                session_id=session_id,
                timestamp=datetime.utcnow(),
                event_type=event_type,
                event_data=event_data,
                current_view=current_view
            )
            db.add(interaction)
            
            # Update session activity
            session.last_activity = datetime.utcnow()
            session.connection_status = "online"
                        
            await ws_manager.send_to_session(session_id, {
                'type': 'track_ack',
                'event_type': event_type
            })
    
    except Exception as e:
        logger.error(f"Error in tracking: {e}")
        logger.error(traceback.format_exc())  

async def handle_track_batch(session_id: str, message: dict):
    """Handle batch tracking events"""
    request_id = message.get('request_id')
    events = message.get('events', [])
    
    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if not session:
                await ws_manager.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'error',
                    'error': 'Session not found'
                })
                return
            
            # Process batch of events
            interactions = []
            for event in events:
                interaction = Interaction(
                    session_id=session_id,
                    timestamp=datetime.fromisoformat(event.get('timestamp')),
                    event_type=event.get('event_type'),
                    event_data=event.get('event_data', {}),
                    current_view=event.get('current_view', 'unknown')
                )
                interactions.append(interaction)
            
            db.bulk_save_objects(interactions)
            session.last_activity = datetime.utcnow()
            
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'events_tracked': len(interactions),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            })
        
    except Exception as e:
        logger.error(f"Error processing batch events: {e}")
        db.rollback()
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })

async def handle_get_interactions(session_id: str, message: dict):
    """Get interactions via WebSocket"""
    request_id = message.get('request_id')
    limit = message.get('limit', 100)
    offset = message.get('offset', 0)
    event_type = message.get('event_type')
    
    try:
        with get_db_context() as db:
            query = db.query(Interaction).filter(
                Interaction.session_id == session_id
            )
            
            if event_type:
                query = query.filter(Interaction.event_type == event_type)
            
            interactions = query.order_by(
                Interaction.timestamp.desc()
            ).offset(offset).limit(limit).all()
            
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'interactions': [
                        {
                            'id': i.id,
                            'timestamp': i.timestamp.isoformat(),
                            'event_type': i.event_type,
                            'event_data': i.event_data,
                            'current_view': i.current_view
                        }
                        for i in interactions
                    ],
                    'count': len(interactions),
                    'offset': offset,
                    'limit': limit
                }
            })
        
    except Exception as e:
        logger.error(f"Error getting interactions: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })

# ============================================================
# MISC OPERATIONS
# ============================================================

async def handle_batch_request(session_id: str, message: dict):
    """Handle batched requests for efficiency"""
    batch_id = message.get('batch_id')
    requests = message.get('requests', [])
    
    results = []
    
    for req in requests:
        req_type = req.get('type')
        req_id = req.get('request_id')
        
        try:
            # Route to appropriate handler
            if req_type == 'session_update':
                await handle_session_update(session_id, req)
            elif req_type == 'session_get':
                await handle_session_get(session_id, req)
            elif req_type == 'chat_history':
                await handle_chat_history_request(session_id, req)
            elif req_type == 'track':
                await handle_tracking_event(session_id, req)
            else:
                results.append({
                    'request_id': req_id,
                    'status': 'error',
                    'error': f'Unknown request type: {req_type}'
                })
        except Exception as e:
            results.append({
                'request_id': req_id,
                'status': 'error',
                'error': str(e)
            })
    
    # Send batch response
    await ws_manager.send_to_session(session_id, {
        'type': 'batch_response',
        'batch_id': batch_id,
        'results': results,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

# ============================================================
# WORKFLOW OPERATIONS
# ============================================================

async def handle_workflow_execute(session_id: str, message: dict):
    """Handle workflow execution request"""
    from app.orchestrator.service import orchestrator
    
    try:
        with get_db_context() as db:
            workflow = message.get('workflow')
            input_data = message.get('input_data', {})
            condition = message.get('condition', 'workflow_builder')
            
            # Subscribe to execution channel
            await ws_manager.subscribe(session_id, 'execution')
            
            # Start execution (this will send progress via WebSocket)
            execution = await orchestrator.execute_workflow(
                db=db,
                session_id=session_id,
                condition=condition,
                task_data={
                    'workflow': workflow,
                    'input_data': input_data
                }
            )
            
            await ws_manager.send_to_session(session_id, {
                'type': 'execution_started',
                'execution_id': execution.id
            })
    
    except Exception as e:
        logger.error(f"Error starting execution: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'execution_error',
            'error': str(e)
        })

async def handle_execution_cancel(session_id: str, message: dict):
    """Handle execution cancellation"""
    from app.orchestrator.service import orchestrator
    
    try:
        execution_id = message.get('execution_id')
        
        
        if not execution_id:
            await ws_manager.send_to_session(session_id, {
                'type': 'error',
                'error': 'execution_id is required'
            })
            return
        
        with get_db_context() as db:
            success = await orchestrator.cancel_execution(db, execution_id)
            
            await ws_manager.send_to_session(session_id, {
                'type': 'execution_cancelled' if success else 'execution_cancel_failed',
                'execution_id': execution_id
            })
    
    except Exception as e:
        logger.error(f"Error cancelling execution: {e}")
        await ws_manager.send_to_session(session_id, {
            'type': 'error',
            'error': str(e)
        })

def register_handlers():
    """Register all WebSocket handlers with the manager"""
    # Session Operations
    ws_manager.register_handler('session_get', handle_session_get)
    ws_manager.register_handler('session_update', handle_session_update)
    ws_manager.register_handler('session_end', handle_session_end)
    ws_manager.register_handler('session_sync', handle_session_sync)
    ws_manager.register_handler('heartbeat', handle_session_heartbeat)
    
    # Chat Operations
    ws_manager.register_handler('chat', handle_chat_message)
    ws_manager.register_handler('chat_update', handle_chat_message_update)
    ws_manager.register_handler('chat_history', handle_chat_history_request)
    ws_manager.register_handler('chat_clear', handle_chat_clear)
    
    # Tracking Operations
    ws_manager.register_handler('track', handle_tracking_event)
    ws_manager.register_handler('track_batch', handle_track_batch)
    ws_manager.register_handler('get_interactions', handle_get_interactions)

    # Workflow Operations
    ws_manager.register_handler('execute', handle_workflow_execute)
    ws_manager.register_handler('execution_cancel', handle_execution_cancel)
    
    # Batching
    ws_manager.register_handler('batch', handle_batch_request)


def get_all_handlers():
    """Return all handlers to register with WebSocketManager"""
    return {
        # Session handlers
        'session_update': handle_session_update,
        'session_sync': handle_session_sync,
        'session_get': handle_session_get,
        'session_end': handle_session_end,
        'heartbeat': handle_session_heartbeat,
        
        # Tracking handlers
        'track': handle_tracking_event,
        'track_batch': handle_track_batch,
        
        # Chat handlers
        'chat': handle_chat_message,
        'chat_history': handle_chat_history_request,
        'chat_update': handle_chat_message_update,
        'chat_clear': handle_chat_clear,
        
        # Workflow handlers
        'workflow_execute': handle_workflow_execute,
        'execution_cancel': handle_execution_cancel,
    }