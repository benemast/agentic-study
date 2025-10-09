from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, true
from typing import List, Optional, Dict, Any
import json
from datetime import datetime, timedelta


router = APIRouter(prefix="/api/sentry", tags=["sentry"])

@router.get("/debug")
async def trigger_error():
    division_by_zero = 1 / 0