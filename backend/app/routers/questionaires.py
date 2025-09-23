# backend/app/routers/questionaires.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
import json
from datetime import datetime, timedelta

from app.database import get_db
from app.models.questionaires import Demographics
from app.models.session import Session as SessionModel, Interaction as InteractionModel
from app.schemas.questionaires import (
    DemographicsCreate, 
    DemographicsUpdate, 
    DemographicsResponse,
    DemographicsSummary,
    DemographicsAnalytics
)

router = APIRouter(prefix="/api/questionaires", tags=["questionaires"])