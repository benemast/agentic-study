# backend/app/routers/summary.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.summary import ExecutionSummary
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/sessions", tags=["summary"])

class SummaryCreate(BaseModel):
    task_number: int
    execution_id: str
    sections: dict
    metadata: dict

@router.post("/{session_id}/summary")
async def create_summary(
    session_id: str,
    summary_data: SummaryCreate,
    db: Session = Depends(get_db)
):
    # Get or create summary record
    summary = db.query(ExecutionSummary).filter(
        ExecutionSummary.session_id == session_id
    ).first()
    
    if not summary:
        summary = ExecutionSummary(session_id=session_id)
        db.add(summary)
    
    # Update appropriate task column
    summary_json = {
        "sections": summary_data.sections,
        "metadata": summary_data.metadata
    }
    
    if summary_data.task_number == 1:
        summary.task1_execution_id = summary_data.execution_id
        summary.task1_summary = summary_json
    elif summary_data.task_number == 2:
        summary.task2_execution_id = summary_data.execution_id
        summary.task2_summary = summary_json
    else:
        raise HTTPException(status_code=400, detail="Invalid task_number")
    
    db.commit()
    db.refresh(summary)
    
    return summary_json

@router.get("/{session_id}/summary")
async def get_summary(
    session_id: str,
    task_number: int,
    db: Session = Depends(get_db)
):
    summary = db.query(ExecutionSummary).filter(
        ExecutionSummary.session_id == session_id
    ).first()
    
    if not summary:
        return None
    
    if task_number == 1:
        return summary.task1_summary
    elif task_number == 2:
        return summary.task2_summary
    else:
        raise HTTPException(status_code=400, detail="Invalid task_number")