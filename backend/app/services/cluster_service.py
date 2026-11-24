import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_

from app.models.log import LogEntry
from app.models.cluster import LogCluster, ClusterEvolution
from app.clustering.miner import LogClusterEngine


class ClusterService:
    def __init__(self, db: Session):
        self.db = db
        self.engine = LogClusterEngine()

    def mine_and_cluster_logs(
        self,
        service_name: Optional[str] = None,
        hours: int = 24,
        limit: int = 2000,
    ) -> Dict[str, Any]:
        """
        Ingest and cluster historical or recent logs using Drain3 template mining.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        since = now - datetime.timedelta(hours=hours)

        query = self.db.query(LogEntry).filter(
            or_(LogEntry.timestamp >= since, LogEntry.timestamp.is_(None))
        )
        if service_name:
            query = query.filter(LogEntry.service_name == service_name)

        logs = query.order_by(LogEntry.timestamp.desc()).limit(limit).all()
        if not logs:
            total_active = self.db.query(func.count(LogCluster.id)).filter(LogCluster.status == "ACTIVE").scalar() or 0
            return {
                "status": "COMPLETED",
                "logs_processed": 0,
                "clusters_created": 0,
                "clusters_updated": 0,
                "total_active_clusters": total_active,
            }

        clusters_created = 0
        clusters_updated = 0

        # Current hour bucket for evolutionary trend tracking
        current_hour = now.replace(minute=0, second=0, microsecond=0)

        for log in logs:
            svc = log.service_name or "unknown"
            raw_msg = log.message or ""
            is_error = str(log.severity).upper() in ("ERROR", "CRITICAL")

            mined = self.engine.mine_log(raw_msg, svc)
            sig_hash = mined["signature_hash"]
            template_text = mined["template"]
            name = mined["name"]
            vars_found = mined["variables"]

            # Lookup existing cluster
            cluster = self.db.query(LogCluster).filter(
                LogCluster.service_name == svc,
                LogCluster.signature_hash == sig_hash,
            ).first()

            log_ts = log.timestamp or now

            if not cluster:
                cluster = LogCluster(
                    signature_hash=sig_hash,
                    name=name,
                    service_name=svc,
                    template=template_text,
                    severity=log.severity or "INFO",
                    occurrence_count=1,
                    error_count=1 if is_error else 0,
                    sample_log_ids=[log.id],
                    variable_parameters=vars_found,
                    status="ACTIVE",
                    first_seen_at=log_ts,
                    last_seen_at=log_ts,
                    created_at=now,
                )
                self.db.add(cluster)
                self.db.flush()
                clusters_created += 1
            else:
                cluster.occurrence_count += 1
                if is_error:
                    cluster.error_count += 1
                if cluster.last_seen_at < log_ts:
                    cluster.last_seen_at = log_ts

                # Update severity if higher
                if is_error and cluster.severity not in ("ERROR", "CRITICAL"):
                    cluster.severity = log.severity

                # Append sample log IDs
                samples = cluster.sample_log_ids or []
                if log.id not in samples and len(samples) < 20:
                    samples.append(log.id)
                    cluster.sample_log_ids = samples

                # Merge variable samples
                curr_vars = cluster.variable_parameters or {}
                for k, vals in vars_found.items():
                    if k not in curr_vars:
                        curr_vars[k] = []
                    for v in vals:
                        if v not in curr_vars[k] and len(curr_vars[k]) < 5:
                            curr_vars[k].append(v)
                cluster.variable_parameters = curr_vars

                clusters_updated += 1

            # Associate log with cluster
            log.template_id = cluster.id

            # Update ClusterEvolution point
            evol = self.db.query(ClusterEvolution).filter(
                ClusterEvolution.cluster_id == cluster.id,
                ClusterEvolution.timestamp == current_hour,
            ).first()

            if not evol:
                evol = ClusterEvolution(
                    cluster_id=cluster.id,
                    timestamp=current_hour,
                    window_count=1,
                    anomaly_detected=False,
                )
                self.db.add(evol)
            else:
                evol.window_count += 1

        self.db.commit()

        total_active = self.db.query(func.count(LogCluster.id)).filter(LogCluster.status == "ACTIVE").scalar() or 0
        return {
            "status": "COMPLETED",
            "logs_processed": len(logs),
            "clusters_created": clusters_created,
            "clusters_updated": clusters_updated,
            "total_active_clusters": total_active,
        }

    def list_clusters(
        self,
        service: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "occurrence_count",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 25,
    ) -> Tuple[List[LogCluster], int]:
        """Query and paginate clusters with filters and search."""
        query = self.db.query(LogCluster)

        if service:
            query = query.filter(LogCluster.service_name == service)
        if severity and severity.upper() != "ALL":
            query = query.filter(LogCluster.severity == severity.upper())
        if status and status.upper() != "ALL":
            query = query.filter(LogCluster.status == status.upper())
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    LogCluster.template.ilike(term),
                    LogCluster.name.ilike(term),
                    LogCluster.service_name.ilike(term),
                )
            )

        # Sorting
        order_col = LogCluster.occurrence_count
        if sort_by == "error_count":
            order_col = LogCluster.error_count
        elif sort_by == "last_seen_at":
            order_col = LogCluster.last_seen_at
        elif sort_by == "created_at":
            order_col = LogCluster.created_at

        if sort_order.lower() == "asc":
            query = query.order_by(asc(order_col))
        else:
            query = query.order_by(desc(order_col))

        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        return items, total

    def get_cluster_detail(self, cluster_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full cluster diagnostics, evolutionary timeline, and sample members."""
        cluster = self.db.query(LogCluster).filter(LogCluster.id == cluster_id).first()
        if not cluster:
            return None

        # Fetch evolution timeline
        evolutions = (
            self.db.query(ClusterEvolution)
            .filter(ClusterEvolution.cluster_id == cluster_id)
            .order_by(ClusterEvolution.timestamp.asc())
            .all()
        )
        timeline = [
            {
                "timestamp": e.timestamp,
                "count": e.window_count,
                "anomaly_detected": e.anomaly_detected,
            }
            for e in evolutions
        ]

        # Fetch member logs
        sample_ids = cluster.sample_log_ids or []
        logs = []
        if sample_ids:
            logs = self.db.query(LogEntry).filter(LogEntry.id.in_(sample_ids)).limit(20).all()
        if not logs:
            logs = self.db.query(LogEntry).filter(
                LogEntry.service_name == cluster.service_name,
                LogEntry.template_id == cluster.id,
            ).limit(20).all()

        member_logs = [
            {
                "id": l.id,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
                "severity": l.severity,
                "message": l.message,
                "trace_id": l.trace_id,
            }
            for l in logs
        ]

        return {
            "cluster": cluster,
            "timeline": timeline,
            "member_logs": member_logs,
        }

    def update_cluster_status(self, cluster_id: str, status: str) -> Optional[LogCluster]:
        """Update cluster status between ACTIVE, MUTED, RESOLVED."""
        cluster = self.db.query(LogCluster).filter(LogCluster.id == cluster_id).first()
        if not cluster:
            return None
        cluster.status = status
        self.db.commit()
        self.db.refresh(cluster)
        return cluster

    def get_cluster_statistics(self) -> Dict[str, Any]:
        """Aggregate summary metrics for the clustering subsystem."""
        total = self.db.query(func.count(LogCluster.id)).scalar() or 0
        active = self.db.query(func.count(LogCluster.id)).filter(LogCluster.status == "ACTIVE").scalar() or 0
        muted = self.db.query(func.count(LogCluster.id)).filter(LogCluster.status == "MUTED").scalar() or 0
        resolved = self.db.query(func.count(LogCluster.id)).filter(LogCluster.status == "RESOLVED").scalar() or 0

        now = datetime.datetime.now(datetime.timezone.utc)
        day_ago = now - datetime.timedelta(hours=24)
        new_24h = self.db.query(func.count(LogCluster.id)).filter(LogCluster.first_seen_at >= day_ago).scalar() or 0

        total_grouped_errors = self.db.query(func.sum(LogCluster.error_count)).scalar() or 0

        # Top 5 clusters by occurrence
        top_clusters_raw = (
            self.db.query(LogCluster)
            .filter(LogCluster.status == "ACTIVE")
            .order_by(desc(LogCluster.occurrence_count))
            .limit(5)
            .all()
        )

        top_clusters = [
            {
                "id": c.id,
                "name": c.name or c.template[:30],
                "template": c.template,
                "service_name": c.service_name,
                "severity": c.severity,
                "occurrence_count": c.occurrence_count,
                "error_count": c.error_count,
            }
            for c in top_clusters_raw
        ]

        return {
            "total_clusters": total,
            "active_clusters": active,
            "muted_clusters": muted,
            "resolved_clusters": resolved,
            "new_last_24h": new_24h,
            "total_grouped_errors": int(total_grouped_errors),
            "top_clusters": top_clusters,
        }
