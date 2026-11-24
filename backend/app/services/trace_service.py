import json
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, case
from app.models.log import LogEntry
from app.schemas.search import (
    TraceSummaryItem,
    TraceListResponse,
    TraceSpanEvent,
    TraceDetailResponse,
)


class TraceService:
    @staticmethod
    def list_traces(
        db: Session,
        service_name: Optional[str] = None,
        has_errors: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[TraceSummaryItem], int]:
        # Filter down to entries that have trace_id
        base_query = db.query(LogEntry.trace_id).filter(LogEntry.trace_id.isnot(None))

        if service_name:
            base_query = base_query.filter(LogEntry.service_name == service_name)
        if search:
            base_query = base_query.filter(LogEntry.trace_id.ilike(f"%{search}%"))

        # Group by trace_id
        # Extract aggregate metrics per trace
        subq = (
            db.query(
                LogEntry.trace_id.label("trace_id"),
                func.count(LogEntry.id).label("event_count"),
                func.count(func.distinct(LogEntry.service_name)).label("service_count"),
                func.sum(
                    case_expr := case(
                        (LogEntry.severity.in_(["ERROR", "CRITICAL"]), 1),
                        else_=0,
                    )
                ).label("error_count"),
                func.min(LogEntry.timestamp).label("start_time"),
                func.max(LogEntry.timestamp).label("end_time"),
            )
            .filter(LogEntry.trace_id.isnot(None))
            .group_by(LogEntry.trace_id)
        )

        if service_name:
            subq = subq.filter(LogEntry.service_name == service_name)
        if search:
            subq = subq.filter(LogEntry.trace_id.ilike(f"%{search}%"))
        if has_errors is True:
            subq = subq.having(case_expr > 0)
        elif has_errors is False:
            subq = subq.having(case_expr == 0)

        total = subq.count()

        # Paginate
        offset = (page - 1) * page_size
        results = subq.order_by(desc("start_time")).offset(offset).limit(page_size).all()

        items: List[TraceSummaryItem] = []
        for row in results:
            t_id, evt_cnt, svc_cnt, err_cnt, s_time, e_time = row

            # Calculate duration in ms
            duration_ms = 0.0
            if s_time and e_time:
                duration_ms = max(0.0, (e_time - s_time).total_seconds() * 1000.0)

            # Get distinct services for this trace
            svc_rows = (
                db.query(LogEntry.service_name)
                .filter(LogEntry.trace_id == t_id)
                .distinct()
                .all()
            )
            services = [s[0] for s in svc_rows if s[0]]

            # Root service is the service of the earliest timestamp
            first_entry = (
                db.query(LogEntry.service_name)
                .filter(LogEntry.trace_id == t_id)
                .order_by(asc(LogEntry.timestamp))
                .first()
            )
            root_service = first_entry[0] if first_entry else (services[0] if services else "unknown")

            items.append(
                TraceSummaryItem(
                    trace_id=t_id,
                    service_count=svc_cnt,
                    event_count=evt_cnt,
                    error_count=int(err_cnt or 0),
                    start_time=s_time,
                    end_time=e_time,
                    duration_ms=round(duration_ms, 2),
                    root_service=root_service,
                    services=services,
                )
            )

        return items, total

    @staticmethod
    def get_trace_detail(db: Session, trace_id: str) -> Optional[TraceDetailResponse]:
        entries = (
            db.query(LogEntry)
            .filter(LogEntry.trace_id == trace_id)
            .order_by(asc(LogEntry.timestamp), asc(LogEntry.created_at))
            .all()
        )

        if not entries:
            return None

        first_ts = entries[0].timestamp
        last_ts = entries[-1].timestamp

        duration_ms = 0.0
        if first_ts and last_ts:
            duration_ms = max(0.0, (last_ts - first_ts).total_seconds() * 1000.0)

        events: List[TraceSpanEvent] = []
        services = set()
        request_ids = set()
        error_count = 0

        for entry in entries:
            services.add(entry.service_name)
            is_err = entry.severity in ("ERROR", "CRITICAL")
            if is_err:
                error_count += 1

            # Relative offset from trace start
            rel_ms = 0.0
            if first_ts and entry.timestamp:
                rel_ms = max(0.0, (entry.timestamp - first_ts).total_seconds() * 1000.0)

            # Metadata parsing
            meta = {}
            if entry.metadata_json:
                try:
                    meta = json.loads(entry.metadata_json)
                    if "request_id" in meta and meta["request_id"]:
                        request_ids.add(str(meta["request_id"]))
                except Exception:
                    meta = {}

            span_duration = meta.get("duration_ms")

            events.append(
                TraceSpanEvent(
                    id=entry.id,
                    timestamp=entry.timestamp,
                    service_name=entry.service_name,
                    severity=entry.severity,
                    message=entry.message,
                    span_id=entry.span_id,
                    relative_start_ms=round(rel_ms, 2),
                    duration_ms=float(span_duration) if span_duration else None,
                    is_error=is_err,
                    metadata=meta,
                    template_id=entry.template_id,
                )
            )

        return TraceDetailResponse(
            trace_id=trace_id,
            start_time=first_ts,
            end_time=last_ts,
            duration_ms=round(duration_ms, 2),
            total_events=len(entries),
            error_count=error_count,
            services=sorted(list(services)),
            request_ids=sorted(list(request_ids)),
            events=events,
        )
