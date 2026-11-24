import time
import json
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_
from app.models.log import LogEntry
from app.models.saved_search import SavedSearch, SearchHistory
from app.services.query_parser import QueryParser
from app.services.fts_service import FTSService
from app.schemas.search import (
    SearchFilters,
    SearchResultItem,
    SearchStats,
    SearchResponse,
    SuggestionItem,
    SavedSearchCreate,
    SavedSearchUpdate,
)


class SearchService:
    @staticmethod
    def execute_search(
        db: Session,
        query_str: Optional[str] = None,
        filters: Optional[SearchFilters] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "timestamp",
        sort_order: str = "desc",
        track_history: bool = True,
    ) -> SearchResponse:
        start_time = time.perf_counter()
        query_str = (query_str or "").strip()

        # 1. Attempt FTS5 if there are free-text terms in query
        fts_matches: Dict[str, str] = {}
        fts_enabled = FTSService.is_fts_supported(db)

        if query_str and fts_enabled:
            fts_query = QueryParser.extract_fts_query(query_str)
            if fts_query:
                fts_matches = FTSService.search(db, fts_query, limit=1000)

        # 2. Build SQLAlchemy base query
        base_query = db.query(LogEntry)

        # Apply parsed query filter
        if query_str:
            filter_expr = QueryParser.build_sqlalchemy_filter(
                query_str,
                fts_results=list(fts_matches.keys()) if fts_matches else None,
            )
            if filter_expr is not None:
                base_query = base_query.filter(filter_expr)

        # 3. Apply structured filters
        if filters:
            if filters.severity:
                base_query = base_query.filter(func.lower(LogEntry.severity) == filters.severity.lower())
            if filters.severities:
                base_query = base_query.filter(LogEntry.severity.in_(filters.severities))
            if filters.service_name:
                base_query = base_query.filter(func.lower(LogEntry.service_name) == filters.service_name.lower())
            if filters.services:
                base_query = base_query.filter(LogEntry.service_name.in_(filters.services))
            if filters.source_id:
                base_query = base_query.filter(LogEntry.source_id == filters.source_id)
            if filters.trace_id:
                base_query = base_query.filter(LogEntry.trace_id == filters.trace_id)
            if filters.span_id:
                base_query = base_query.filter(LogEntry.span_id == filters.span_id)
            if filters.template_id:
                base_query = base_query.filter(LogEntry.template_id == filters.template_id)
            if filters.parsing_status:
                base_query = base_query.filter(LogEntry.parsing_status == filters.parsing_status)
            if filters.start_time:
                base_query = base_query.filter(LogEntry.timestamp >= filters.start_time)
            if filters.end_time:
                base_query = base_query.filter(LogEntry.timestamp <= filters.end_time)
            if filters.environment:
                base_query = base_query.filter(
                    LogEntry.metadata_json.ilike(f'%"environment": "{filters.environment}"%')
                )
            if filters.request_id:
                base_query = base_query.filter(
                    LogEntry.metadata_json.ilike(f'%"request_id": "{filters.request_id}"%')
                )

        # Total count
        total = base_query.count()

        # Sorting
        sort_col = getattr(LogEntry, sort_by, LogEntry.timestamp)
        order_fn = desc if sort_order.lower() == "desc" else asc
        ordered_query = base_query.order_by(order_fn(sort_col))

        # Pagination
        offset = (page - 1) * page_size
        results = ordered_query.offset(offset).limit(page_size).all()

        # Compute query statistics & breakdown
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        # Quick breakdown by severity and service across matched set
        sev_counts: Dict[str, int] = {}
        matched_services: List[str] = []
        if total > 0:
            sev_rows = (
                base_query.with_entities(LogEntry.severity, func.count(LogEntry.id))
                .group_by(LogEntry.severity)
                .all()
            )
            sev_counts = {row[0]: row[1] for row in sev_rows if row[0]}

            svc_rows = (
                base_query.with_entities(LogEntry.service_name)
                .distinct()
                .limit(10)
                .all()
            )
            matched_services = [row[0] for row in svc_rows if row[0]]

        # Construct items with snippet highlighting
        items: List[SearchResultItem] = []
        for entry in results:
            meta = {}
            if entry.metadata_json:
                try:
                    meta = json.loads(entry.metadata_json)
                except Exception:
                    meta = {}

            snippet = fts_matches.get(entry.id)

            items.append(
                SearchResultItem(
                    id=entry.id,
                    source_id=entry.source_id,
                    upload_batch_id=entry.upload_batch_id,
                    ingestion_batch_id=entry.ingestion_batch_id,
                    external_event_id=entry.external_event_id,
                    ingestion_method=entry.ingestion_method,
                    timestamp=entry.timestamp,
                    severity=entry.severity,
                    service_name=entry.service_name,
                    message=entry.message,
                    raw_message=entry.raw_message,
                    trace_id=entry.trace_id,
                    span_id=entry.span_id,
                    template_id=entry.template_id,
                    line_number=entry.line_number,
                    parsing_status=entry.parsing_status,
                    metadata=meta,
                    highlight_snippet=snippet,
                    created_at=entry.created_at,
                )
            )

        total_pages = max(1, (total + page_size - 1) // page_size)

        # Record search history if user query was supplied
        if track_history and query_str:
            try:
                hist = SearchHistory(
                    query=query_str,
                    filters_json=json.dumps(filters.model_dump()) if filters else None,
                    result_count=total,
                    execution_time_ms=round(duration_ms, 2),
                )
                db.add(hist)
                db.commit()
            except Exception:
                db.rollback()

        stats = SearchStats(
            total_matches=total,
            query_duration_ms=round(duration_ms, 2),
            fts_enabled=fts_enabled,
            matched_services=matched_services,
            severity_breakdown=sev_counts,
        )

        return SearchResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            stats=stats,
        )

    @staticmethod
    def get_suggestions(db: Session, prefix: str = "") -> List[SuggestionItem]:
        suggestions: List[SuggestionItem] = []
        prefix = (prefix or "").strip().lower()

        # Syntax operator suggestions
        syntax_operators = [
            ("AND", "Boolean AND", "operator", "service:auth AND severity:ERROR"),
            ("OR", "Boolean OR", "operator", "severity:ERROR OR severity:CRITICAL"),
            ("NOT", "Boolean NOT (exclude)", "operator", "NOT severity:INFO"),
            ('""', "Exact phrase search", "operator", '"connection timeout"'),
            ("severity:", "Filter by severity level", "field", "severity:ERROR"),
            ("service:", "Filter by service name", "field", "service:payment-service"),
            ("trace_id:", "Filter by distributed trace identifier", "field", "trace_id:trace-001"),
            ("environment:", "Filter by deployment tier", "field", "environment:production"),
            ("template_id:", "Filter by Drain3 template identifier", "field", "template_id:tmpl-1"),
        ]

        for val, label, cat, ex in syntax_operators:
            if not prefix or prefix in val.lower() or prefix in label.lower():
                suggestions.append(SuggestionItem(value=val, label=label, category=cat, example=ex))

        # Dynamic services from DB
        try:
            services = [
                r[0]
                for r in db.query(LogEntry.service_name).distinct().limit(15).all()
                if r[0]
            ]
            for s in services:
                if not prefix or prefix in s.lower():
                    suggestions.append(
                        SuggestionItem(
                            value=f"service:{s}",
                            label=f"Service: {s}",
                            category="value",
                            example=f"service:{s} AND severity:ERROR",
                        )
                    )
        except Exception:
            pass

        return suggestions[:20]

    # --- Saved Searches CRUD ---
    @staticmethod
    def create_saved_search(db: Session, data: SavedSearchCreate) -> SavedSearch:
        search = SavedSearch(
            name=data.name,
            query=data.query,
            description=data.description,
            filters_json=json.dumps(data.filters) if data.filters else None,
        )
        db.add(search)
        db.commit()
        db.refresh(search)
        return search

    @staticmethod
    def list_saved_searches(db: Session) -> List[SavedSearch]:
        return db.query(SavedSearch).order_by(desc(SavedSearch.updated_at)).all()

    @staticmethod
    def get_saved_search(db: Session, search_id: str) -> Optional[SavedSearch]:
        return db.query(SavedSearch).filter(SavedSearch.id == search_id).first()

    @staticmethod
    def update_saved_search(db: Session, search_id: str, data: SavedSearchUpdate) -> Optional[SavedSearch]:
        search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
        if not search:
            return None
        if data.name is not None:
            search.name = data.name
        if data.query is not None:
            search.query = data.query
        if data.description is not None:
            search.description = data.description
        if data.filters is not None:
            search.filters_json = json.dumps(data.filters)
        search.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(search)
        return search

    @staticmethod
    def delete_saved_search(db: Session, search_id: str) -> bool:
        search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
        if not search:
            return False
        db.delete(search)
        db.commit()
        return True

    @staticmethod
    def list_history(db: Session, limit: int = 25) -> List[SearchHistory]:
        return db.query(SearchHistory).order_by(desc(SearchHistory.created_at)).limit(limit).all()
