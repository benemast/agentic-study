# backend/app/routers/sessions.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from typing import List, Optional
import json
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.core.bot_detection import is_bot_request
from app.models.session import Session as SessionModel, Interaction as InteractionModel
from app.schemas.session import (
    SessionCreate, SessionResponse, InteractionCreate, InteractionResponse, 
    SessionEnd, SessionUpdate, SessionQuickSave, SessionValidateResponse, 
    SessionSyncResponse, SessionQuickSaveResponse, SessionEndResponse, 
    SessionListItem, SessionHealthResponse, SessionHeartbeatResponse,
    SessionDeleteResponse
)

# Import Sentry for explicit error capture (optional - works without it)
try:
    import sentry_sdk
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

# Get logger instance 
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

def log_and_capture_error(error: Exception, context: str, session_id: str = None):
    """
    Log error and capture in Sentry with enhanced context
    
    This function:
    1. Logs the error with full traceback to logs/errors.log (via logging_config.py)
    2. Captures in Sentry with additional context (via sentry_config.py)
    3. Works even if Sentry is not configured
    
    Args:
        error: The exception that occurred
        context: Description of where/why the error occurred
        session_id: Optional session ID for additional context
    """
    # Log with full traceback (goes to logs/errors.log)
    logger.error(f"{context}: {str(error)}", exc_info=True)
    
    # Capture in Sentry with enhanced context
    if SENTRY_AVAILABLE:
        with sentry_sdk.push_scope() as scope:
            # Add tags for better error grouping
            scope.set_tag("error_context", context)
            scope.set_tag("error_module", "sessions_router")
            
            if session_id:
                scope.set_tag("session_id", session_id)
                scope.set_context("session", {"session_id": session_id})
            
            # Add extra context
            scope.set_context("error_details", {
                "context": context,
                "error_type": type(error).__name__,
                "error_message": str(error),
            })
            
            # Capture the exception
            sentry_sdk.capture_exception(error)

@router.post("/", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    request: Request,
    db: Session = Depends(get_db)
    ):
    """Create a new user session with enhanced metadata"""
    
    try:
        # Bot detection - ADD THIS BLOCK
        user_agent = request.headers.get("user-agent")
        screen_resolution = session_data.screen_resolution
        
        is_bot, bot_reason = is_bot_request(user_agent, screen_resolution)
        if is_bot:
            logger.warning(
                f"Bot request rejected - Reason: {bot_reason}, "
                f"User-Agent: {user_agent}, Resolution: {screen_resolution}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Automated requests are not allowed for this study"
            )
        # Lock table during ID generation
        db.execute(text("LOCK TABLE sessions IN SHARE ROW EXCLUSIVE MODE"))

        # Get next participant ID
        last_participant = db.query(func.max(SessionModel.participant_id)).scalar()
        next_participant_id = (last_participant or 0) + 1
        
        # Parse start time
        start_time = datetime.fromisoformat(session_data.start_time.replace('Z', '+00:00'))
        
        # Create session with enhanced data
        db_session = SessionModel(
            session_id=session_data.session_id,
            participant_id=next_participant_id,
            start_time=start_time,
            user_agent=session_data.user_agent,
            screen_resolution=session_data.screen_resolution,
            session_data={
                "workflowsCreated": 0,
                "workflowsExecuted": 0,
                "totalTimeSpent": 0,
                "currentView": "dashboard",
                "interactions": []
            },
            # Store enhanced metadata
            session_metadata=getattr(session_data, 'metadata', {}),
            last_activity=start_time,
            connection_status="online"
        )
        
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        return SessionResponse(
            session_id=db_session.session_id,
            participant_id=db_session.participant_id,
            start_time=db_session.start_time,
            is_active=db_session.is_active == "true"
        )
    
    except ValueError as e:
        db.rollback()
        log_and_capture_error(e, "Session creation - Invalid data format")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data format: {str(e)}"
        )
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Session creation failed", session_id=session_data.session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )

@router.get("/{session_id}/validate", response_model=SessionValidateResponse)
async def validate_session(session_id: str, db: Session = Depends(get_db)):
    """Validate if session exists and is active"""
    try:
        session = db.query(SessionModel).filter(
            SessionModel.session_id == session_id,
            SessionModel.is_active == "true"
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or inactive")
        
        # Update last seen
        session.last_activity = datetime.utcnow()
        session.connection_status = "online"
        db.commit()
        
        return SessionValidateResponse(
            valid=True,
            session_id=session.session_id,
            participant_id=session.participant_id,
            last_activity=session.last_activity,
            session_age_minutes=(datetime.utcnow() - session.start_time).total_seconds() / 60,
            has_demographics=session.has_demographics
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Session validation failed", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate session: {str(e)}"
        )

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get session details with validation"""
    try:
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update last activity
        session.last_activity = datetime.utcnow()
        db.commit()
        
        return SessionResponse(
            session_id=session.session_id,
            participant_id=session.participant_id,
            start_time=session.start_time,
            is_active=session.is_active == "true"
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Failed to get session", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session: {str(e)}"
        )

@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str, 
    session_update: SessionUpdate, 
    db: Session = Depends(get_db)
):
    """Update session data with enhanced metadata"""
    try:
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session data
        if session_update.session_data:
            session.session_data = session_update.session_data
        
        # Update last activity
        if session_update.last_activity:
            session.last_activity = datetime.fromisoformat(session_update.last_activity.replace('Z', '+00:00'))
        
        # Update connection status
        if session_update.connection_status:
            if session_update.connection_status not in ["online", "offline", "error"]:
                raise HTTPException(status_code=400, detail="Invalid connection_status")
            session.connection_status = session_update.connection_status
        
        # Update metadata if provided
        if session_update.metadata:
            current_metadata = session.session_metadata or {}
            current_metadata.update(session_update.metadata)
            session.session_metadata = current_metadata
        
        # Update has_demographics if provided
        if session_update.has_demographics is not None:
            session.has_demographics = session_update.has_demographics

        db.commit()
        db.refresh(session)
        
        return SessionResponse(
            session_id=session.session_id,
            participant_id=session.participant_id,
            start_time=session.start_time,
            is_active=session.is_active,
            last_activity=session.last_activity,
            has_demographics=session.has_demographics        
        )
    
    except HTTPException:
        raise
    
    except ValueError as e:
        db.rollback()
        log_and_capture_error(e, "Invalid data in session update", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data format: {str(e)}"
        )
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Failed to update session", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update session: {str(e)}"
        )

@router.post("/{session_id}/sync", response_model=SessionSyncResponse)
async def sync_session_data(
    session_id: str, 
    request: Request,
    db: Session = Depends(get_db)
):
    """Sync session data with enhanced metadata"""
    try:
        # Get raw request body
        body = await request.json()
        print(f"Raw sync request body: {body}")
        
        # Manually validate each field
        required_fields = ['session_data', 'sync_timestamp']
        for field in required_fields:
            if field not in body:
                print(f"Missing required field: {field}")
                raise HTTPException(status_code=422, detail=f"Missing field: {field}")
        
        # Check field types
        if not isinstance(body.get('session_data'), dict):
            raise HTTPException(status_code=422, detail="session_data must be a dict")
        
        if not isinstance(body.get('sync_timestamp'), str):
            raise HTTPException(status_code=422, detail="sync_timestamp must be a string")
        
        # Check session exists
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session data
        session.session_data = body['session_data']
        session.last_activity = datetime.utcnow()
        
        # Update metadata if provided
        if 'metadata' in body and body['metadata']:
            current_metadata = session.session_metadata or {}
            current_metadata.update(body['metadata'])
            session.session_metadata = current_metadata
        
        db.commit()
        db.refresh(session)
        
        return SessionSyncResponse(
            success=True,
            session_id=session.session_id,
            synced_at=session.last_activity
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Session sync failed", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync session: {str(e)}"
        )

@router.post("/{session_id}/quick-save", response_model=SessionQuickSaveResponse)
async def quick_save_session(
    session_id: str,
    quick_save_data: SessionQuickSave,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Quick save session state without full validation"""
    try:
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update only the changed data
        if quick_save_data.session_data:
            current_data = session.session_data or {}
            current_data.update(quick_save_data.session_data)
            session.session_data = current_data
        
        session.last_activity = datetime.utcnow()
        
        db.commit()
        
        return SessionQuickSaveResponse(
            success=True,
            saved_at=session.last_activity
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Quick save failed", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to quick save session: {str(e)}"
        )

@router.post("/{session_id}/end", response_model=SessionEndResponse)
async def end_session(
    session_id: str,
    session_end: SessionEnd,
    db: Session = Depends(get_db)
):
    """End a session and store final data"""
    try:
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session with final data
        session.end_time = datetime.fromisoformat(session_end.end_time.replace('Z', '+00:00'))
        session.is_active = "false"
        session.connection_status = "offline"
        
        # Store final session data
        if session_end.final_session_data:
            session.session_data = session_end.final_session_data
        
        # Store completion status if provided
        if hasattr(session_end, 'completion_status'):
            current_metadata = session.session_metadata or {}
            current_metadata['completion_status'] = session_end.completion_status
            session.session_metadata = current_metadata
        
        db.commit()
        db.refresh(session)
        
        duration_minutes = (session.end_time - session.start_time).total_seconds() / 60
        
        return SessionEndResponse(
            success=True,
            session_id=session.session_id,
            duration_minutes=duration_minutes,
            ended_at=session.end_time
        )
    
    except HTTPException:
        raise
    
    except ValueError as e:
        db.rollback()
        log_and_capture_error(e, "Invalid end time", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid end time format: {str(e)}"
        )
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Failed to end session", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}"
        )

@router.post("/{session_id}/interactions", response_model=InteractionResponse)
async def create_interaction(
    session_id: str,
    interaction_data: InteractionCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new interaction for a session"""
    try:
        # Verify session exists
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Parse timestamp
        timestamp = datetime.fromisoformat(interaction_data.timestamp.replace('Z', '+00:00'))
        
        # Create interaction
        db_interaction = InteractionModel(
            session_id=session_id,
            timestamp=timestamp,
            event_type=interaction_data.event_type,
            current_view=interaction_data.current_view,
            event_data=interaction_data.event_data
        )
        
        db.add(db_interaction)
        
        # Update session last activity
        session.last_activity = timestamp
        
        db.commit()
        db.refresh(db_interaction)
        
        return InteractionResponse(
            id=db_interaction.id,
            session_id=db_interaction.session_id,
            timestamp=db_interaction.timestamp,
            event_type=db_interaction.event_type,
            current_view=db_interaction.current_view,
            event_data=db_interaction.event_data
        )
    
    except HTTPException:
        raise
    
    except ValueError as e:
        db.rollback()
        log_and_capture_error(e, "Invalid interaction data", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data format: {str(e)}"
        )
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Failed to create interaction", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create interaction: {str(e)}"
        )

@router.get("/{session_id}/interactions", response_model=List[InteractionResponse])
async def get_session_interactions(
    session_id: str,
    skip: int = 0,
    limit: int = 100,
    offset: Optional[int] = 0,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all interactions for a session with pagination"""
    try:
        # Verify session exists
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get interactions with pagination
        interactions = db.query(InteractionModel)\
            .filter(InteractionModel.session_id == session_id)\
            .order_by(InteractionModel.timestamp)\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return [
            InteractionResponse(
                id=i.id,
                session_id=i.session_id,
                timestamp=i.timestamp,
                event_type=i.event_type,
                current_view=i.current_view,
                event_data=i.event_data
            )
            for i in interactions
        ]
    
    except HTTPException:
        raise
    
    except Exception as e:
        log_and_capture_error(e, "Failed to get interactions", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve interactions: {str(e)}"
        )

@router.get("/health", response_model=SessionHealthResponse)
async def session_health_check(db: Session = Depends(get_db)):
    """Health check for session system"""
    try:
        # Check database connection
        db.execute("SELECT 1")
        
        # Get basic stats
        total_sessions = db.query(func.count(SessionModel.id)).scalar()
        active_sessions = db.query(func.count(SessionModel.id))\
            .filter(SessionModel.is_active == "true").scalar()
        
        return SessionHealthResponse(
            status="healthy",
            total_sessions=total_sessions,
            active_sessions=active_sessions,
            timestamp=datetime.utcnow()
        )
    
    except Exception as e:
        log_and_capture_error(e, "Session health check failed")
        return SessionHealthResponse(
            status="unhealthy",
            total_sessions=0,
            active_sessions=0,
            timestamp=datetime.utcnow(),
            error=str(e)
        )

@router.get("/", response_model=List[SessionListItem])
async def list_sessions(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """List all sessions with pagination and filtering"""
    try:
        query = db.query(SessionModel)
        
        if active_only:
            query = query.filter(SessionModel.is_active == "true")
        
        sessions = query.order_by(desc(SessionModel.start_time))\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        result = []
        for s in sessions:
            interaction_count = db.query(func.count(InteractionModel.id))\
                .filter(InteractionModel.session_id == s.session_id).scalar()
            
            result.append(SessionListItem(
                session_id=s.session_id,
                participant_id=s.participant_id,
                start_time=s.start_time,
                end_time=s.end_time,
                is_active=s.is_active == "true",
                connection_status=s.connection_status,
                last_activity=s.last_activity,
                interaction_count=interaction_count
            ))
        
        return result
    
    except Exception as e:
        log_and_capture_error(e, "Failed to list sessions")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sessions: {str(e)}"
        )

@router.get("/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """Get comprehensive analytics summary"""
    try:
        sessions = db.query(SessionModel).all()
        interactions = db.query(InteractionModel).all()
        
        total_participants = len(sessions)
        active_sessions = len([s for s in sessions if s.is_active == "true"])
        completed_sessions = len([s for s in sessions if s.end_time])
        total_interactions = len(interactions)
        
        # Connection status breakdown
        connection_status_counts = {}
        for session in sessions:
            status = session.connection_status or "unknown"
            connection_status_counts[status] = connection_status_counts.get(status, 0) + 1
        
        # Event type breakdown
        event_counts = {}
        for interaction in interactions:
            event_counts[interaction.event_type] = event_counts.get(interaction.event_type, 0) + 1
        
        # Session duration analysis
        durations = []
        for session in sessions:
            if session.end_time:
                duration = (session.end_time - session.start_time).total_seconds() / 60
                durations.append(duration)
        
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        # Activity analysis (last 24 hours)
        last_24h = datetime.utcnow() - timedelta(hours=24)
        recent_interactions = [i for i in interactions if i.timestamp >= last_24h]
        recent_sessions = [s for s in sessions if s.start_time >= last_24h]
        
        return {
            "total_participants": total_participants,
            "active_sessions": active_sessions,
            "completed_sessions": completed_sessions,
            "completion_rate": round((completed_sessions / total_participants * 100) if total_participants > 0 else 0, 2),
            "total_interactions": total_interactions,
            "avg_session_duration_minutes": round(avg_duration, 2),
            "connection_status_breakdown": connection_status_counts,
            "event_type_breakdown": event_counts,
            "most_common_events": sorted(event_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            "last_24h_activity": {
                "new_sessions": len(recent_sessions),
                "interactions": len(recent_interactions),
                "active_participants": len(set(i.session_id for i in recent_interactions))
            }
        }
    
    except Exception as e:
        log_and_capture_error(e, "Failed to generate analytics summary")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve analytics: {str(e)}"
        )

@router.get("/export/csv")
async def export_sessions_csv(include_interactions: bool = False, db: Session = Depends(get_db)):
    """Export session data as CSV with optional interaction details"""
    try:
        import csv
        import io
        from fastapi.responses import StreamingResponse
        
        sessions = db.query(SessionModel).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        if include_interactions:
            # Detailed export with interactions
            writer.writerow([
                'participant_id', 'session_id', 'start_time', 'end_time', 'session_duration_minutes',
                'connection_status', 'workflows_created', 'workflows_executed', 'total_interactions',
                'interaction_timestamp', 'event_type', 'current_view', 'event_data'
            ])
            
            for session in sessions:
                duration = None
                if session.end_time:
                    duration = (session.end_time - session.start_time).total_seconds() / 60
                    
                data = session.session_data or {}
                interactions = db.query(InteractionModel).filter(
                    InteractionModel.session_id == session.session_id
                ).all()
                
                if interactions:
                    for interaction in interactions:
                        writer.writerow([
                            session.participant_id,
                            session.session_id,
                            session.start_time,
                            session.end_time,
                            duration,
                            session.connection_status,
                            data.get('workflowsCreated', 0),
                            data.get('workflowsExecuted', 0),
                            len(interactions),
                            interaction.timestamp,
                            interaction.event_type,
                            interaction.current_view,
                            json.dumps(interaction.event_data) if interaction.event_data else ''
                        ])
                else:
                    # Session without interactions
                    writer.writerow([
                        session.participant_id,
                        session.session_id,
                        session.start_time,
                        session.end_time,
                        duration,
                        session.connection_status,
                        data.get('workflowsCreated', 0),
                        data.get('workflowsExecuted', 0),
                        0, '', '', '', ''
                    ])
        else:
            # Summary export
            writer.writerow([
                'participant_id', 'session_id', 'start_time', 'end_time', 'session_duration_minutes',
                'connection_status', 'workflows_created', 'workflows_executed', 'total_interactions',
                'last_activity', 'screen_resolution', 'timezone', 'browser_info'
            ])
            
            for session in sessions:
                duration = None
                if session.end_time:
                    duration = (session.end_time - session.start_time).total_seconds() / 60
                    
                data = session.session_data or {}
                interaction_count = db.query(func.count(InteractionModel.id))\
                                    .filter(InteractionModel.session_id == session.session_id).scalar()
                
                metadata = session.session_metadata or {}
                
                writer.writerow([
                    session.participant_id,
                    session.session_id,
                    session.start_time,
                    session.end_time,
                    duration,
                    session.connection_status,
                    data.get('workflowsCreated', 0),
                    data.get('workflowsExecuted', 0),
                    interaction_count,
                    session.last_activity,
                    session.screen_resolution,
                    metadata.get('timezone', ''),
                    session.user_agent
                ])
        
        output.seek(0)
        filename = f"study_data_{'detailed' if include_interactions else 'summary'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except Exception as e:
        log_and_capture_error(e, "Failed to export sessions to CSV")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )

@router.delete("/{session_id}", response_model=SessionDeleteResponse)
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a session and all its interactions (admin only)"""
    try:
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete all interactions first
        db.query(InteractionModel).filter(InteractionModel.session_id == session_id).delete()
        
        # Delete session
        db.delete(session)
        db.commit()
        
        return SessionDeleteResponse(
            message=f"Session {session_id} deleted successfully"
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Failed to delete session", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )

@router.post("/{session_id}/heartbeat", response_model=SessionHeartbeatResponse)
async def session_heartbeat(session_id: str, db: Session = Depends(get_db)):
    """Update session activity timestamp (heartbeat)"""
    try:
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session.last_activity = datetime.utcnow()
        session.connection_status = "online"
        db.commit()
        
        return SessionHeartbeatResponse(
            success=True,
            timestamp=session.last_activity
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        db.rollback()
        log_and_capture_error(e, "Heartbeat failed", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update heartbeat: {str(e)}"
        )
    

@router.post("/admin/login")
async def admin_login(username: str, password: str):
    from app.configs.config import settings
    if username == settings.admin_username and password == settings.admin_password:
        # Return simple token or just success
        return {"authenticated": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")