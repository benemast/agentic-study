# backend/app/routers/demographics.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import Optional
from datetime import datetime, timezone
import logging
import json

from app.database import get_db
from app.models.demographics import Demographics
from app.models.session import Session as SessionModel
from app.schemas.demographics import (
    DemographicsCreate, DemographicsResponse, DemographicsUpdate, 
    DemographicsValidate, DemographicsDebugResponse, DemographicsListResponse
)

# Configure logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/demographics", tags=["demographics"])

def process_workflow_tools(tools_data):
    """Process workflow_tools_used data for database storage"""
    if tools_data is None:
        return []
    
    if isinstance(tools_data, list):
        return tools_data
    
    if isinstance(tools_data, str):
        try:
            # Try to parse as JSON if it's a string
            parsed = json.loads(tools_data)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            # If not JSON, treat as single item
            return [tools_data] if tools_data else []
    
    return []

@router.post("/", response_model=DemographicsResponse)
async def create_demographics(
    demographics_data: DemographicsCreate, 
    db: Session = Depends(get_db)
):    
    logger.info(f"Creating demographics for session: {demographics_data.session_id}")
    logger.info(f"Workflow tools received: {demographics_data.workflow_tools_used} (type: {type(demographics_data.workflow_tools_used)})")
    
    try:
        # Verify session exists
        session = db.query(SessionModel).filter(
            SessionModel.session_id == demographics_data.session_id
        ).first()
        
        if not session:
            logger.error(f"Session not found: {demographics_data.session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if demographics already exists
        existing = db.query(Demographics).filter(
            Demographics.session_id == demographics_data.session_id
        ).first()
        
        if existing:
            logger.info(f"Updating existing demographics for session: {demographics_data.session_id}")
            
            # Update existing record
            existing.age = demographics_data.age
            existing.gender_identity = demographics_data.gender_identity
            existing.education = demographics_data.education
            existing.field_of_study = demographics_data.field_of_study
            existing.occupation = demographics_data.occupation
            existing.first_language = demographics_data.first_language
            existing.industry = demographics_data.industry
            existing.work_experience = demographics_data.work_experience
            existing.programming_experience = demographics_data.programming_experience
            existing.ai_ml_experience = demographics_data.ai_ml_experience
            existing.ai_ml_expertise = demographics_data.ai_ml_expertise
            existing.ai_tools_used = process_workflow_tools(demographics_data.ai_tools_used)
            existing.workflow_tools_used = process_workflow_tools(demographics_data.workflow_tools_used)
            existing.technical_role = demographics_data.technical_role
            existing.comments = demographics_data.comments
            existing.raw_response = demographics_data.raw_response
            existing.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            db.refresh(existing)
            
            logger.info(f"Demographics updated successfully: {existing.id}")
            return existing
        
        # Process workflow tools for proper storage
        processed_tools = process_workflow_tools(demographics_data.workflow_tools_used)
        logger.info(f"Processed workflow tools: {processed_tools}")
        
        # Create new demographics record
        db_demographics = Demographics(
            session_id=demographics_data.session_id,
            age=demographics_data.age,
            gender_identity=demographics_data.gender_identity,
            education=demographics_data.education,
            field_of_study=demographics_data.field_of_study,
            occupation=demographics_data.occupation,
            first_language=demographics_data.first_language,
            industry=demographics_data.industry,
            work_experience=demographics_data.work_experience,
            programming_experience=demographics_data.programming_experience,
            ai_ml_experience=demographics_data.ai_ml_experience,
            ai_ml_expertise=demographics_data.ai_ml_expertise,
            ai_tools_used=process_workflow_tools(demographics_data.ai_tools_used),
            workflow_tools_used=process_workflow_tools(demographics_data.workflow_tools_used),
            technical_role=demographics_data.technical_role,
            comments=demographics_data.comments,
            raw_response=demographics_data.raw_response,
            completed_at=datetime.now(timezone.utc)
        )
        
        logger.info(f"Creating demographics record with tools: {processed_tools}")
        
        db.add(db_demographics)
        db.commit()
        db.refresh(db_demographics)
        
        logger.info(f"Demographics saved successfully with ID: {db_demographics.id}")

        return db_demographics
        
    except IntegrityError as e:
        logger.error(f"Database integrity error: {e}")
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database integrity error: {str(e)}")
        
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/{session_id}", response_model=DemographicsResponse)
async def get_demographics(session_id: str, db: Session = Depends(get_db)):
    """Get demographics data for a session"""
    
    demographics = db.query(Demographics).filter(
        Demographics.session_id == session_id
    ).first()
    
    if not demographics:
        raise HTTPException(status_code=404, detail="Demographics not found for this session")
    
    return demographics

@router.get("/", response_model=DemographicsListResponse)
async def get_all_demographics(
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    db: Session = Depends(get_db)
):
    """Get all demographics data (for research analysis)"""
    
    try:
        total_count = db.query(Demographics).count()
        demographics = db.query(Demographics).offset(offset).limit(limit).all()
        
        return DemographicsListResponse(
            demographics=demographics,
            total=total_count,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error(f"Error getting demographics: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{session_id}/validate", response_model=DemographicsValidate)
async def validate_demographics(session_id: str, db: Session = Depends(get_db)):
    """Validate if demographics data exists for a session"""
    
    try:
        session = db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        has_demographics = session.has_demographics if session else False

        demographics = db.query(Demographics).filter(
            Demographics.session_id == session_id
        ).first()

        demographics_exist = demographics is not None

        return DemographicsValidate(
            session_id=session_id,
            session_has_demographics=has_demographics,
            demographics_exist=demographics_exist
        )
        
    except Exception as e:
        logger.error(f"Error validating demographics: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/debug/status", response_model=DemographicsDebugResponse)
async def debug_demographics_status(db: Session = Depends(get_db)):
    """Debug endpoint to check demographics database status"""
    
    try:
        total_count = db.query(Demographics).count()
        recent = db.query(Demographics).order_by(Demographics.completed_at.desc()).limit(5).all()
        
        return DemographicsDebugResponse(
            table_exists=True,
            total_records=total_count,
            recent_records=len(recent),
            recent_session_ids=[r.session_id for r in recent],
            database_status="connected"
        )
        
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        return {
            "table_exists": False,
            "error": str(e),
            "database_status": "error"
        }