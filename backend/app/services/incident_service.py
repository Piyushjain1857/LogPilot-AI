import json
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.incident import Incident, IncidentLog
from app.models.log import LogEntry
from app.schemas.incident import (
    IncidentResponse,
    IncidentDetailResponse,
    IncidentListResponse,
    IncidentStatisticsResponse,
    IncidentStatusUpdate,
    IncidentAddNoteRequest,
    TimelineEvent,
)


class IncidentService:
    """
    CRUD and Operational Management for Incidents.
    """

    @classmethod
    def list_incidents(
        cls,
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        service: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> IncidentListResponse:
        query = db.query(Incident)

        if status and status.upper() != "ALL":
            # Support case-insensitive status matching
            query = query.filter(func.lower(Incident.status) == status.lower())

        if severity and severity.upper() != "ALL":
            query = query.filter(func.upper(Incident.severity) == severity.upper())

        if service:
            query = query.filter(
                (Incident.primary_service == service)
                | (Incident.affected_services_json.like(f"%{service}%"))
            )

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Incident.title.ilike(search_pattern))
                | (Incident.description.ilike(search_pattern))
                | (Incident.incident_number.ilike(search_pattern))
            )

        total = query.count()
        total_pages = max(1, (total + page_size - 1) // page_size)

        incidents = (
            query.order_by(desc(Incident.last_detected_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        items = []
        for inc in incidents:
            items.append(cls._to_response(inc))

        return IncidentListResponse(
            incidents=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_incident_detail(cls, db: Session, incident_id: str) -> Optional[IncidentDetailResponse]:
        inc = db.query(Incident).filter(Incident.id == incident_id).first()
        if not inc:
            return None

        base = cls._to_response(inc)

        # Parse timeline events
        timeline_raw = []
        try:
            if inc.timeline_events_json:
                timeline_raw = json.loads(inc.timeline_events_json)
        except Exception:
            timeline_raw = []

        timeline_events = []
        for ev in timeline_raw:
            try:
                ts = datetime.datetime.fromisoformat(ev["timestamp"]) if "T" in str(ev.get("timestamp")) else datetime.datetime.now(datetime.timezone.utc)
            except Exception:
                ts = datetime.datetime.now(datetime.timezone.utc)
            timeline_events.append(
                TimelineEvent(
                    timestamp=ts,
                    event_type=ev.get("event_type", "EVENT"),
                    service=ev.get("service"),
                    description=ev.get("description", ""),
                    metadata=ev.get("metadata", {}),
                )
            )

        # Parse metrics snapshot
        metrics = {}
        try:
            if inc.metrics_snapshot_json:
                metrics = json.loads(inc.metrics_snapshot_json)
        except Exception:
            metrics = {}

        # Parse anomalies & clusters
        anomaly_ids = []
        try:
            if inc.anomaly_ids_json:
                anomaly_ids = json.loads(inc.anomaly_ids_json)
        except Exception:
            anomaly_ids = []

        cluster_ids = []
        try:
            if inc.cluster_ids_json:
                cluster_ids = json.loads(inc.cluster_ids_json)
        except Exception:
            cluster_ids = []

        # Fetch sample logs linked to this incident
        sample_logs = []
        incident_logs = (
            db.query(LogEntry)
            .join(IncidentLog, IncidentLog.log_entry_id == LogEntry.id)
            .filter(IncidentLog.incident_id == incident_id)
            .order_by(desc(LogEntry.timestamp))
            .limit(15)
            .all()
        )
        for log in incident_logs:
            sample_logs.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if hasattr(log.timestamp, "isoformat") else str(log.timestamp),
                "service": log.service_name,
                "severity": log.severity,
                "message": log.raw_message,
                "trace_id": log.trace_id,
            })

        return IncidentDetailResponse(
            id=base.id,
            incident_number=base.incident_number,
            title=base.title,
            description=base.description,
            severity=base.severity,
            status=base.status,
            primary_service=base.primary_service,
            affected_services=base.affected_services,
            root_cause_hypothesis=base.root_cause_hypothesis,
            first_detected_at=base.first_detected_at,
            last_detected_at=base.last_detected_at,
            mitigated_at=base.mitigated_at,
            resolved_at=base.resolved_at,
            created_at=base.created_at,
            updated_at=base.updated_at,
            anomaly_count=base.anomaly_count,
            cluster_count=base.cluster_count,
            assigned_to=base.assigned_to,
            timeline_events=timeline_events,
            metrics_snapshot=metrics,
            anomaly_ids=anomaly_ids,
            cluster_ids=cluster_ids,
            resolution_notes=inc.resolution_notes,
            sample_logs=sample_logs,
        )

    @classmethod
    def update_status(
        cls,
        db: Session,
        incident_id: str,
        update: IncidentStatusUpdate,
    ) -> Optional[IncidentDetailResponse]:
        inc = db.query(Incident).filter(Incident.id == incident_id).first()
        if not inc:
            return None

        old_status = inc.status
        new_status = update.status.lower()
        inc.status = new_status
        now = datetime.datetime.now(datetime.timezone.utc)

        if update.assigned_to is not None:
            inc.assigned_to = update.assigned_to

        if update.resolution_notes is not None:
            inc.resolution_notes = update.resolution_notes

        if new_status == "mitigated" and not inc.mitigated_at:
            inc.mitigated_at = now
        elif new_status in ["resolved", "closed"] and not inc.resolved_at:
            inc.resolved_at = now
            if not inc.mitigated_at:
                inc.mitigated_at = now

        # Append status change to timeline
        timeline = []
        try:
            if inc.timeline_events_json:
                timeline = json.loads(inc.timeline_events_json)
        except Exception:
            timeline = []

        timeline.append({
            "timestamp": now.isoformat(),
            "event_type": "STATUS_CHANGED",
            "service": inc.primary_service or "system",
            "description": f"Incident status changed from '{old_status.upper()}' to '{new_status.upper()}'.",
            "metadata": {
                "old_status": old_status,
                "new_status": new_status,
                "assigned_to": inc.assigned_to,
            },
        })
        inc.timeline_events_json = json.dumps(timeline)

        db.commit()
        db.refresh(inc)

        return cls.get_incident_detail(db, incident_id)

    @classmethod
    def add_note(
        cls,
        db: Session,
        incident_id: str,
        note_req: IncidentAddNoteRequest,
    ) -> Optional[IncidentDetailResponse]:
        inc = db.query(Incident).filter(Incident.id == incident_id).first()
        if not inc:
            return None

        now = datetime.datetime.now(datetime.timezone.utc)
        timeline = []
        try:
            if inc.timeline_events_json:
                timeline = json.loads(inc.timeline_events_json)
        except Exception:
            timeline = []

        timeline.append({
            "timestamp": now.isoformat(),
            "event_type": "NOTE_ADDED",
            "service": inc.primary_service or "operator",
            "description": f"[{note_req.author or 'Operator'}] {note_req.note}",
            "metadata": {
                "author": note_req.author,
            },
        })
        inc.timeline_events_json = json.dumps(timeline)

        db.commit()
        db.refresh(inc)

        return cls.get_incident_detail(db, incident_id)

    @classmethod
    def get_statistics(cls, db: Session) -> IncidentStatisticsResponse:
        all_incidents = db.query(Incident).all()

        total = len(all_incidents)
        active = sum(1 for i in all_incidents if i.status in ["active", "investigating"])
        critical = sum(1 for i in all_incidents if i.severity == "CRITICAL" and i.status in ["active", "investigating"])
        mitigated = sum(1 for i in all_incidents if i.status == "mitigated")
        resolved = sum(1 for i in all_incidents if i.status in ["resolved", "closed"])

        # Calculate Mean Time to Resolution (MTTR)
        durations = []
        for i in all_incidents:
            if i.resolved_at and i.first_detected_at:
                try:
                    delta = (i.resolved_at - i.first_detected_at).total_seconds()
                    if delta >= 0:
                        durations.append(delta)
                except Exception:
                    pass

        mttr = float(sum(durations) / len(durations)) if durations else 0.0

        severity_counts = {}
        status_counts = {}
        for i in all_incidents:
            sev = i.severity.upper() if i.severity else "UNKNOWN"
            stat = i.status.lower() if i.status else "unknown"
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            status_counts[stat] = status_counts.get(stat, 0) + 1

        return IncidentStatisticsResponse(
            total_incidents=total,
            active_incidents=active,
            critical_incidents=critical,
            mitigated_incidents=mitigated,
            resolved_incidents=resolved,
            mttr_seconds=round(mttr, 1),
            severity_breakdown=severity_counts,
            status_breakdown=status_counts,
        )

    @classmethod
    def _to_response(cls, inc: Incident) -> IncidentResponse:
        affected = []
        try:
            if inc.affected_services_json:
                affected = json.loads(inc.affected_services_json)
        except Exception:
            affected = []

        anomaly_count = 0
        try:
            if inc.anomaly_ids_json:
                anomaly_count = len(json.loads(inc.anomaly_ids_json))
        except Exception:
            anomaly_count = 0

        cluster_count = 0
        try:
            if inc.cluster_ids_json:
                cluster_count = len(json.loads(inc.cluster_ids_json))
        except Exception:
            cluster_count = 0

        return IncidentResponse(
            id=inc.id,
            incident_number=inc.incident_number,
            title=inc.title,
            description=inc.description,
            severity=inc.severity,
            status=inc.status,
            primary_service=inc.primary_service,
            affected_services=affected,
            root_cause_hypothesis=inc.root_cause_hypothesis,
            first_detected_at=inc.first_detected_at,
            last_detected_at=inc.last_detected_at,
            mitigated_at=inc.mitigated_at,
            resolved_at=inc.resolved_at,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            anomaly_count=anomaly_count,
            cluster_count=cluster_count,
            assigned_to=inc.assigned_to,
        )
