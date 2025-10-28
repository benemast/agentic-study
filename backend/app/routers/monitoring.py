# Create new file if doesn't exist
from fastapi import APIRouter, HTTPException
import datetime

from app.orchestrator.degradation import graceful_degradation
from app.orchestrator.llm.client import llm_client

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

@router.get("/degradation")
async def get_degradation_status():
    """Get current degradation status"""
    return graceful_degradation.get_state()

@router.get("/circuit-breaker")
async def get_circuit_breaker_status():
    """Get circuit breaker status"""
    return llm_client.get_circuit_breaker_state()

@router.get("/health")
async def health_check():
    """System health check"""
    degradation = graceful_degradation.get_state()
    circuit_breaker = llm_client.get_circuit_breaker_state()
    
    # Determine overall health
    if degradation['level'] == 'emergency':
        status = 'critical'
    elif degradation['level'] == 'minimal':
        status = 'degraded'
    elif circuit_breaker['state'] == 'open':
        status = 'degraded'
    else:
        status = 'healthy'
    
    return {
        'status': status,
        'degradation': degradation,
        'circuit_breaker': circuit_breaker,
        'timestamp': datetime.utcnow().isoformat()
    }

@router.post("/degradation/override")
async def set_degradation_override(level: str):
    """Manually set degradation level"""
    from app.orchestrator.degradation import DegradationLevel
    
    try:
        deg_level = DegradationLevel(level)
        graceful_degradation.set_manual_override(deg_level)
        return {"message": f"Degradation set to {level}"}
    except ValueError:
        raise HTTPException(400, f"Invalid level: {level}")