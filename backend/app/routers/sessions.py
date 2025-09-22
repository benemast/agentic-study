from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
import json
from datetime import datetime, timedelta

from app.database import get_db
from app.models.session import Session as SessionModel, Interaction as InteractionModel
from app.schemas.session import (
    SessionCreate, SessionResponse, InteractionCreate, InteractionResponse, 
    SessionEnd, SessionSync, SessionQuickSave, SessionValidate
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.post("/", response_model=SessionResponse)
async def create_session(session_data: SessionCreate, db: Session = Depends(get_db)):
    """Create a new user session with enhanced metadata"""
    
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

@router.get("/{session_id}/validate")
async def validate_session(session_id: str, db: Session = Depends(get_db)):
    """Validate if session exists and is active"""
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
    
    return {
        "valid": True,
        "session_id": session.session_id,
        "participant_id": session.participant_id,
        "last_activity": session.last_activity,
        "session_age_minutes": (datetime.utcnow() - session.start_time).total_seconds() / 60
    }

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get session details with validation"""
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

@router.post("/{session_id}/sync")
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
        
        # Update session data manually
        session.session_data = body['session_data']
        session.last_activity = datetime.fromisoformat(body['sync_timestamp'].replace('Z', '+00:00'))
        session.connection_status = "online"
        
        # Update metadata if provided
        if 'metadata' in body and body['metadata']:
            current_metadata = session.session_metadata or {}
            current_metadata.update(body['metadata'])
            session.session_metadata = current_metadata
        
        db.commit()
        
        return {
            "success": True,
            "synced_at": body['sync_timestamp'],
            "session_id": session_id
        }
        
    except Exception as e:
        db.rollback()
        print(f"Sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/quick-save")
async def quick_save_session(
    session_id: str,
    save_data: SessionQuickSave,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Quick save session data (for page unload)"""
    session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    if not session:
        # Don't throw error for quick save - just log it
        print(f"Warning: Quick save for non-existent session {session_id}")
        return {"success": False, "reason": "session_not_found"}
    
    # Background task for quick save to not block the response
    def update_session():
        try:
            session.session_data = save_data.session_data
            session.last_activity = datetime.fromisoformat(save_data.quick_save_timestamp.replace('Z', '+00:00'))
            
            if save_data.page_unload:
                session.connection_status = "offline"
            
            db.commit()
            print(f"Quick save completed for session {session_id}")
        except Exception as e:
            print(f"Quick save failed for session {session_id}: {e}")
    
    background_tasks.add_task(update_session)
    
    return {"success": True, "quick_save": True}

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
import json
from datetime import datetime, timedelta

# ... other imports

@router.post("/{session_id}/interactions", response_model=InteractionResponse)
async def log_interaction(
    session_id: str, 
    interaction: InteractionCreate, 
    request: Request,  # Add this to capture request data
    db: Session = Depends(get_db)
):
    """Log a user interaction with enhanced tracking"""
    
    # Verify session exists
    session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Parse timestamp
    timestamp = datetime.fromisoformat(interaction.timestamp.replace('Z', '+00:00'))
    
    # Extract additional tracking data from request
    user_agent = request.headers.get("user-agent", "")
    
    # Get client IP (handle various proxy headers)
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip() or
        request.headers.get("x-real-ip", "") or
        request.headers.get("cf-connecting-ip", "") or
        getattr(request.client, "host", "unknown") if request.client else "unknown"
    )
    
    # Get page URL from referer header
    page_url = request.headers.get("referer", "")
    
    # Create interaction record with all tracking data
    db_interaction = InteractionModel(
        session_id=session_id,
        timestamp=timestamp,
        event_type=interaction.event_type,
        event_data=interaction.event_data,
        current_view=interaction.current_view,
        # Add the missing fields:
        user_agent=user_agent,
        ip_address=client_ip,
        page_url=page_url
    )
    
    db.add(db_interaction)
    
    # Update session activity
    session.last_activity = timestamp
    session.connection_status = "online"
    
    db.commit()
    db.refresh(db_interaction)
    
    return InteractionResponse(
        id=db_interaction.id,
        session_id=db_interaction.session_id,
        timestamp=db_interaction.timestamp,
        event_type=db_interaction.event_type,
        event_data=db_interaction.event_data,
        current_view=db_interaction.current_view
    )

@router.get("/{session_id}/interactions", response_model=List[InteractionResponse])
async def get_interactions(
    session_id: str, 
    limit: Optional[int] = 100,
    offset: Optional[int] = 0,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get interactions for a session with filtering"""
    query = db.query(InteractionModel).filter(InteractionModel.session_id == session_id)
    
    if event_type:
        query = query.filter(InteractionModel.event_type == event_type)
    
    interactions = query.order_by(desc(InteractionModel.timestamp))\
                        .offset(offset).limit(limit).all()
    
    return interactions

@router.get("/{session_id}/health")
async def get_session_health(session_id: str, db: Session = Depends(get_db)):
    """Get session health status"""
    session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = datetime.utcnow()
    session_duration = (now - session.start_time).total_seconds() / 60  # minutes
    time_since_activity = (now - (session.last_activity or session.start_time)).total_seconds() / 60
    
    # Get interaction count
    interaction_count = db.query(func.count(InteractionModel.id))\
                         .filter(InteractionModel.session_id == session_id).scalar()
    
    # Determine health status
    is_healthy = (
        session.is_active == "true" and
        session.connection_status == "online" and
        time_since_activity < 30  # 30 minutes
    )
    
    timeout_warning = time_since_activity > 45  # 45 minutes
    
    return {
        "session_id": session_id,
        "is_healthy": is_healthy,
        "is_active": session.is_active == "true",
        "connection_status": session.connection_status,
        "session_duration_minutes": round(session_duration, 2),
        "time_since_activity_minutes": round(time_since_activity, 2),
        "timeout_warning": timeout_warning,
        "interaction_count": interaction_count,
        "last_activity": session.last_activity,
        "metadata": session.session_metadata
    }

@router.post("/{session_id}/end")
async def end_session(session_id: str, session_end: SessionEnd, db: Session = Depends(get_db)):
    """End a user session with enhanced final data"""
    session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Parse end time
    end_time = datetime.fromisoformat(session_end.end_time.replace('Z', '+00:00'))
    
    # Update session
    session.end_time = end_time
    session.is_active = "false"
    session.connection_status = "ended"
    session.session_data = session_end.final_stats
    
    # Store end reason and final metadata
    end_metadata = {
        "end_reason": getattr(session_end, 'end_reason', 'manual'),
        "final_metadata": getattr(session_end, 'final_metadata', {}),
        "session_duration_minutes": (end_time - session.start_time).total_seconds() / 60
    }
    
    current_metadata = session.session_metadata or {}
    current_metadata.update(end_metadata)
    session.session_metadata = current_metadata
    
    db.commit()
    
    return {
        "message": "Session ended successfully",
        "session_duration_minutes": end_metadata["session_duration_minutes"],
        "final_interaction_count": len(session_end.final_stats.get("interactions", []))
    }

@router.get("/")
async def get_all_sessions(
    active_only: bool = False,
    limit: Optional[int] = 50,
    db: Session = Depends(get_db)
):
    """Get all sessions with filtering options"""
    query = db.query(SessionModel)
    
    if active_only:
        query = query.filter(SessionModel.is_active == "true")
    
    sessions = query.order_by(desc(SessionModel.start_time)).limit(limit).all()
    
    return [
        {
            "session_id": s.session_id,
            "participant_id": s.participant_id,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "is_active": s.is_active == "true",
            "connection_status": s.connection_status,
            "last_activity": s.last_activity,
            "interaction_count": db.query(func.count(InteractionModel.id))
                                 .filter(InteractionModel.session_id == s.session_id).scalar()
        }
        for s in sessions
    ]

@router.get("/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """Get comprehensive analytics summary"""
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

@router.get("/export/csv")
async def export_sessions_csv(include_interactions: bool = False, db: Session = Depends(get_db)):
    """Export session data as CSV with optional interaction details"""
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

@router.delete("/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a session and all its interactions (admin only)"""
    session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete all interactions first
    db.query(InteractionModel).filter(InteractionModel.session_id == session_id).delete()
    
    # Delete session
    db.delete(session)
    db.commit()
    
    return {"message": f"Session {session_id} deleted successfully"}

@router.post("/{session_id}/heartbeat")
async def session_heartbeat(session_id: str, db: Session = Depends(get_db)):
    """Update session activity timestamp (heartbeat)"""
    session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.last_activity = datetime.utcnow()
    session.connection_status = "online"
    db.commit()
    
    return {"success": True, "timestamp": session.last_activity}