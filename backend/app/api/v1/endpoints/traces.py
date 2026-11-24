from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.trace_service import TraceService
from app.schemas.search import TraceListResponse, TraceDetailResponse

router = APIRouter(prefix="/traces", tags=["Distributed Traces"])


@router.get(
    "",
    response_model=TraceListResponse,
    summary="List distributed traces with event counts, errors, duration, and participating services",
)
def list_traces(
    service: Optional[str] = Query(None, description="Filter by service name"),
    has_errors: Optional[bool] = Query(None, description="Filter traces with errors"),
    search: Optional[str] = Query(None, description="Trace ID search term"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = TraceService.list_traces(
        db=db,
        service_name=service,
        has_errors=has_errors,
        search=search,
        page=page,
        page_size=page_size,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return TraceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{trace_id}",
    response_model=TraceDetailResponse,
    summary="Get detailed chronological timeline and span waterfall for a distributed trace",
)
def get_trace_detail(
    trace_id: str,
    db: Session = Depends(get_db),
):
    detail = TraceService.get_trace_detail(db, trace_id=trace_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace '{trace_id}' not found or contains no associated log events.",
        )
    return detail
