# backend/app/routers/orchestrator.py
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from app.database import get_db, get_db_context
from app.models.session import Session as SessionModel
from app.models.execution import WorkflowExecution, ExecutionCheckpoint
from app.orchestrator.service import orchestrator

from app.schemas.orchestrator import (
    ExecutionRequest, ExecutionResponse, ExecutionStatusResponse, 
    ExecutionDetailResponse, CheckpointResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orchestrator", tags=["orchestrator"])


@router.post("/execute", response_model=ExecutionResponse)
async def execute_workflow(
    request: ExecutionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Start workflow or agent execution
    
    Execution runs in background, use /execution/{id}/status to track progress
    """
    try:
        # Validate session exists
        session = db.query(SessionModel).filter(
            SessionModel.session_id == request.session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Validate request based on condition
        if request.condition == 'workflow_builder':
            if not request.workflow:
                raise HTTPException(
                    status_code=400, 
                    detail="workflow is required for workflow_builder condition"
                )
            if not request.workflow.get('nodes'):
                raise HTTPException(
                    status_code=400,
                    detail="workflow must contain nodes"
                )
        elif request.condition == 'ai_assistant':
            if not request.task_description:
                raise HTTPException(
                    status_code=400,
                    detail="task_description is required for ai_assistant condition"
                )
        execution = WorkflowExecution(
            session_id=request.session_id,
            condition=request.condition,
            status='pending',
            workflow_definition=request.workflow if request.condition == 'workflow_builder' else None,
            task_description=request.task_description if request.condition == 'ai_assistant' else None,
            input_data=request.input_data,
            execution_metadata=request.metadata
        )
        
        db.add(execution)
        db.commit()
        db.refresh(execution)
        
        logger.info(f"Created execution record: {execution.id}")
        
        # Pass execution_id to background task, not create new one
        async def run_execution():
            """Background task that uses existing execution record"""
            try:
                # Prepare task data
                task_data = {
                    'workflow': request.workflow,
                    'task_description': request.task_description,
                    'input_data': request.input_data,
                    'metadata': request.metadata or {}
                }
                
                # Execute with existing execution record using context manager
                with get_db_context() as bg_db:
                    await orchestrator.execute_workflow_with_id(
                        db=bg_db,
                        execution_id=execution.id,
                        session_id=request.session_id,
                        condition=request.condition,
                        task_data=task_data
                    )
                
            except Exception as e:
                logger.error(f"Background execution failed: {e}", exc_info=True)
                
                # Update execution with error
                try:
                    with get_db_context() as error_db:
                        bg_execution = error_db.query(WorkflowExecution).filter(
                            WorkflowExecution.id == execution.id
                        ).first()
                        
                        if bg_execution:
                            bg_execution.status = 'failed'
                            bg_execution.error_message = str(e)
                except Exception as update_error:
                    logger.error(f"Failed to update execution error status: {update_error}")
        
        # Add background task
        background_tasks.add_task(run_execution)
        
        return ExecutionResponse(
            execution_id=execution.id,
            status='pending',
            message='Execution started successfully'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error starting execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/execution/{execution_id}/status", response_model=ExecutionStatusResponse)
async def get_execution_status(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current execution status
    
    Poll this endpoint to track execution progress
    """
    try:
        status = await orchestrator.get_execution_status(db, execution_id)
        
        if 'error' in status:
            raise HTTPException(status_code=404, detail=status['error'])
        
        return ExecutionStatusResponse(**status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting execution status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/execution/{execution_id}", response_model=ExecutionDetailResponse)
async def get_execution_detail(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """
    Get full execution details
    
    Returns complete execution record including results
    """
    try:
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        return ExecutionDetailResponse(
            execution_id=execution.id,
            session_id=execution.session_id,
            condition=execution.condition,
            status=execution.status,
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            steps_completed=execution.steps_completed,
            execution_time_ms=execution.execution_time_ms,
            workflow_definition=execution.workflow_definition,
            task_description=execution.task_description,
            final_result=execution.final_result,
            error_message=execution.error_message,
            checkpoints_count=execution.checkpoints_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting execution detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/execution/{execution_id}/checkpoints", response_model=List[CheckpointResponse])
async def get_execution_checkpoints(
    execution_id: int,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get execution checkpoints for analysis
    
    Returns all state snapshots taken during execution
    """
    try:
        checkpoints = orchestrator.state_manager.get_checkpoint_history(
            db, execution_id, limit
        )
        
        return [
            CheckpointResponse(
                id=cp.id,
                step_number=cp.step_number,
                checkpoint_type=cp.checkpoint_type,
                node_id=cp.node_id,
                timestamp=cp.timestamp,
                time_since_last_step_ms=cp.time_since_last_step_ms,
                user_interaction=cp.user_interaction
            )
            for cp in checkpoints
        ]
        
    except Exception as e:
        logger.exception(f"Error getting checkpoints: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execution/{execution_id}/cancel")
async def cancel_execution(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """
    Cancel a running execution
    
    User intervention - tracked for study metrics
    """
    try:
        success = await orchestrator.cancel_execution(db, execution_id)
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Execution not found or not running"
            )
        
        return {"message": "Execution cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error cancelling execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}/executions")
async def get_session_executions(
    session_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get all executions for a session
    
    Returns execution history for analytics
    """
    try:
        executions = db.query(WorkflowExecution).filter(
            WorkflowExecution.session_id == session_id
        ).order_by(WorkflowExecution.started_at.desc()).limit(limit).all()
        
        return [
            {
                'execution_id': ex.id,
                'condition': ex.condition,
                'status': ex.status,
                'started_at': ex.started_at.isoformat() if ex.started_at else None,
                'completed_at': ex.completed_at.isoformat() if ex.completed_at else None,
                'steps_completed': ex.steps_completed,
                'execution_time_ms': ex.execution_time_ms
            }
            for ex in executions
        ]
        
    except Exception as e:
        logger.exception(f"Error getting session executions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== WEBSOCKET ====================

@router.websocket("/ws/execution/{session_id}")
async def execution_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket for real-time execution progress updates
    
    Connect before starting execution to receive live updates
    """
    await orchestrator.websocket_manager.connect(session_id, websocket)
    
    try:
        while True:
            # Keep connection alive, handle client messages
            data = await websocket.receive_text()
            
            # Handle client commands (pause, resume, etc.)
            # For now, just echo
            await websocket.send_json({
                'type': 'echo',
                'message': f'Received: {data}'
            })
            
    except WebSocketDisconnect:
        orchestrator.websocket_manager.disconnect(session_id)
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        orchestrator.websocket_manager.disconnect(session_id)