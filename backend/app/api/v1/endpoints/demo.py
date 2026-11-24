from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.demo_service import DemoService

router = APIRouter(prefix="/demo", tags=["demo"])


class AdvanceStageRequest(BaseModel):
    stage: Optional[int] = Field(None, ge=1, le=7, description="Target stage (1 to 7)")


@router.get("/status", response_model=Dict[str, Any])
def get_demo_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns the current progression of the 7-stage autonomous demonstration.
    """
    return DemoService.get_status(db)


@router.post("/advance", response_model=Dict[str, Any])
def advance_demo_stage(
    request: Optional[AdvanceStageRequest] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Executes a step in the 7-stage demonstration. If stage is omitted, advances to next stage.
    """
    status = DemoService.get_status(db)
    current = status["current_stage"]

    target_stage = request.stage if (request and request.stage) else (current + 1 if current < 7 else 1)
    if target_stage > 7:
        target_stage = 7

    try:
        result = DemoService.execute_stage(db, target_stage=target_stage)
        updated_status = DemoService.get_status(db)
        return {
            "execution": result,
            "demo_status": updated_status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset", response_model=Dict[str, Any])
def reset_demo(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Resets all demo-generated records back to baseline.
    """
    result = DemoService.reset_demo(db)
    status = DemoService.get_status(db)
    return {
        "result": result,
        "demo_status": status,
    }
