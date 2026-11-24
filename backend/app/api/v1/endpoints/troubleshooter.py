from fastapi import APIRouter, Depends, Path, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.troubleshooter import (
    TroubleshooterRequest,
    TroubleshooterResponse,
    TroubleshooterChatRequest,
    TroubleshooterChatResponse,
)
from app.agent.troubleshooter import GeminiTroubleshooter

router = APIRouter()


@router.post(
    "/investigate",
    response_model=TroubleshooterResponse,
    summary="Trigger Autonomous AI Diagnostic Investigation",
)
def run_investigation(
    req: TroubleshooterRequest = TroubleshooterRequest(),
    db: Session = Depends(get_db),
):
    """
    Executes an autonomous ReAct troubleshooting loop using read-only database tools,
    extracting trace spans, analyzing anomalies, and synthesizing a 4-perspective diagnosis.
    """
    return GeminiTroubleshooter.investigate(
        db=db,
        incident_id=req.incident_id,
        query=req.query,
        target_service=req.target_service,
    )


@router.get(
    "/investigations/{investigation_id}",
    response_model=TroubleshooterResponse,
    summary="Get Investigation Run by ID",
)
def get_investigation_by_id(
    investigation_id: str = Path(..., description="Unique investigation identifier"),
):
    """
    Retrieves stored investigation results, ReAct thought steps, and playbook recommendations.
    """
    inv = GeminiTroubleshooter.get_investigation(investigation_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation with ID '{investigation_id}' not found.",
        )
    return inv


@router.post(
    "/chat",
    response_model=TroubleshooterChatResponse,
    summary="Interactive Grounded Troubleshooting Chat",
)
def chat_with_troubleshooter(
    req: TroubleshooterChatRequest,
    db: Session = Depends(get_db),
):
    """
    Interactive conversation with LogPilot AI Troubleshooter, grounded in verified log citations.
    """
    return GeminiTroubleshooter.chat(
        db=db,
        message=req.message,
        investigation_id=req.investigation_id,
        incident_id=req.incident_id,
    )
