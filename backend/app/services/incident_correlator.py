import json
import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.incident import Incident, IncidentLog
from app.models.anomaly import Anomaly
from app.models.cluster import LogCluster
from app.models.log import LogEntry


class IncidentCorrelator:
    """
    Automated Multi-Signal Incident Correlation Engine.
    Correlates operational anomalies, pattern clusters, and error surges
    into unified incidents with timeline reconstruction and blast radius estimation.
    """

    @classmethod
    def _generate_incident_number(cls, db: Session) -> str:
        count = db.query(Incident).count()
        return f"INC-{1000 + count + 1}"

    @classmethod
    def correlate(
        cls,
        db: Session,
        lookback_minutes: int = 60,
        force_recorrelate: bool = False,
    ) -> Dict[str, Any]:
        """
        Scan recent anomalies and clusters within lookback_minutes,
        group them into correlated operational incidents, and persist them.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        start_threshold = now - datetime.timedelta(minutes=lookback_minutes)

        # 1. Fetch active/unresolved anomalies within lookback
        anomalies_query = db.query(Anomaly).filter(
            Anomaly.detected_at >= start_threshold
        )
        if not force_recorrelate:
            # Only consider active or acknowledged anomalies
            anomalies_query = anomalies_query.filter(
                Anomaly.status.in_(["ACTIVE", "ACKNOWLEDGED"])
            )
        anomalies: List[Anomaly] = anomalies_query.order_by(Anomaly.detected_at.asc()).all()

        # 2. Fetch high-severity clusters active within lookback
        clusters_query = db.query(LogCluster).filter(
            LogCluster.last_seen_at >= start_threshold,
            LogCluster.severity.in_(["CRITICAL", "ERROR", "WARNING"]),
            LogCluster.status == "ACTIVE",
        )
        clusters: List[LogCluster] = clusters_query.order_by(LogCluster.last_seen_at.asc()).all()

        if not anomalies and not clusters:
            return {
                "status": "COMPLETED",
                "incidents_created": 0,
                "incidents_updated": 0,
                "anomalies_correlated": 0,
                "clusters_correlated": 0,
                "incident_ids": [],
            }

        # 3. Sliding time-window grouping (15-minute tolerance)
        groups = []
        all_signals = []

        for a in anomalies:
            all_signals.append({
                "type": "ANOMALY",
                "id": a.id,
                "timestamp": a.detected_at,
                "service": a.service_name,
                "severity": a.severity,
                "score": a.anomaly_score,
                "anomaly_type": a.anomaly_type,
                "metric_name": a.metric_name,
                "observed": a.observed_value,
                "expected": a.expected_value,
                "context": a.context_payload,
            })

        for c in clusters:
            all_signals.append({
                "type": "CLUSTER",
                "id": c.id,
                "timestamp": c.last_seen_at,
                "service": c.service_name,
                "severity": c.severity,
                "score": 0.8 if c.severity == "CRITICAL" else 0.5,
                "template": c.template,
                "error_count": c.error_count,
                "sample_log_ids": c.sample_log_ids,
            })

        # Sort all signals chronologically
        all_signals.sort(key=lambda s: s["timestamp"])

        # Cluster signals whose timestamps are within 15 minutes of each other
        current_group = []
        for s in all_signals:
            if not current_group:
                current_group.append(s)
            else:
                last_time = current_group[-1]["timestamp"]
                # Time delta in seconds
                delta = abs((s["timestamp"] - last_time).total_seconds())
                if delta <= 900:  # 15 minutes
                    current_group.append(s)
                else:
                    groups.append(current_group)
                    current_group = [s]
        if current_group:
            groups.append(current_group)

        created_count = 0
        updated_count = 0
        incident_ids = []
        correlated_anomalies_count = 0
        correlated_clusters_count = 0

        # 4. Formulate incidents from groups
        for group in groups:
            # Group attributes
            services = list(dict.fromkeys([item["service"] for item in group if item["service"]]))
            if not services:
                services = ["system"]

            # Chronological bounds
            first_ts = min(item["timestamp"] for item in group)
            last_ts = max(item["timestamp"] for item in group)

            # Max severity
            severities = [item["severity"] for item in group]
            if "CRITICAL" in severities:
                final_severity = "CRITICAL"
            elif "HIGH" in severities or "ERROR" in severities:
                final_severity = "HIGH"
            elif "MEDIUM" in severities or "WARNING" in severities:
                final_severity = "MEDIUM"
            else:
                final_severity = "LOW"

            primary_service = services[0]

            # Collect IDs
            anomaly_ids = [item["id"] for item in group if item["type"] == "ANOMALY"]
            cluster_ids = [item["id"] for item in group if item["type"] == "CLUSTER"]

            correlated_anomalies_count += len(anomaly_ids)
            correlated_clusters_count += len(cluster_ids)

            # Build timeline
            timeline_events = []
            sample_log_ids_to_link = set()

            for item in group:
                if item["type"] == "ANOMALY":
                    ts_iso = item["timestamp"].isoformat() if hasattr(item["timestamp"], "isoformat") else str(item["timestamp"])
                    timeline_events.append({
                        "timestamp": ts_iso,
                        "event_type": "ANOMALY_DETECTED",
                        "service": item["service"],
                        "description": f"Statistical anomaly detected on {item['service']} ({item['metric_name']}: observed {item['observed']:.2f} vs expected {item['expected']:.2f})",
                        "metadata": {
                            "anomaly_id": item["id"],
                            "anomaly_type": item["anomaly_type"],
                            "anomaly_score": item["score"],
                        },
                    })
                    # Sample log IDs from context
                    if item.get("context"):
                        try:
                            ctx = json.loads(item["context"]) if isinstance(item["context"], str) else item["context"]
                            for lid in ctx.get("sample_log_ids", []):
                                sample_log_ids_to_link.add(str(lid))
                        except Exception:
                            pass
                elif item["type"] == "CLUSTER":
                    ts_iso = item["timestamp"].isoformat() if hasattr(item["timestamp"], "isoformat") else str(item["timestamp"])
                    timeline_events.append({
                        "timestamp": ts_iso,
                        "event_type": "CLUSTER_SPIKE",
                        "service": item["service"],
                        "description": f"Error cluster pattern observed on {item['service']}: '{item['template']}' ({item['error_count']} errors)",
                        "metadata": {
                            "cluster_id": item["id"],
                            "severity": item["severity"],
                        },
                    })
                    if item.get("sample_log_ids"):
                        try:
                            s_ids = json.loads(item["sample_log_ids"]) if isinstance(item["sample_log_ids"], str) else item["sample_log_ids"]
                            for lid in s_ids:
                                sample_log_ids_to_link.add(str(lid))
                        except Exception:
                            pass

            # Title and description formulation
            if len(services) > 1:
                title = f"Cascading Service Failure across {', '.join(services[:3])}"
                description = f"Correlated multi-service incident spanning {len(services)} services ({', '.join(services)}) with {len(anomaly_ids)} anomaly detections and {len(cluster_ids)} recurring error patterns."
            else:
                svc = services[0]
                dominant_anomaly = next((item for item in group if item["type"] == "ANOMALY"), None)
                if dominant_anomaly:
                    title = f"{dominant_anomaly['anomaly_type'].replace('_', ' ').title()} in {svc}"
                    description = f"Detected significant operational degradation in {svc} triggered by {dominant_anomaly['metric_name']} deviation."
                else:
                    title = f"Recurring Error Surge in {svc}"
                    description = f"Detected recurring error clusters in {svc} with {len(cluster_ids)} distinct patterns."

            root_hypothesis = f"Initial anomalous signal surfaced in {primary_service} at {first_ts.strftime('%H:%M:%S UTC')} before propagating to dependent components."

            # Check for existing open incident to deduplicate
            existing_incident = (
                db.query(Incident)
                .filter(
                    Incident.status.in_(["active", "investigating"]),
                    Incident.primary_service == primary_service,
                )
                .first()
            )

            if existing_incident:
                # Merge into existing incident
                existing_services = json.loads(existing_incident.affected_services_json or "[]")
                merged_services = list(dict.fromkeys(existing_services + services))
                existing_incident.affected_services_json = json.dumps(merged_services)

                # Merge anomalies & clusters
                existing_anoms = json.loads(existing_incident.anomaly_ids_json or "[]")
                merged_anoms = list(set(existing_anoms + anomaly_ids))
                existing_incident.anomaly_ids_json = json.dumps(merged_anoms)

                existing_clusts = json.loads(existing_incident.cluster_ids_json or "[]")
                merged_clusts = list(set(existing_clusts + cluster_ids))
                existing_incident.cluster_ids_json = json.dumps(merged_clusts)

                # Merge timeline
                existing_timeline = json.loads(existing_incident.timeline_events_json or "[]")
                existing_timeline.extend(timeline_events)
                # Deduplicate and sort timeline
                existing_timeline.sort(key=lambda e: e.get("timestamp", ""))
                existing_incident.timeline_events_json = json.dumps(existing_timeline)

                if last_ts > existing_incident.last_detected_at:
                    existing_incident.last_detected_at = last_ts

                # Escalate severity if incoming is higher
                if final_severity == "CRITICAL":
                    existing_incident.severity = "CRITICAL"
                elif final_severity == "HIGH" and existing_incident.severity in ["MEDIUM", "LOW"]:
                    existing_incident.severity = "HIGH"

                incident_ids.append(existing_incident.id)
                updated_count += 1
                incident_to_link = existing_incident
            else:
                # Create brand new incident
                inc_num = cls._generate_incident_number(db)
                new_incident = Incident(
                    id=str(uuid.uuid4()),
                    incident_number=inc_num,
                    title=title,
                    description=description,
                    severity=final_severity,
                    status="active",
                    primary_service=primary_service,
                    affected_services_json=json.dumps(services),
                    root_cause_hypothesis=root_hypothesis,
                    timeline_events_json=json.dumps(timeline_events),
                    metrics_snapshot_json=json.dumps({
                        "anomaly_count": len(anomaly_ids),
                        "cluster_count": len(cluster_ids),
                        "signal_count": len(group),
                    }),
                    anomaly_ids_json=json.dumps(anomaly_ids),
                    cluster_ids_json=json.dumps(cluster_ids),
                    first_detected_at=first_ts,
                    last_detected_at=last_ts,
                )
                db.add(new_incident)
                db.flush()
                incident_ids.append(new_incident.id)
                created_count += 1
                incident_to_link = new_incident

            # Link sample logs to IncidentLog
            for lid in list(sample_log_ids_to_link)[:20]:
                log_exists = db.query(LogEntry).filter(LogEntry.id == lid).first()
                if log_exists:
                    already_linked = (
                        db.query(IncidentLog)
                        .filter(
                            IncidentLog.incident_id == incident_to_link.id,
                            IncidentLog.log_entry_id == lid,
                        )
                        .first()
                    )
                    if not already_linked:
                        db.add(IncidentLog(incident_id=incident_to_link.id, log_entry_id=lid))

        db.commit()

        return {
            "status": "COMPLETED",
            "incidents_created": created_count,
            "incidents_updated": updated_count,
            "anomalies_correlated": correlated_anomalies_count,
            "clusters_correlated": correlated_clusters_count,
            "incident_ids": incident_ids,
        }
