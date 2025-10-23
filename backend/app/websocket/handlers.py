# backend/app/websocket/handlers.py
from datetime import datetime, timezone
import time
import logging
import traceback
import json
from typing import Dict, Any, List
from sqlalchemy import null
from sqlalchemy.orm import Session
import asyncio
import httpx

from app.database import get_db_context
from app.models.session import Session as SessionModel, Interaction
from app.models.ai_chat import ChatMessage, ChatConversation
from app.websocket.manager import ws_manager
from app.config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO) 

# ============================================================
# UTILITY FUNCTIONS
# ============================================================


def parse_timestamp(value: Any) -> datetime:
    """
    Parse timestamp from various formats
    
    Handles:
    - ISO string with 'Z'
    - ISO string with timezone
    - datetime object
    - None (returns current time)
    
    Returns:
        datetime: Parsed timezone-aware datetime
    """
    if value is None:
        return datetime.now(timezone.utc).isoformat()
    
    if isinstance(value, datetime):
        # Already a datetime - ensure it has timezone
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    
    if isinstance(value, str):
        # Parse ISO string
        try:
            # Replace 'Z' with '+00:00' for ISO format
            cleaned = value.replace('Z', '+00:00')
            return datetime.fromisoformat(cleaned)
        except ValueError as e:
            logger.warning(f"Failed to parse timestamp '{value}': {e}")
            return datetime.now(timezone.utc).isoformat()
    
    # Unknown type
    logger.warning(f"Unexpected timestamp type: {type(value)}, using current time")
    return datetime.now(timezone.utc).isoformat()


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
    """
    Handle general session update via WebSocket
    
    Supports updating:
    - session_data
    - metadata
    - last_activity
    - connection_status
    - has_demographics
    """
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
            
            # Update session data if provided
            if 'session_data' in message:
                session.session_data = message['session_data']
            
            # Update metadata if provided
            if 'metadata' in message:
                current_metadata = session.session_metadata or {}
                current_metadata.update(message['metadata'])
                session.session_metadata = current_metadata
            
            last_activity = datetime.now(timezone.utc)
            # Update last activity
            if 'last_activity' in message:
                last_activity = parse_timestamp(message['last_activity'])
            session.last_activity = last_activity

            # Update connection status if provided
            if 'connection_status' in message:
                valid_statuses = ['online', 'offline', 'error']
                if message['connection_status'] in valid_statuses:
                    session.connection_status = message['connection_status']
            
            # Update has_demographics if provided
            if 'has_demographics' in message:
                session.has_demographics = message['has_demographics']
            
            if 'participant_id' in message:
                session.participant_id = message['participant_id']
            
            
        # Send success response
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'message': 'Session updated successfully',
            'session_id': session_id,
            'updated_at': last_activity.isoformat(),
        })
        
    except Exception as e:
        logger.error(f"Error updating session: {e}", exc_info=True)
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })


async def handle_session_quicksave(session_id: str, message: dict):
    """
    Handle quick save for session (non-blocking, page unload safe)
    
    Optimized for:
    - Page navigation/refresh
    - Browser close/unload
    - Frequent autosaves
    
    Features:
    - More forgiving error handling
    - Handles page_unload flag
    - Optimized for speed
    """
    request_id = message.get('request_id')
    
    try:
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            # Don't fail hard if session not found (might be quick-saving during logout)
            if not session:
                logger.warning(f"Quick save for non-existent session: {session_id}")
                await ws_manager.send_to_session(session_id, {
                    'type': 'response',
                    'request_id': request_id,
                    'status': 'success',  # Still return success
                    'message': 'Session not found, skipping quick save'
                })
                return
            
            # Update session data
            if 'session_data' in message:
                session.session_data = message['session_data']
            
            # Update last activity
            timestamp_field = message.get('quick_save_timestamp') or message.get('timestamp')
            if timestamp_field:
                session.last_activity = parse_timestamp(timestamp_field)
            else:
                session.last_activity = datetime.now(timezone.utc)
            
            # Handle page unload - set status to offline
            if message.get('page_unload'):
                session.connection_status = 'offline'
                logger.info(f"Session {session_id} marked offline (page unload)")
            else:
                # Quick save during active session - keep online
                session.connection_status = 'online'
            
            # Update metadata if provided
            if 'metadata' in message:
                current_metadata = session.session_metadata or {}
                current_metadata.update(message['metadata'])
                session.session_metadata = current_metadata
            
        # Send success response
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'message': 'Quick save completed',
            'quick_save': True
        })
        
        logger.debug(f"Quick save completed for session {session_id}")
            
    except Exception as e:
        # Log error but don't fail hard (quick save should be resilient)
        logger.error(f"Quick save error for session {session_id}: {e}", exc_info=True)
        
        # Still send success to not break frontend
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'message': 'Quick save completed with warnings',
            'warning': str(e)
        })


async def handle_session_sync(session_id: str, message: dict):
    """
    Handle session sync (periodic background sync)
    
    Similar to update but with specific sync semantics:
    - Always sets connection_status to 'online'
    - Requires session_data and sync_timestamp
    """
    request_id = message.get('request_id')

    try:
        # Validate required fields
        if 'session_data' not in message or 'sync_timestamp' not in message:
            await ws_manager.send_to_session(session_id, {
                'type': 'response',
                'request_id': request_id,
                'status': 'error',
                'error': 'session_data and sync_timestamp are required'
            })
            return
        
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
            
            # Update session data
            session.session_data = message['session_data']
            
            # Update last activity from sync timestamp
            timestamp = message['sync_timestamp']
            session.last_activity = parse_timestamp(timestamp)
            
            # Sync always means online
            session.connection_status = 'online'
            
            if not session.study_group:
                session.study_group = message.get('studyConfig', {}).get('group')

            # Update metadata if provided
            if 'metadata' in message:
                current_metadata = session.session_metadata or {}
                current_metadata.update(message['metadata'])
                session.session_metadata = current_metadata
            
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'message': 'Session synced successfully',
            'synced_at': timestamp
        })
    
    except Exception as e:
        logger.error(f"Error syncing session: {e}", exc_info=True)
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
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
            
            # Update end time
            end_time = message.get('end_time')
            if end_time:
                session.end_time = parse_timestamp(end_time)
            else:
                session.end_time = datetime.now(timezone.utc)

            session.is_active = False
            session.connection_status = 'offline'
            
            # Update final stats if provided
            if 'final_stats' in message:
                current_data = session.session_data or {}
                current_data.update(message['final_stats'])
                session.session_data = current_data
            
            # Update metadata
            if 'final_metadata' in message:
                current_metadata = session.session_metadata or {}
                current_metadata.update(message['final_metadata'])
                session.session_metadata = current_metadata

            # Update with any final data    
            if 'session_data' in message:
                session.session_data = message['session_data']
            
        # Calculate session duration
        duration = (session.end_time - session.start_time).total_seconds() / 60
        
        # Get interaction count
        interaction_count = db.query(Interaction).filter(
            Interaction.session_id == session_id
        ).count()            
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'message': 'Session ended successfully',
            'session_duration_minutes': round(duration, 2),
            'final_interaction_count': interaction_count,
            'end_time': session.end_time.isoformat(),
        })
        
        # Disconnect WebSocket after ending session
        await asyncio.sleep(0.5)  # Give time for response to be sent
        ws_manager.disconnect(session_id)
        
    except Exception as e:
        logger.error(f"Error ending session: {e}", exc_info=True)
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'error',
            'error': str(e)
        })


async def handle_session_heartbeat(session_id: str, message: dict):
    """Handle heartbeat to keep session alive"""
    try:
        request_id = message.get('request_id')
        
        with get_db_context() as db:
            session = db.query(SessionModel).filter(
                SessionModel.session_id == session_id
            ).first()
            
            if session:
                session.last_activity = datetime.now(timezone.utc)
                session.connection_status = 'online'

        # Send pong response
        await ws_manager.send_to_session(
            session_id, 
            {
                'type': 'pong',
                'timestamp': datetime.now(timezone.utc).isoformat()
            },
            immediate=True # Send direct response, no batching for heartbeats
        )

    except Exception as e:
        logger.error(f"Heartbeat error: {e}")


# ============================================================
# CHAT OPERATIONS
# ============================================================

async def handle_chat_message(session_id: str, message: dict):
    """
    Handle chat message via WebSocket
    Streams AI response back in real-time
    """
    request_id = message.get('request_id')
    user_message_id = None
    user_timestamp = None
    
    try:
        # ============================================================
        # STEP 1: Save user message to database
        # ============================================================
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
                    started_at=datetime.now(timezone.utc),
                    message_count=0,
                    total_user_messages=0,
                    total_assistant_messages=0,
                    total_tokens_used=0
                )
                db.add(conversation)
                db.flush()
            
            # Save user message with JSON-safe metadata
            user_message = ChatMessage(
                session_id=session_id,
                role='user',
                content=message.get('content', ''),
                timestamp=datetime.now(timezone.utc),
                message_index=conversation.message_count,
                model_used=str(message.get('model_used', settings.llm_model)),
                message_metadata={
                    'source': 'websocket',
                    'request_id': str(message.get('request_id', '')),
                    'context_length': int(len(message.get('messages', []))),
                    'finish_reason': 'stop',
                    'temperature': float(message.get('temperature', settings.default_temperature)),
                    'max_tokens': int(message.get('max_tokens', settings.default_max_tokens)),
                    'stream': bool(message.get('stream', settings.use_stream)),
                    'estimated_tokens': int(max(1, len(message.get('content', '').split()) // 0.75))
                }
            )
            db.add(user_message)
            
            # Update conversation stats
            conversation.message_count += 1
            conversation.total_user_messages += 1
            conversation.last_message_at = datetime.now(timezone.utc)

            # Flush to get ID before context closes
            db.flush()
            user_message_id = user_message.id
            user_timestamp = parse_timestamp(user_message.timestamp).isoformat()
            
        # Database context closed - user message committed ✅
        
        # Send acknowledgment AFTER successful commit
        await ws_manager.send_to_session(session_id, {
            'type': 'response',
            'request_id': request_id,
            'status': 'success',
            'data': {
                'message_id': user_message_id,
                'timestamp': user_timestamp
            }
        })
        
        logger.info(f"✅ User message saved: session={session_id}, message_id={user_message_id}")

        # ============================================================
        # STEP 2: Clean context messages for OpenAI API
        # ============================================================
        context_messages = message.get('messages', [])
        cleaned_context = [
            {
                'role': msg['role'],
                'content': msg['content']
            }
            for msg in context_messages
            if isinstance(msg, dict) and 'role' in msg and 'content' in msg
        ]
        
        logger.info(f"🔄 Sending to OpenAI: {len(cleaned_context)} context messages + 1 new message")
        
        # ============================================================
        # STEP 3: Stream AI response from OpenAI
        # ============================================================
        full_content = ''
        chunk_count = 0
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        model_used = None
        start_time = time.time()
        response_time_ms = 0
        
        async with httpx.AsyncClient() as client:
            try:
                # Build payload and set model-specific token key before making the request
                payload = {
                    "model": settings.llm_model,
                    "messages": cleaned_context + [{"role": "user", "content": message.get('content', '')}],
                    "stream": settings.use_stream,
                    "stream_options": {
                        "include_usage": settings.include_usage,
                        "include_obfuscation": settings.include_obfuscation
                    }
                }

                # Choose appropriate token parameter name depending on model capabilities
                if settings.llm_model.startswith('gpt-4') or settings.llm_model.startswith('gpt-5'):
                    payload["max_completion_tokens"] = settings.default_max_tokens
                else:
                    payload["max_tokens"] = settings.default_max_tokens
                    payload["temperature"] = settings.default_temperature

                response = await client.post(
                    settings.openai_api_url,
                    headers={
                        "Authorization": f"Bearer {settings.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=60.0
                )
                
                # Check response status
                if response.status_code != 200:
                    error_text = await response.aread()
                    logger.error(f"❌ OpenAI API error: status={response.status_code}, body={error_text}")
                    raise Exception(f"OpenAI API returned {response.status_code}: {error_text}")
                
                logger.info(f"✅ OpenAI streaming started")
                
                async for line in response.aiter_lines():
                    if not line or not line.startswith('data: '):
                        continue
                        
                    data = line[6:]  # Remove 'data: ' prefix
                    
                    if data.strip() == '[DONE]':
                        response_time_ms = int((time.time() - start_time) * 1000)

                        logger.info(
                            f"✅ OpenAI streaming completed: {model_used}, {chunk_count} chunks, {len(full_content)} chars, "
                            f"{prompt_tokens} prompt tokens, {completion_tokens} completion tokens, {total_tokens} total tokens"
                        )
                        break
                    
                    try:
                        parsed = json.loads(data)
                        
                        # Extract model (available in every chunk)
                        if 'model' in parsed and not model_used:
                            model_used = parsed['model']
                        
                        # Extract usage tokens (appears in dedicated chunk before [DONE])
                        if 'usage' in parsed:
                            usage = parsed['usage']
                            if usage and usage != null:
                                prompt_tokens = usage.get('prompt_tokens', 0)
                                completion_tokens = usage.get('completion_tokens', 0)
                                total_tokens = usage.get('total_tokens', 0)

                        if parsed.get('choices'):
                            delta = parsed['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            
                            if content:
                                full_content += content
                                chunk_count += 1
                                
                                # Stream chunk to client
                                await ws_manager.send_to_session(
                                    session_id,
                                    message= {
                                        'type': 'chat_stream',
                                        'content': content,
                                        'full_content': full_content
                                    },
                                    priority='high'
                                )

                                # Log every 10 chunks
                                if chunk_count % 10 == 0:
                                    logger.debug(f"📤 Streamed {chunk_count} chunks ({len(full_content)} chars)")
                                    
                    except json.JSONDecodeError as e:
                        logger.warning(f"⚠️ Failed to parse OpenAI chunk: {e}, data: {data[:100]}")
                        continue
                    except Exception as e:
                        logger.error(f"❌ Error processing OpenAI chunk: {e}")
                        logger.error(traceback.format_exc())
                        continue
                        
            except httpx.TimeoutException as e:
                logger.error(f"❌ OpenAI request timeout: {e}")
                raise Exception("OpenAI request timed out")
            except httpx.RequestError as e:
                logger.error(f"❌ OpenAI request failed: {e}")
                raise Exception(f"Failed to connect to OpenAI: {str(e)}")
        
        if not full_content:
            logger.warning(f"⚠️ OpenAI returned empty response!")
            full_content = "I apologize, but I couldn't generate a response. Please try again."
                
        # ============================================================
        # STEP 4: Save assistant message to database
        # ============================================================
        assistant_message_id = None

        with get_db_context() as db:
            # Get conversation again in new context
            conversation = db.query(ChatConversation).filter(
                ChatConversation.session_id == session_id
            ).first()
            
            # Save assistant message
            assistant_message = ChatMessage(
                session_id=session_id,
                role='assistant',
                content=full_content,
                timestamp=datetime.now(timezone.utc),
                message_index=conversation.message_count,
                token_count= completion_tokens or int(max(1, len(full_content).split() // 0.75)),
                model_used=model_used or settings.llm_model,
                response_time_ms=response_time_ms,
                message_metadata={
                    'source': 'openai',
                    'streamed': settings.use_stream ,
                    'chunks_received': chunk_count,
                    'temperature': float(message.get('temperature', settings.default_temperature)),
                    'max_tokens': int(message.get('max_tokens', settings.default_max_tokens)),
                }
            )
            db.add(assistant_message)

            #update user message with actual token count and model used
            user_msg = db.query(ChatMessage).filter(
                ChatMessage.id == user_message_id,
                ChatMessage.session_id == session_id
            ).first()
            if user_msg:
                user_msg.model_used = model_used or user_msg.model_used
                user_msg.token_count = prompt_tokens or user_msg.token_count

                db.add(user_msg)
                
            # Update conversation stats
            if conversation:
                conversation.message_count += 1
                conversation.total_assistant_messages += 1
                conversation.last_message_at = datetime.now(timezone.utc)
            
            # Flush to get ID
            db.flush()
            assistant_message_id = assistant_message.id
        
        # Database context closed - assistant message committed ✅
        
        logger.info(f"✅ Assistant message saved: message_id={assistant_message_id}, length={len(full_content)}")
        
        # ============================================================
        # STEP 5: Send completion notification
        # ============================================================
        await ws_manager.send_to_session(session_id, {
            'type': 'chat_complete',
            'content': full_content,
            'message_id': assistant_message_id
        })
        
        logger.info(f"✅ Chat completed successfully for session={session_id}")
        
    except Exception as e:
        logger.error(f"❌ Error in chat handler: {e}")
        logger.error(traceback.format_exc())
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
    limit = message.get('limit', None)
    offset = message.get('offset', 0)
    
    try:
        with get_db_context() as db:
            # Get messages with pagination
            messages = db.query(ChatMessage).filter(
                ChatMessage.session_id == session_id,
                ChatMessage.deleted == False
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
            ).update({"deleted": True})
            
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
                timestamp=datetime.now(timezone.utc),
                event_type=event_type,
                event_data=event_data,
                current_view=current_view
            )
            db.add(interaction)
            
            # Update session activity
            session.last_activity = datetime.now(timezone.utc)
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
                    timestamp=parse_timestamp(event.get('timestamp')),
                    event_type=event.get('event_type'),
                    event_data=event.get('event_data', {}),
                    current_view=event.get('current_view', 'unknown')
                )
                interactions.append(interaction)
            
            db.bulk_save_objects(interactions)
            session.last_activity = datetime.now(timezone.utc)
            
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

# ============================================================
# HANDLER REGISTRATION
# ============================================================

def register_handlers():
    """
    Register all WebSocket handlers with the manager
    
    This is called ONCE at application startup in main.py
    """
    logger.info("Registering WebSocket handlers...")

    # Session Operations
    ws_manager.register_handler('session_get', handle_session_get)
    ws_manager.register_handler('session_update', handle_session_update)
    ws_manager.register_handler('session_quicksave', handle_session_quicksave)
    ws_manager.register_handler('session_sync', handle_session_sync)
    ws_manager.register_handler('session_end', handle_session_end)
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
    ws_manager.register_handler('workflow_execute', handle_workflow_execute)
    ws_manager.register_handler('execution_cancel', handle_execution_cancel)
    
    # Batching
    ws_manager.register_handler('batch', handle_batch_request)
    
    handler_count = len(ws_manager.handlers)
    logger.info(f"✅ Registered {handler_count} WebSocket handlers")
    
    # Log all registered handlers for debugging
    logger.debug(f"Registered handlers: {list(ws_manager.handlers.keys())}")


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_all_handlers():
    """
    Return all handlers as a dictionary
    
    Useful for testing and introspection
    """
    return {
        # Session handlers
        'session_get': handle_session_get,
        'session_update': handle_session_update,
        'session_quicksave': handle_session_quicksave,
        'session_sync': handle_session_sync,
        'session_end': handle_session_end,
        'heartbeat': handle_session_heartbeat,
        
        # Chat handlers
        'chat': handle_chat_message,
        'chat_update': handle_chat_message_update,
        'chat_history': handle_chat_history_request,
        'chat_clear': handle_chat_clear,
        
        # Tracking handlers
        'track': handle_tracking_event,
        'track_batch': handle_track_batch,
        'get_interactions': handle_get_interactions,
        
        # Workflow handlers
        'workflow_execute': handle_workflow_execute,
        'execution_cancel': handle_execution_cancel,
        
        # Batch handler
        'batch': handle_batch_request,
    }