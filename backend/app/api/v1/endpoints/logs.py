from typing import Optional
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.log_service import LogService
from app.schemas.log import LogListResponse, LogEntryResponse

router = APIRouter(prefix="/logs", tags=["Logs Explorer"])


@router.get(
    "",
    response_model=LogListResponse,
    summary="Query stored log entries with server-side filtering and pagination",
)
def list_logs(
    source_id: Optional[str] = Query(None),
    upload_batch_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    items, total = LogService.list_logs(
        db=db,
        source_id=source_id,
        upload_batch_id=upload_batch_id,
        severity=severity,
        service_name=service_name,
        search=search,
        page=page,
        page_size=page_size,
    )
    total_pages = ceil(total / page_size) if total > 0 else 1
    return LogListResponse(
        items=[LogEntryResponse.model_validate(it) for it in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{log_id}",
    response_model=LogEntryResponse,
    summary="Get redacted detail of an individual log record",
)
def get_log_detail(
    log_id: str,
    db: Session = Depends(get_db),
):
    log = LogService.get_log(db, log_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Log entry '{log_id}' not found.")
    return LogEntryResponse.model_validate(log)
