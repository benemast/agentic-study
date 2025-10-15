# backend/app/websocket/handlers.py
from datetime import datetime
import logging
import httpx
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.session import Session as SessionModel, Interaction
from app.models.ai_chat import ChatMessage
from app.websocket.manager import ws_manager
from app.config import settings

logger = logging.getLogger(__name__)


async def handle_chat_message(session_id: str, message: dict):
    """
    Handle chat message via WebSocket
    Streams AI response back in real-time
    """
    user_message = message.get('content')
    context_messages = message.get('messages', [])
    
    if not user_message:
        await ws_manager.send_to_session(session_id, {
            'type': 'error',
            'error': 'Message content is required'
        })
        return
    
    # Save user message to DB
    db = SessionLocal()
    try:
        db_message = ChatMessage(
            session_id=session_id,
            role='user',
            content=user_message,
            timestamp=datetime.utcnow()
        )
        db.add(db_message)
        db.commit()
        
        # Send acknowledgment
        await ws_manager.send_to_session(session_id, {
            'type': 'chat_received',
            'message_id': db_message.id
        })
        
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
            db.commit()
            
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
    finally:
        db.close()


async def handle_session_sync(session_id: str, message: dict):
    """Handle session data sync"""
    db = SessionLocal()
    try:
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
            db.commit()
        
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
    finally:
        db.close()


async def handle_session_heartbeat(session_id: str, message: dict):
    """Handle session heartbeat"""
    db = SessionLocal()
    try:
        session = db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()
        
        if session:
            session.last_activity = datetime.utcnow()
            session.connection_status = 'online'
            db.commit()
        
        await ws_manager.send_to_session(session_id, {
            'type': 'heartbeat_ack',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error in heartbeat: {e}")
    finally:
        db.close()


async def handle_tracking_event(session_id: str, message: dict):
    """Handle analytics tracking event"""
    db = SessionLocal()
    try:
        event_type = message.get('event_type')
        event_data = message.get('data', {})
        
        # Create interaction record
        interaction = Interaction(
            session_id=session_id,
            interaction_type=event_type,
            view_name=event_data.get('view', 'unknown'),
            target=event_data.get('target', ''),
            value=event_data.get('value', ''),
            timestamp=datetime.utcnow(),
            metadata=event_data
        )
        
        db.add(interaction)
        db.commit()
        
        await ws_manager.send_to_session(session_id, {
            'type': 'track_ack',
            'event_type': event_type
        })
    
    except Exception as e:
        logger.error(f"Error in tracking: {e}")
    finally:
        db.close()


async def handle_workflow_execute(session_id: str, message: dict):
    """Handle workflow execution request"""
    from app.orchestrator.service import orchestrator
    
    db = SessionLocal()
    try:
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
    finally:
        db.close()


async def handle_execution_cancel(session_id: str, message: dict):
    """Handle execution cancellation"""
    from app.orchestrator.service import orchestrator
    
    db = SessionLocal()
    try:
        execution_id = message.get('execution_id')
        
        if not execution_id:
            raise ValueError('execution_id is required')
        
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
    finally:
        db.close()