from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.preference_service import PreferenceService
from app.schemas.preference import (
    WorkspacePreferenceResponse,
    WorkspacePreferenceUpdate,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "/preferences",
    response_model=WorkspacePreferenceResponse,
    summary="Retrieve Workspace Preferences",
)
def get_preferences(db: Session = Depends(get_db)):
    """
    Returns local workspace preferences (theme, display density, timezone, auto-refresh).
    """
    return PreferenceService.get_preferences(db=db)


@router.patch(
    "/preferences",
    response_model=WorkspacePreferenceResponse,
    summary="Update Workspace Preferences",
)
def update_preferences(
    update_data: WorkspacePreferenceUpdate,
    db: Session = Depends(get_db),
):
    """
    Updates local workspace preferences with validated values.
    """
    return PreferenceService.update_preferences(db=db, update_data=update_data)
