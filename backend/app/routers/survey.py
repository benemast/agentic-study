# backend/app/routers/survey.py
"""
Survey API Router
Handles post-task survey submission and retrieval
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import logging

from app.database import get_db
from app.models.survey import SurveyResponse
from app.models.session import Session as SessionModel
from app.schemas.survey import (
    SurveyResponseCreate, SurveyResponseBase, SurveyResponseWithScores,
    SurveySubmitResponse, SurveyListResponse, SurveyResponseSummary,
    SurveyErrorResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/survey", tags=["survey"])


# ============================================================
# SUBMIT SURVEY
# ============================================================

@router.post("/submit", response_model=SurveySubmitResponse, status_code=status.HTTP_201_CREATED)
async def submit_survey(
    survey_data: SurveyResponseCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a completed post-task survey
    
    - Validates all survey responses
    - Checks for duplicate submissions
    - Stores in database with computed duration
    - Returns confirmation with survey ID
    
    **Note:** Each participant can submit one survey per task per condition.
    Duplicate submissions will return 409 Conflict.
    """
    logger.info(f"Survey submission started for participant={survey_data.participant_id}, "
                f"task={survey_data.task_number}, condition={survey_data.condition}")
    
    try:
        # 1. Verify session exists
        session = db.query(SessionModel).filter(
            SessionModel.session_id == survey_data.session_id
        ).first()
        
        if not session:
            logger.warning(f"Survey submission failed: Session {survey_data.session_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {survey_data.session_id} not found"
            )
        
        # 2. Check for duplicate submission
        existing = db.query(SurveyResponse).filter(
            SurveyResponse.participant_id == survey_data.participant_id,
            SurveyResponse.task_number == survey_data.task_number,
            SurveyResponse.condition == survey_data.condition
        ).first()
        
        if existing:
            logger.warning(f"Duplicate survey submission detected: "
                          f"participant={survey_data.participant_id}, "
                          f"task={survey_data.task_number}, "
                          f"condition={survey_data.condition}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Survey already submitted for participant {survey_data.participant_id}, "
                       f"task {survey_data.task_number}, condition {survey_data.condition}"
            )
        
        # 3. Create survey response
        survey = SurveyResponse(**survey_data.model_dump())
        
        db.add(survey)
        db.commit()
        db.refresh(survey)
        
        logger.info(f"Survey submitted successfully: id={survey.id}, "
                   f"participant={survey.participant_id}, "
                   f"duration={survey.duration_seconds}s")
        
        return SurveySubmitResponse(
            success=True,
            message="Survey submitted successfully",
            survey_id=survey.id,
            participant_id=survey.participant_id,
            task_number=survey.task_number,
            condition=survey.condition,
            duration_seconds=survey.duration_seconds
        )
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error during survey submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Survey submission failed due to constraint violation. "
                   "This may indicate a duplicate submission."
        )
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during survey submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving the survey. Please try again."
        )
    
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during survey submission: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )


# ============================================================
# GET SURVEY BY ID
# ============================================================

@router.get("/{survey_id}", response_model=SurveyResponseWithScores)
async def get_survey(
    survey_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific survey response by ID
    
    Returns the complete survey with computed hypothesis scores.
    """
    survey = db.query(SurveyResponse).filter(SurveyResponse.id == survey_id).first()
    
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey {survey_id} not found"
        )
    
    # Build response with computed scores
    response_data = SurveyResponseBase.model_validate(survey).model_dump()
    response_data.update({
        'nasa_tlx_overall_workload': survey.nasa_tlx_overall_workload,
        'h1a_control_score': survey.h1a_control_score,
        'h1b_engagement_score': survey.h1b_engagement_score,
        'h1d_confidence_score': survey.h1d_confidence_score,
        'h3_understanding_score': survey.h3_understanding_score,
        'efficiency_score': survey.efficiency_score,
        'effectiveness_score': survey.effectiveness_score,
    })
    
    return SurveyResponseWithScores(**response_data)


# ============================================================
# GET SURVEYS BY PARTICIPANT
# ============================================================

@router.get("/participant/{participant_id}", response_model=SurveyListResponse)
async def get_participant_surveys(
    participant_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all surveys for a specific participant
    
    Returns surveys ordered by completion time (most recent first).
    """
    surveys = db.query(SurveyResponse).filter(
        SurveyResponse.participant_id == participant_id
    ).order_by(desc(SurveyResponse.completed_at)).all()
    
    summaries = []
    for survey in surveys:
        summary_data = {
            'id': survey.id,
            'participant_id': survey.participant_id,
            'task_number': survey.task_number,
            'condition': survey.condition,
            'completed_at': survey.completed_at,
            'duration_seconds': survey.duration_seconds,
            'nasa_tlx_overall_workload': survey.nasa_tlx_overall_workload,
            'h1a_control_score': survey.h1a_control_score,
            'h1b_engagement_score': survey.h1b_engagement_score,
            'h3_understanding_score': survey.h3_understanding_score,
        }
        summaries.append(SurveyResponseSummary(**summary_data))
    
    return SurveyListResponse(
        surveys=summaries,
        total=len(summaries),
        page=1,
        per_page=len(summaries)
    )


# ============================================================
# GET SURVEYS BY SESSION
# ============================================================

@router.get("/session/{session_id}", response_model=SurveyListResponse)
async def get_session_surveys(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all surveys for a specific session
    
    Returns surveys ordered by task number.
    """
    surveys = db.query(SurveyResponse).filter(
        SurveyResponse.session_id == session_id
    ).order_by(SurveyResponse.task_number).all()
    
    summaries = []
    for survey in surveys:
        summary_data = {
            'id': survey.id,
            'participant_id': survey.participant_id,
            'task_number': survey.task_number,
            'condition': survey.condition,
            'completed_at': survey.completed_at,
            'duration_seconds': survey.duration_seconds,
            'nasa_tlx_overall_workload': survey.nasa_tlx_overall_workload,
            'h1a_control_score': survey.h1a_control_score,
            'h1b_engagement_score': survey.h1b_engagement_score,
            'h3_understanding_score': survey.h3_understanding_score,
        }
        summaries.append(SurveyResponseSummary(**summary_data))
    
    return SurveyListResponse(
        surveys=summaries,
        total=len(summaries),
        page=1,
        per_page=len(summaries)
    )


# ============================================================
# LIST ALL SURVEYS (Admin)
# ============================================================

@router.get("/", response_model=SurveyListResponse)
async def list_surveys(
    condition: Optional[str] = None,
    task_number: Optional[int] = None,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db)
):
    """
    List all surveys with optional filtering
    
    **Query Parameters:**
    - condition: Filter by condition ('workflow_builder' or 'ai_assistant')
    - task_number: Filter by task (1 or 2)
    - page: Page number (default: 1)
    - per_page: Results per page (default: 50, max: 100)
    """
    # Validate parameters
    if per_page > 100:
        per_page = 100
    
    if condition and condition not in ['workflow_builder', 'ai_assistant']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="condition must be 'workflow_builder' or 'ai_assistant'"
        )
    
    if task_number and task_number not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="task_number must be 1 or 2"
        )
    
    # Build query
    query = db.query(SurveyResponse)
    
    if condition:
        query = query.filter(SurveyResponse.condition == condition)
    
    if task_number:
        query = query.filter(SurveyResponse.task_number == task_number)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    surveys = query.order_by(desc(SurveyResponse.completed_at)).offset(offset).limit(per_page).all()
    
    # Build summaries
    summaries = []
    for survey in surveys:
        summary_data = {
            'id': survey.id,
            'participant_id': survey.participant_id,
            'task_number': survey.task_number,
            'condition': survey.condition,
            'completed_at': survey.completed_at,
            'duration_seconds': survey.duration_seconds,
            'nasa_tlx_overall_workload': survey.nasa_tlx_overall_workload,
            'h1a_control_score': survey.h1a_control_score,
            'h1b_engagement_score': survey.h1b_engagement_score,
            'h3_understanding_score': survey.h3_understanding_score,
        }
        summaries.append(SurveyResponseSummary(**summary_data))
    
    return SurveyListResponse(
        surveys=summaries,
        total=total,
        page=page,
        per_page=per_page
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@router.get("/health/check")
async def survey_health_check():
    """Health check endpoint for survey service"""
    return {
        "status": "healthy",
        "service": "survey",
        "timestamp": datetime.utcnow().isoformat()
    }