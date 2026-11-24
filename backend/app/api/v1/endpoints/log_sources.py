from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.log_source_service import LogSourceService
from app.schemas.log_source import LogSourceCreate, LogSourceUpdate, LogSourceResponse, LogSourceListResponse

router = APIRouter(prefix="/log-sources", tags=["Log Sources"])


@router.get(
    "",
    response_model=LogSourceListResponse,
    summary="List all configured log telemetry sources",
)
def list_log_sources(db: Session = Depends(get_db)):
    sources = LogSourceService.list_sources(db)
    return LogSourceListResponse(
        items=[LogSourceResponse(**s) for s in sources],
        total=len(sources),
    )


@router.post(
    "",
    response_model=LogSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new log telemetry source",
)
def create_log_source(
    payload: LogSourceCreate,
    db: Session = Depends(get_db),
):
    source = LogSourceService.create_source(db, payload)
    detail = LogSourceService.get_source(db, source.id)
    return LogSourceResponse(**detail)


@router.get(
    "/{source_id}",
    response_model=LogSourceResponse,
    summary="Get details and record counts for a log source",
)
def get_log_source(
    source_id: str,
    db: Session = Depends(get_db),
):
    detail = LogSourceService.get_source(db, source_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Log source '{source_id}' not found.")
    return LogSourceResponse(**detail)


@router.patch(
    "/{source_id}",
    response_model=LogSourceResponse,
    summary="Update editable metadata of a log source",
)
def update_log_source(
    source_id: str,
    payload: LogSourceUpdate,
    db: Session = Depends(get_db),
):
    source = LogSourceService.update_source(db, source_id, payload)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Log source '{source_id}' not found.")
    detail = LogSourceService.get_source(db, source.id)
    return LogSourceResponse(**detail)
