import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.log import LogEntry
from app.models.incident import Incident
from app.models.anomaly import Anomaly
from app.services.root_cause_engine import RootCauseEngine


class AgentToolSet:
    """
    Sanctioned Read-Only Inspection Tools for the Gemini AI Troubleshooter Agent.
    Strictly query-only; zero arbitrary execution, zero destructive operations.
    """

    @classmethod
    def query_logs(
        cls,
        db: Session,
        service: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 10,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query system logs by service, severity, keyword search.
        """
        query = db.query(LogEntry)
        if service:
            query = query.filter(LogEntry.service_name == service)
        if severity and severity.upper() != "ALL":
            if severity.upper() in ["ERROR", "ERRORS"]:
                query = query.filter(LogEntry.severity.in_(["ERROR", "CRITICAL"]))
            else:
                query = query.filter(LogEntry.severity == severity.upper())
        if search:
            query = query.filter(LogEntry.raw_message.ilike(f"%{search}%"))

        logs = query.order_by(desc(LogEntry.timestamp)).limit(min(limit, 50)).all()
        results = []
        for l in logs:
            results.append({
                "log_id": l.id,
                "timestamp": l.timestamp.isoformat() if hasattr(l.timestamp, "isoformat") else str(l.timestamp),
                "service": l.service_name,
                "severity": l.severity,
                "message": l.raw_message or l.message or "",
                "trace_id": l.trace_id,
            })
        return results

    @classmethod
    def inspect_trace(cls, db: Session, trace_id: str) -> Dict[str, Any]:
        """
        Inspect a distributed trace waterfall across services.
        """
        logs = (
            db.query(LogEntry)
            .filter(LogEntry.trace_id == trace_id)
            .order_by(LogEntry.timestamp.asc())
            .all()
        )
        if not logs:
            return {"trace_id": trace_id, "found": False, "spans": []}

        spans = []
        services = set()
        has_error = False

        for l in logs:
            svc = l.service_name or "unknown"
            services.add(svc)
            if l.severity in ["CRITICAL", "ERROR"]:
                has_error = True
            spans.append({
                "log_id": l.id,
                "service": svc,
                "timestamp": l.timestamp.isoformat() if hasattr(l.timestamp, "isoformat") else str(l.timestamp),
                "severity": l.severity,
                "message": l.raw_message or l.message or "",
            })

        return {
            "trace_id": trace_id,
            "found": True,
            "span_count": len(spans),
            "services_involved": list(services),
            "has_critical_error": has_error,
            "spans": spans,
        }

    @classmethod
    def get_anomalies(
        cls,
        db: Session,
        service: Optional[str] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve recent statistical metric anomalies.
        """
        query = db.query(Anomaly)
        if service:
            query = query.filter(Anomaly.service_name == service)

        anomalies = query.order_by(desc(Anomaly.detected_at)).limit(min(limit, 20)).all()
        results = []
        for a in anomalies:
            results.append({
                "anomaly_id": a.id,
                "detected_at": a.detected_at.isoformat() if hasattr(a.detected_at, "isoformat") else str(a.detected_at),
                "service": a.service_name,
                "anomaly_type": a.anomaly_type,
                "severity": a.severity,
                "metric_name": a.metric_name,
                "observed_value": a.observed_value,
                "expected_value": a.expected_value,
                "confidence_score": a.anomaly_score,
            })
        return results

    @classmethod
    def get_incident_detail(cls, db: Session, incident_id: str) -> Dict[str, Any]:
        """
        Retrieve incident metadata, blast radius, and recorded timeline events.
        """
        inc = db.query(Incident).filter(Incident.id == incident_id).first()
        if not inc:
            return {"found": False, "incident_id": incident_id}

        affected = []
        try:
            if inc.affected_services_json:
                affected = json.loads(inc.affected_services_json)
        except Exception:
            affected = []

        timeline = []
        try:
            if inc.timeline_events_json:
                timeline = json.loads(inc.timeline_events_json)
        except Exception:
            timeline = []

        return {
            "found": True,
            "id": inc.id,
            "incident_number": inc.incident_number,
            "title": inc.title,
            "description": inc.description,
            "severity": inc.severity,
            "status": inc.status,
            "primary_service": inc.primary_service,
            "affected_services": affected,
            "root_cause_hypothesis": inc.root_cause_hypothesis,
            "first_detected_at": inc.first_detected_at.isoformat() if hasattr(inc.first_detected_at, "isoformat") else str(inc.first_detected_at),
            "timeline_events_count": len(timeline),
            "timeline_events": timeline[:10],
        }

    @classmethod
    def get_service_topology(cls, db: Session) -> Dict[str, Any]:
        """
        Retrieve service communication graph.
        """
        topo = RootCauseEngine.get_global_topology(db)
        return {
            "total_services": topo.total_services,
            "total_dependencies": topo.total_dependencies,
            "nodes": [n.model_dump() for n in topo.nodes],
            "edges": [e.model_dump() for e in topo.edges],
        }
