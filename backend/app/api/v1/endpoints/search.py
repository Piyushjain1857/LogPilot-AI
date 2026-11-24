from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.search_service import SearchService
from app.services.export_service import ExportService
from app.schemas.search import (
    AdvancedSearchRequest,
    SearchResponse,
    SearchFilters,
    SuggestionItem,
    SavedSearchCreate,
    SavedSearchUpdate,
    SavedSearchResponse,
    SearchHistoryResponse,
    ExportRequest,
)

router = APIRouter(tags=["Search & Exploration"])


@router.get(
    "/logs/search",
    response_model=SearchResponse,
    summary="Search logs with safe query syntax, full-text FTS5, and metadata filters",
)
def search_logs(
    q: Optional[str] = Query(None, description="Search query string with AND, OR, NOT, field:val"),
    severity: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    trace_id: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    template_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("timestamp"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    filters = SearchFilters(
        severity=severity,
        service_name=service,
        trace_id=trace_id,
        environment=environment,
        template_id=template_id,
    )
    return SearchService.execute_search(
        db=db,
        query_str=q,
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        track_history=True,
    )


@router.post(
    "/logs/advanced-search",
    response_model=SearchResponse,
    summary="Advanced search endpoint supporting complex JSON filters and query syntax",
)
def advanced_search(
    request: AdvancedSearchRequest,
    db: Session = Depends(get_db),
):
    return SearchService.execute_search(
        db=db,
        query_str=request.query,
        filters=request.filters,
        page=request.page,
        page_size=request.page_size,
        sort_by=request.sort_by,
        sort_order=request.sort_order,
        track_history=True,
    )


@router.get(
    "/logs/search/suggestions",
    response_model=List[SuggestionItem],
    summary="Get search suggestions and syntax autocompletions",
)
def get_search_suggestions(
    prefix: str = Query("", description="Input prefix for suggestions"),
    db: Session = Depends(get_db),
):
    return SearchService.get_suggestions(db, prefix=prefix)


@router.post(
    "/logs/export",
    summary="Export search results to CSV or JSON with Formula Injection Defense",
)
def export_logs(
    request: ExportRequest,
    db: Session = Depends(get_db),
):
    # Fetch records up to limit
    search_res = SearchService.execute_search(
        db=db,
        query_str=request.query,
        filters=request.filters,
        page=1,
        page_size=request.limit,
        sort_by="timestamp",
        sort_order="desc",
        track_history=False,
    )

    records = [it.model_dump() for it in search_res.items]

    if request.format.lower() == "json":
        json_content = ExportService.generate_json(records)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=logpilot_export.json"},
        )

    # Default CSV
    csv_content = ExportService.generate_csv(records, fields=request.fields)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=logpilot_export.csv"},
    )


# --- Saved Searches ---

@router.get(
    "/search/saved",
    response_model=List[SavedSearchResponse],
    summary="List all saved search queries",
)
def list_saved_searches(db: Session = Depends(get_db)):
    searches = SearchService.list_saved_searches(db)
    return [SavedSearchResponse.model_validate(s) for s in searches]


@router.post(
    "/search/saved",
    response_model=SavedSearchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a search query",
)
def create_saved_search(
    data: SavedSearchCreate,
    db: Session = Depends(get_db),
):
    search = SearchService.create_saved_search(db, data)
    return SavedSearchResponse.model_validate(search)


@router.patch(
    "/search/saved/{search_id}",
    response_model=SavedSearchResponse,
    summary="Update a saved search query",
)
def update_saved_search(
    search_id: str,
    data: SavedSearchUpdate,
    db: Session = Depends(get_db),
):
    search = SearchService.update_saved_search(db, search_id, data)
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved search not found")
    return SavedSearchResponse.model_validate(search)


@router.delete(
    "/search/saved/{search_id}",
    summary="Delete a saved search query",
)
def delete_saved_search(
    search_id: str,
    db: Session = Depends(get_db),
):
    success = SearchService.delete_saved_search(db, search_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved search not found")
    return {"status": "deleted", "id": search_id}


@router.get(
    "/search/history",
    response_model=List[SearchHistoryResponse],
    summary="Get recent search history",
)
def get_search_history(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    history = SearchService.list_history(db, limit=limit)
    return [SearchHistoryResponse.model_validate(h) for h in history]
