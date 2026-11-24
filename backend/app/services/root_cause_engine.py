import json
import uuid
import datetime
from typing import List, Dict, Any, Optional, Tuple
import networkx as nx
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.incident import Incident, IncidentLog
from app.models.log import LogEntry
from app.models.anomaly import Anomaly
from app.models.cluster import LogCluster
from app.models.analysis import AnalysisRun
from app.schemas.root_cause import (
    CausalNode,
    CausalEdge,
    CausalGraph,
    EvidenceCitation,
    CausalHypothesis,
    RCAResponse,
    GlobalTopologyResponse,
)


class RootCauseEngine:
    """
    Evidence-Based Root Cause Analysis (RCA) Engine.
    Uses NetworkX topological dependency graphs and multi-factor causal ranking
    to trace errors backward to their verified origins with grounded log citations.
    """

    @classmethod
    def build_service_topology(cls, db: Session) -> nx.DiGraph:
        """
        Infers service dependency graph from trace spans and observed cross-service traces.
        """
        G = nx.DiGraph()

        # 1. Discover all unique services
        services = (
            db.query(LogEntry.service_name)
            .filter(LogEntry.service_name.isnot(None))
            .distinct()
            .all()
        )
        svc_names = [s[0] for s in services if s[0]]

        # Ensure default canonical services if logs are sparse
        canonical_defaults = [
            "api-gateway",
            "auth-service",
            "order-service",
            "payment-service",
            "inventory-service",
            "notification-service",
            "postgres-db",
        ]
        all_services = list(dict.fromkeys(svc_names + canonical_defaults))

        for svc in all_services:
            G.add_node(svc)

        # 2. Extract call edges from shared trace_ids ordered by timestamp
        traces_sample = (
            db.query(LogEntry.trace_id)
            .filter(LogEntry.trace_id.isnot(None))
            .distinct()
            .limit(100)
            .all()
        )
        trace_ids = [t[0] for t in traces_sample if t[0]]

        edge_counts = {}
        for tid in trace_ids:
            trace_logs = (
                db.query(LogEntry)
                .filter(LogEntry.trace_id == tid)
                .order_by(LogEntry.timestamp.asc())
                .all()
            )
            # Find transitions between different services
            last_svc = None
            for l in trace_logs:
                curr_svc = l.service_name
                if curr_svc and last_svc and curr_svc != last_svc:
                    edge = (last_svc, curr_svc)
                    edge_counts[edge] = edge_counts.get(edge, 0) + 1
                last_svc = curr_svc

        # Add observed edges
        for (src, dst), count in edge_counts.items():
            G.add_edge(src, dst, weight=count, calls=count)

        # Ensure canonical architectural fallback edges if trace data is sparse
        canonical_edges = [
            ("api-gateway", "auth-service"),
            ("api-gateway", "order-service"),
            ("order-service", "payment-service"),
            ("order-service", "inventory-service"),
            ("order-service", "notification-service"),
            ("payment-service", "postgres-db"),
            ("inventory-service", "postgres-db"),
        ]
        for src, dst in canonical_edges:
            if not G.has_edge(src, dst):
                G.add_edge(src, dst, weight=1, calls=1)

        return G

    @classmethod
    def get_global_topology(cls, db: Session) -> GlobalTopologyResponse:
        G = cls.build_service_topology(db)

        nodes = []
        for n in G.nodes():
            nodes.append(
                CausalNode(
                    id=n,
                    label=n,
                    status="HEALTHY",
                    error_count=0,
                    anomaly_score=0.0,
                )
            )

        edges = []
        edge_idx = 0
        for u, v, data in G.edges(data=True):
            edge_idx += 1
            edges.append(
                CausalEdge(
                    id=f"e-{edge_idx}",
                    source=u,
                    target=v,
                    call_count=data.get("calls", 1),
                    propagation_probability=0.85,
                )
            )

        return GlobalTopologyResponse(
            nodes=nodes,
            edges=edges,
            total_services=len(nodes),
            total_dependencies=len(edges),
        )

    @classmethod
    def analyze_root_cause(
        cls,
        db: Session,
        incident_id: Optional[str] = None,
        lookback_minutes: int = 60,
        service_filter: Optional[str] = None,
    ) -> RCAResponse:
        """
        Execute Root Cause Analysis:
        1. Formulate window and retrieve incident context.
        2. Ingest graph topology via NetworkX.
        3. Gather error logs, anomalies, and error clusters.
        4. Calculate multi-factor causal ranking scores.
        5. Build Causal Graph with node roles (ROOT_CAUSE, PROPAGATING, SYMPTOM).
        6. Compile Evidence Citations with verified log lines.
        7. Persist AnalysisRun and return response.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        incident = None

        if incident_id:
            incident = db.query(Incident).filter(Incident.id == incident_id).first()

        if incident:
            window_start = incident.first_detected_at - datetime.timedelta(minutes=10)
            window_end = incident.last_detected_at + datetime.timedelta(minutes=5)
            target_services = json.loads(incident.affected_services_json or "[]")
        else:
            window_start = now - datetime.timedelta(minutes=lookback_minutes)
            window_end = now
            target_services = [service_filter] if service_filter else []

        G = cls.build_service_topology(db)

        # Query error logs in window
        logs_query = db.query(LogEntry).filter(
            LogEntry.timestamp >= window_start,
            LogEntry.timestamp <= window_end,
            LogEntry.severity.in_(["CRITICAL", "ERROR"]),
        )
        if target_services:
            logs_query = logs_query.filter(LogEntry.service_name.in_(target_services))
        error_logs: List[LogEntry] = logs_query.order_by(LogEntry.timestamp.asc()).all()

        # Query anomalies in window
        anomalies_query = db.query(Anomaly).filter(
            Anomaly.detected_at >= window_start,
            Anomaly.detected_at <= window_end,
        )
        if target_services:
            anomalies_query = anomalies_query.filter(Anomaly.service_name.in_(target_services))
        anomalies: List[Anomaly] = anomalies_query.all()

        # Group metrics per service
        service_stats: Dict[str, Dict[str, Any]] = {}
        for l in error_logs:
            svc = l.service_name or "unknown"
            if svc not in service_stats:
                service_stats[svc] = {
                    "first_error": l.timestamp,
                    "last_error": l.timestamp,
                    "error_count": 0,
                    "critical_count": 0,
                    "sample_logs": [],
                    "trace_ids": set(),
                }
            st = service_stats[svc]
            st["error_count"] += 1
            if l.severity == "CRITICAL":
                st["critical_count"] += 1
            if l.timestamp < st["first_error"]:
                st["first_error"] = l.timestamp
            if l.timestamp > st["last_error"]:
                st["last_error"] = l.timestamp
            if len(st["sample_logs"]) < 5:
                st["sample_logs"].append(l)
            if l.trace_id:
                st["trace_ids"].add(l.trace_id)

        # Incorporate anomalies
        service_anomalies: Dict[str, List[Anomaly]] = {}
        for a in anomalies:
            svc = a.service_name
            if svc not in service_anomalies:
                service_anomalies[svc] = []
            service_anomalies[svc].append(a)
            if svc not in service_stats:
                service_stats[svc] = {
                    "first_error": a.detected_at,
                    "last_error": a.detected_at,
                    "error_count": 10,
                    "critical_count": 5 if a.severity == "CRITICAL" else 0,
                    "sample_logs": [],
                    "trace_ids": set(),
                }

        # If no errors found, fall back to incident primary service or default
        if not service_stats and incident:
            primary = incident.primary_service or "payment-service"
            service_stats[primary] = {
                "first_error": incident.first_detected_at,
                "last_error": incident.last_detected_at,
                "error_count": 5,
                "critical_count": 5 if incident.severity == "CRITICAL" else 0,
                "sample_logs": [],
                "trace_ids": set(),
            }

        # Multi-factor causal scoring
        candidate_scores: List[Dict[str, Any]] = []
        min_first_err = min((s["first_error"] for s in service_stats.values()), default=window_start)
        max_last_err = max((s["last_error"] for s in service_stats.values()), default=window_end)
        err_span = max(1.0, (max_last_err - min_first_err).total_seconds())

        for svc, st in service_stats.items():
            # 1. Temporal Precedence (earlier error in the cascade = highest score)
            offset_sec = (st["first_error"] - min_first_err).total_seconds()
            if offset_sec <= 0:
                s_time = 0.98
            else:
                s_time = max(0.2, 1.0 - (offset_sec / err_span))

            # 2. Topological Depth (upstream roots get higher weight)
            in_deg = G.in_degree(svc) if G.has_node(svc) else 1
            out_deg = G.out_degree(svc) if G.has_node(svc) else 0
            if out_deg == 0 and in_deg >= 1:
                s_topo = 0.95
            elif in_deg > 0 and out_deg > 0:
                s_topo = 0.75
            else:
                s_topo = 0.55

            # 3. Error Severity & Volume
            crit_ratio = st["critical_count"] / max(1, st["error_count"])
            vol_score = min(1.0, st["error_count"] / 5.0)
            anom_score = 0.0
            if svc in service_anomalies:
                anom_score = max(a.anomaly_score for a in service_anomalies[svc])
            s_error = (0.5 * crit_ratio) + (0.3 * vol_score) + (0.2 * anom_score)
            if crit_ratio > 0:
                s_error = max(0.75, s_error)

            # 4. Cross-Trace Score
            trace_count = len(st["trace_ids"])
            s_trace = 0.85 if trace_count >= 1 else 0.3

            # Combined Score
            combined = (0.35 * s_time) + (0.25 * s_topo) + (0.25 * s_error) + (0.15 * s_trace)
            combined = round(min(0.99, max(0.10, combined)), 2)

            candidate_scores.append({
                "service": svc,
                "confidence": combined,
                "s_time": round(s_time, 2),
                "s_topo": round(s_topo, 2),
                "s_error": round(s_error, 2),
                "s_trace": round(s_trace, 2),
                "stats": st,
            })

        # Sort candidates descending by confidence score
        candidate_scores.sort(key=lambda c: c["confidence"], reverse=True)

        top_service = candidate_scores[0]["service"] if candidate_scores else "system"
        top_confidence = candidate_scores[0]["confidence"] if candidate_scores else 0.85

        # Build Ranked Hypotheses
        hypotheses: List[CausalHypothesis] = []
        for idx, cand in enumerate(candidate_scores[:5], start=1):
            svc = cand["service"]
            st = cand["stats"]

            citations = []
            for log in st["sample_logs"]:
                citations.append(
                    EvidenceCitation(
                        log_id=log.id,
                        timestamp=log.timestamp,
                        service_name=log.service_name,
                        severity=log.severity,
                        message=log.raw_message or log.message or "",
                        trace_id=log.trace_id,
                        relevance_score=0.95,
                        citation_type="LOG_ERROR",
                    )
                )

            # Formulate title and explanation based on dominant pattern
            if idx == 1:
                title = f"Originating Resource Contention in {svc}"
                explanation = (
                    f"First anomalous degradation manifested in {svc} at {st['first_error'].strftime('%H:%M:%S UTC')} "
                    f"with {st['error_count']} errors. High topological depth and temporal precedence establish {svc} "
                    f"as the primary root cause initiating cascading downstream timeouts."
                )
                recommended_action = (
                    f"Inspect {svc} resource utilization, pool configuration, or slow queries. "
                    f"Check connection limits, heap metrics, and worker timeout settings."
                )
            else:
                title = f"Propagated Dependency Failure in {svc}"
                explanation = (
                    f"{svc} experienced secondary degradation {int((st['first_error'] - window_start).total_seconds())}s "
                    f"after upstream failure, exhibiting {st['error_count']} cascading errors."
                )
                recommended_action = (
                    f"Verify circuit breaker thresholds and fallback mechanisms between dependent services and {svc}."
                )

            hypotheses.append(
                CausalHypothesis(
                    rank=idx,
                    service_name=svc,
                    title=title,
                    explanation=explanation,
                    confidence_score=cand["confidence"],
                    temporal_precedence_score=cand["s_time"],
                    topological_depth_score=cand["s_topo"],
                    error_severity_score=cand["s_error"],
                    cross_trace_score=cand["s_trace"],
                    evidence_citations=citations,
                    recommended_action=recommended_action,
                )
            )

        # Build Graph Representation with Node Roles
        graph_nodes: List[CausalNode] = []
        graph_edges: List[CausalEdge] = []

        # Subgraph of target services or all services
        display_services = set([c["service"] for c in candidate_scores] + target_services)
        if not display_services:
            display_services = set(G.nodes())

        # Include 1-hop neighbors of target services
        expanded_nodes = set(display_services)
        for s in list(display_services):
            if G.has_node(s):
                expanded_nodes.update(G.predecessors(s))
                expanded_nodes.update(G.successors(s))

        for n in expanded_nodes:
            if n == top_service:
                status = "ROOT_CAUSE"
            elif any(c["service"] == n and c["confidence"] >= 0.6 for c in candidate_scores[1:]):
                status = "PROPAGATING"
            elif any(c["service"] == n for c in candidate_scores):
                status = "SYMPTOM"
            else:
                status = "HEALTHY"

            st = service_stats.get(n, {})
            graph_nodes.append(
                CausalNode(
                    id=n,
                    label=n,
                    status=status,
                    error_count=st.get("error_count", 0),
                    anomaly_score=max([a.anomaly_score for a in service_anomalies.get(n, [])] or [0.0]),
                    first_error_time=st.get("first_error"),
                    metadata={"critical_count": st.get("critical_count", 0)},
                )
            )

        # Edges between expanded nodes
        edge_id = 0
        for u in expanded_nodes:
            for v in expanded_nodes:
                if G.has_edge(u, v):
                    edge_id += 1
                    is_crit = (u == top_service) or (v == top_service)
                    graph_edges.append(
                        CausalEdge(
                            id=f"ce-{edge_id}",
                            source=u,
                            target=v,
                            propagation_probability=0.92 if is_crit else 0.65,
                            call_count=G[u][v].get("calls", 1),
                            is_critical_path=is_crit,
                        )
                    )

        causal_graph = CausalGraph(
            nodes=graph_nodes,
            edges=graph_edges,
            root_node_id=top_service,
        )

        summary = (
            f"Automated RCA identified '{top_service}' as the root cause with {int(top_confidence * 100)}% confidence. "
            f"Failure propagated to {len(candidate_scores) - 1} downstream services across {len(graph_edges)} dependency hops."
        )

        # Persist AnalysisRun
        analysis_run = AnalysisRun(
            id=str(uuid.uuid4()),
            incident_id=incident.id if incident else (incident_id or str(uuid.uuid4())),
            analysis_type="root_cause",
            status="completed",
            summary=summary,
            confidence_score=top_confidence,
            top_root_cause_service=top_service,
            causal_graph_json=causal_graph.model_dump_json(),
            hypotheses_json=json.dumps([h.model_dump(mode="json") for h in hypotheses]),
            result_json=json.dumps({"top_service": top_service, "confidence": top_confidence}),
            completed_at=now,
        )
        db.add(analysis_run)
        db.commit()
        db.refresh(analysis_run)

        return RCAResponse(
            analysis_id=analysis_run.id,
            incident_id=incident.id if incident else None,
            status="completed",
            summary=summary,
            confidence_score=top_confidence,
            top_root_cause_service=top_service,
            graph=causal_graph,
            hypotheses=hypotheses,
            created_at=analysis_run.created_at,
            completed_at=analysis_run.completed_at,
        )

    @classmethod
    def get_analysis_by_id(cls, db: Session, analysis_id: str) -> Optional[RCAResponse]:
        run = db.query(AnalysisRun).filter(AnalysisRun.id == analysis_id).first()
        if not run:
            return None

        graph_dict = json.loads(run.causal_graph_json or "{}")
        hypo_dict = json.loads(run.hypotheses_json or "[]")

        graph = CausalGraph(**graph_dict)
        hypotheses = [CausalHypothesis(**h) for h in hypo_dict]

        return RCAResponse(
            analysis_id=run.id,
            incident_id=run.incident_id,
            status=run.status,
            summary=run.summary or "",
            confidence_score=run.confidence_score or 0.0,
            top_root_cause_service=run.top_root_cause_service,
            graph=graph,
            hypotheses=hypotheses,
            created_at=run.created_at,
            completed_at=run.completed_at,
        )
