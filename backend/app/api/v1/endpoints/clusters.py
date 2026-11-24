from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.cluster_service import ClusterService
from app.schemas.cluster import (
    ClusterResponse,
    ClusterDetailResponse,
    ClusterListResponse,
    ClusterStatusUpdate,
    ClusterMineRequest,
    ClusterMineResponse,
    ClusterStatisticsResponse,
)

router = APIRouter(prefix="/clusters", tags=["Log Clustering"])


@router.get("", response_model=ClusterListResponse)
def list_clusters(
    service: Optional[str] = Query(None, description="Filter by service name"),
    severity: Optional[str] = Query(None, description="Filter by severity (INFO, WARNING, ERROR, CRITICAL)"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, MUTED, RESOLVED)"),
    search: Optional[str] = Query(None, description="Search template text or name"),
    sort_by: str = Query("occurrence_count", description="Sort by occurrence_count, error_count, last_seen_at"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Query mined log clusters with frequency ranking, parameter search, and pagination.
    """
    service_layer = ClusterService(db)
    items, total = service_layer.list_clusters(
        service=service,
        severity=severity,
        status=status,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )

    total_pages = max(1, (total + page_size - 1) // page_size)
    return ClusterListResponse(
        items=[ClusterResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/statistics", response_model=ClusterStatisticsResponse)
def get_cluster_statistics(db: Session = Depends(get_db)):
    """
    Retrieve summary statistics: total clusters, error groups, new clusters in 24h, and top patterns.
    """
    service_layer = ClusterService(db)
    stats = service_layer.get_cluster_statistics()
    return ClusterStatisticsResponse(**stats)


@router.post("/mine", response_model=ClusterMineResponse)
def mine_clusters(
    body: ClusterMineRequest,
    db: Session = Depends(get_db),
):
    """
    Execute Drain3 template mining and pattern aggregation across recent log records.
    """
    service_layer = ClusterService(db)
    result = service_layer.mine_and_cluster_logs(
        service_name=body.service_name,
        hours=body.hours,
        limit=body.limit,
    )
    return ClusterMineResponse(**result)


@router.get("/{cluster_id}", response_model=ClusterDetailResponse)
def get_cluster_detail(cluster_id: str, db: Session = Depends(get_db)):
    """
    Retrieve full template diagnostics, variable parameters, evolutionary timeline, and member log records.
    """
    service_layer = ClusterService(db)
    detail = service_layer.get_cluster_detail(cluster_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log cluster with ID {cluster_id} not found",
        )

    c = detail["cluster"]
    return ClusterDetailResponse(
        id=c.id,
        signature_hash=c.signature_hash,
        name=c.name,
        service_name=c.service_name,
        template=c.template,
        pattern_regex=c.pattern_regex,
        severity=c.severity,
        occurrence_count=c.occurrence_count,
        error_count=c.error_count,
        sample_log_ids=c.sample_log_ids,
        variable_parameters=c.variable_parameters,
        status=c.status,
        first_seen_at=c.first_seen_at,
        last_seen_at=c.last_seen_at,
        created_at=c.created_at,
        timeline=detail["timeline"],
        member_logs=detail["member_logs"],
    )


@router.patch("/{cluster_id}/status", response_model=ClusterResponse)
def update_cluster_status(
    cluster_id: str,
    body: ClusterStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update cluster lifecycle state (ACTIVE, MUTED, RESOLVED).
    """
    service_layer = ClusterService(db)
    updated = service_layer.update_cluster_status(cluster_id, body.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log cluster with ID {cluster_id} not found",
        )
    return ClusterResponse.model_validate(updated)
