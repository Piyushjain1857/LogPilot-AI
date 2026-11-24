import time
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.system_service import SystemService
from app.schemas.system import SystemStatusResponse, SystemCapabilitiesResponse

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/status", response_model=SystemStatusResponse, summary="System Status & Telemetry")
def get_system_status(request: Request, db: Session = Depends(get_db)):
    """
    Returns actual backend availability, database connectivity, uptime,
    environment, and Gemini AI configuration status.
    """
    start_time = getattr(request.app.state, "server_start_time", time.time())
    return SystemService.get_system_status(db=db, server_start_time=start_time)


@router.get("/capabilities", response_model=SystemCapabilitiesResponse, summary="Subsystem Implementation Status")
def get_system_capabilities():
    """
    Returns truthful readiness statuses for all platform subsystems.
    """
    return SystemService.get_system_capabilities()
