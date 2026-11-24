import json
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.playbook import RemediationPlaybook, RemediationAuditLog
from app.models.incident import Incident
from app.models.log import LogEntry


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Allowlisted operational command prefixes for security
ALLOWLISTED_COMMAND_PREFIXES = (
    "select", "show", "alter system set", "kubectl", "curl", "redis-cli",
    "df", "du", "find", "logrotate", "monitor", "check", "for i in"
)

# Forbidden dangerous patterns
DANGEROUS_PATTERNS = [
    r"rm\s+-rf\s+/",
    r"mkfs",
    r"dd\s+if=",
    r":\(\)\s*\{\s*:\|:&\s*\};:",
    r">/dev/sd",
    r"chmod\s+-R\s+777\s+/",
    r"cat\s+/etc/shadow",
]

DEFAULT_PLAYBOOKS_DATA = [
    {
        "playbook_number": "PB-101",
        "slug": "postgres-pool-recovery",
        "title": "PostgreSQL Connection Pool Recovery & Lock Mitigation",
        "category": "DATABASE",
        "target_service": "postgres-primary",
        "risk_level": "SAFE",
        "estimated_downtime": "0 seconds (Online Dynamic Reconfiguration)",
        "description": "Recovers exhausted database connection pool slots by terminating abandoned idle transactions and dynamically adjusting connection headroom without server restart.",
        "steps": [
            {
                "step_number": 1,
                "name": "Verify Connection Saturation & Locking Backends",
                "description": "Inspects pg_stat_activity to quantify total active, idle, and waiting connection sessions.",
                "command": "SELECT count(*), state FROM pg_stat_activity GROUP BY state;",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A (Read-only inspection)",
                "verification_command": "CHECK connection_count < max_connections",
                "status": "pending",
            },
            {
                "step_number": 2,
                "name": "Terminate Idle In-Transaction Sessions",
                "description": "Terminates hanging worker transactions holding row locks on tables without releasing connections for >2 minutes.",
                "command": "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < current_timestamp - INTERVAL '2 minutes';",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A (Terminated clients safely reconnect automatically)",
                "verification_command": "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction';",
                "status": "pending",
            },
            {
                "step_number": 3,
                "name": "Dynamically Increment Max Connections Ceiling",
                "description": "Increments max_connections from 100 to 200 and triggers runtime config reload.",
                "command": "ALTER SYSTEM SET max_connections = '200'; SELECT pg_reload_conf();",
                "safety_tier": "CAUTION",
                "requires_approval": True,
                "approved": False,
                "rollback_command": "ALTER SYSTEM SET max_connections = '100'; SELECT pg_reload_conf();",
                "verification_command": "SHOW max_connections;",
                "status": "pending",
            },
            {
                "step_number": 4,
                "name": "Reset Upstream Service Connection Pool Backoff",
                "description": "Notifies application connection pools to reset backoff counters and acquire healthy handles.",
                "command": "curl -s -X POST http://order-service:8080/actuator/pools/reset",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A",
                "verification_command": "curl -s http://order-service:8080/actuator/health/db",
                "status": "pending",
            },
        ],
    },
    {
        "playbook_number": "PB-102",
        "slug": "k8s-oom-pod-restart",
        "title": "Kubernetes OOMKilled Pod Rolling Restart & Memory Headroom",
        "category": "CONTAINER",
        "target_service": "payment-service",
        "risk_level": "CAUTION",
        "estimated_downtime": "0 seconds (Rolling Pod Replacement)",
        "description": "Safely captures diagnostic thread dumps before executing zero-downtime rolling restart and updating container memory limits to prevent recurring OOM panic.",
        "steps": [
            {
                "step_number": 1,
                "name": "Audit Memory Saturation and Restart Counts",
                "description": "Queries Kubernetes API metrics to determine pod memory thresholds and termination exit codes.",
                "command": "kubectl top pod -l app=payment-service --namespace=production",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A (Read-only query)",
                "verification_command": "kubectl get pods -l app=payment-service -n production",
                "status": "pending",
            },
            {
                "step_number": 2,
                "name": "Capture JVM Heap Histogram & Thread Diagnostic",
                "description": "Dumps active memory allocation histogram into diagnostic container scratch volume for forensic RCA.",
                "command": "kubectl exec -n production deploy/payment-service -- jcmd 1 GC.class_histogram > /tmp/heap_histogram.txt",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "kubectl exec -n production deploy/payment-service -- rm -f /tmp/heap_histogram.txt",
                "verification_command": "kubectl exec -n production deploy/payment-service -- test -s /tmp/heap_histogram.txt",
                "status": "pending",
            },
            {
                "step_number": 3,
                "name": "Execute Zero-Downtime Rolling Deployment Restart",
                "description": "Triggers progressive rolling rollout so healthy replacement pods stand up before old pods terminate.",
                "command": "kubectl rollout restart deployment/payment-service -n production",
                "safety_tier": "CAUTION",
                "requires_approval": True,
                "approved": False,
                "rollback_command": "kubectl rollout undo deployment/payment-service -n production",
                "verification_command": "kubectl rollout status deployment/payment-service -n production --timeout=90s",
                "status": "pending",
            },
            {
                "step_number": 4,
                "name": "Apply Emergency Memory Quota Bump (+512Mi)",
                "description": "Increases memory limit from 1536Mi to 2048Mi to buffer during peak traffic.",
                "command": "kubectl set resources deployment payment-service -n production --limits=memory=2048Mi --requests=memory=1024Mi",
                "safety_tier": "CAUTION",
                "requires_approval": True,
                "approved": False,
                "rollback_command": "kubectl set resources deployment payment-service -n production --limits=memory=1536Mi --requests=memory=768Mi",
                "verification_command": "kubectl get deployment payment-service -n production -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}'",
                "status": "pending",
            },
        ],
    },
    {
        "playbook_number": "PB-103",
        "slug": "circuit-breaker-recovery",
        "title": "Circuit Breaker Auto-Recovery & Transition Monitoring",
        "category": "CIRCUIT_BREAKER",
        "target_service": "gateway-service",
        "risk_level": "SAFE",
        "estimated_downtime": "0 seconds",
        "description": "Verifies downstream dependency health before safely transitioning tripped circuit breakers through HALF_OPEN canary trial into fully CLOSED operational state.",
        "steps": [
            {
                "step_number": 1,
                "name": "Verify Downstream Dependency Health",
                "description": "Performs deep health check against payment-service readiness probe to confirm recovery.",
                "command": "curl -f -s http://payment-service:8081/health/readiness",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A",
                "verification_command": "CHECK response.status == 200",
                "status": "pending",
            },
            {
                "step_number": 2,
                "name": "Transition Circuit Breaker to HALF_OPEN",
                "description": "Instructs API Gateway circuit breaker to permit controlled 10% canary traffic trial.",
                "command": "curl -X POST http://gateway-service:8080/actuator/circuitbreakers/payment-service/transition --data '{\"state\":\"HALF_OPEN\"}'",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "curl -X POST http://gateway-service:8080/actuator/circuitbreakers/payment-service/transition --data '{\"state\":\"OPEN\"}'",
                "verification_command": "curl -s http://gateway-service:8080/actuator/circuitbreakers/payment-service",
                "status": "pending",
            },
            {
                "step_number": 3,
                "name": "Issue Synthetic Canary Probe Burst",
                "description": "Executes 5 synthetic requests through the gateway to validate 0% error rate on half-open circuit.",
                "command": "for i in {1..5}; do curl -s -o /dev/null -w '%{http_code}\\n' http://gateway-service:8080/api/v1/payments/canary-ping; done",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A",
                "verification_command": "CHECK all return codes == 200",
                "status": "pending",
            },
            {
                "step_number": 4,
                "name": "Restore 100% Traffic & Close Circuit Breaker",
                "description": "Confirms zero error rate and transitions circuit breaker state to CLOSED.",
                "command": "curl -X POST http://gateway-service:8080/actuator/circuitbreakers/payment-service/transition --data '{\"state\":\"CLOSED\"}'",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "curl -X POST http://gateway-service:8080/actuator/circuitbreakers/payment-service/transition --data '{\"state\":\"HALF_OPEN\"}'",
                "verification_command": "curl -s http://gateway-service:8080/actuator/circuitbreakers/payment-service",
                "status": "pending",
            },
        ],
    },
    {
        "playbook_number": "PB-104",
        "slug": "redis-cache-mitigation",
        "title": "Redis Cache Stampede Mitigation & Connection Eviction",
        "category": "CACHE",
        "target_service": "redis-cluster",
        "risk_level": "SAFE",
        "estimated_downtime": "0 seconds",
        "description": "Terminates leaked idle subscriber sockets, tunes client connection quotas, and mitigates cache stampedes during burst traffic.",
        "steps": [
            {
                "step_number": 1,
                "name": "Audit Connected Clients and Slowlog",
                "description": "Gathers Redis instance statistics to identify blocking commands and connection growth rate.",
                "command": "redis-cli INFO clients; redis-cli SLOWLOG GET 5;",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A",
                "verification_command": "CHECK connected_clients > 0",
                "status": "pending",
            },
            {
                "step_number": 2,
                "name": "Evict Stale and Idle Client Sockets",
                "description": "Drops idle client connections that have been inactive longer than idle threshold.",
                "command": "redis-cli CLIENT KILL TYPE normal SKIPME yes;",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A",
                "verification_command": "redis-cli CLIENT LIST | wc -l",
                "status": "pending",
            },
            {
                "step_number": 3,
                "name": "Increase Maxclients Limit & Client Timeout",
                "description": "Dynamically expands maxclients from 5,000 to 10,000 to absorb cluster reconnection storm.",
                "command": "redis-cli CONFIG SET maxclients 10000; redis-cli CONFIG SET timeout 60;",
                "safety_tier": "CAUTION",
                "requires_approval": True,
                "approved": False,
                "rollback_command": "redis-cli CONFIG SET maxclients 5000; redis-cli CONFIG SET timeout 0;",
                "verification_command": "redis-cli CONFIG GET maxclients;",
                "status": "pending",
            },
        ],
    },
    {
        "playbook_number": "PB-105",
        "slug": "ingress-rate-limit-tuning",
        "title": "Ingress Rate Limiting Relaxation & Traffic Shedding",
        "category": "NETWORK",
        "target_service": "ingress-nginx",
        "risk_level": "CAUTION",
        "estimated_downtime": "0 seconds",
        "description": "Tunes burst multipliers on Kubernetes Ingress controller annotations to alleviate HTTP 429 flood during legitimate traffic spikes.",
        "steps": [
            {
                "step_number": 1,
                "name": "Analyze Ingress 429 Status Ratio",
                "description": "Extracts recent response codes from ingress logs to quantify percentage of rejected traffic.",
                "command": "kubectl logs -n ingress -l app.kubernetes.io/name=ingress-nginx --tail=500 | grep '429'",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A",
                "verification_command": "CHECK 429_ratio > 0",
                "status": "pending",
            },
            {
                "step_number": 2,
                "name": "Adjust Burst Multiplier on Ingress Rule",
                "description": "Overwrites Nginx Ingress burst annotation to allow temporary client request surges up to 5x baseline.",
                "command": "kubectl annotate ingress main-ingress -n production --overwrite nginx.ingress.kubernetes.io/limit-burst-multiplier='5'",
                "safety_tier": "CAUTION",
                "requires_approval": True,
                "approved": False,
                "rollback_command": "kubectl annotate ingress main-ingress -n production --overwrite nginx.ingress.kubernetes.io/limit-burst-multiplier='2'",
                "verification_command": "kubectl get ingress main-ingress -n production -o jsonpath='{.metadata.annotations}'",
                "status": "pending",
            },
        ],
    },
    {
        "playbook_number": "PB-106",
        "slug": "disk-space-recovery",
        "title": "Emergency Disk Space Recovery & Rotated Log Purge",
        "category": "STORAGE",
        "target_service": "worker-service",
        "risk_level": "CRITICAL_DESTRUCTIVE",
        "estimated_downtime": "0 seconds",
        "description": "Identifies full storage partitions, purges compressed archived logs older than 7 days, and forces logrotate cycle to release unlinked open file descriptors.",
        "steps": [
            {
                "step_number": 1,
                "name": "Audit Disk Partition Utilization & Inodes",
                "description": "Queries filesystem mount points to locate the root cause of disk exhaustion.",
                "command": "df -h /var/log; du -sh /var/log/* | sort -hr | head -n 5",
                "safety_tier": "SAFE",
                "requires_approval": False,
                "approved": True,
                "rollback_command": "N/A",
                "verification_command": "CHECK disk_usage > 80%",
                "status": "pending",
            },
            {
                "step_number": 2,
                "name": "Purge Rotated Compressed Logs Older than 7 Days",
                "description": "Deletes obsolete .gz archives from local disk (retained copies exist in long-term object storage).",
                "command": "find /var/log/apps -type f -name '*.gz' -mtime +7 -delete",
                "safety_tier": "CRITICAL_DESTRUCTIVE",
                "requires_approval": True,
                "approved": False,
                "rollback_command": "N/A (Archived files reside in S3/GCS immutable backup)",
                "verification_command": "df -h /var/log",
                "status": "pending",
            },
            {
                "step_number": 3,
                "name": "Force Immediate Logrotate Cycle",
                "description": "Forces logrotate execution and sends SIGHUP to daemons to truncate unlinked open files.",
                "command": "logrotate -f /etc/logrotate.d/app-logs",
                "safety_tier": "CAUTION",
                "requires_approval": True,
                "approved": False,
                "rollback_command": "N/A",
                "verification_command": "df -h /var/log",
                "status": "pending",
            },
        ],
    },
]


class RemediationService:
    def __init__(self):
        pass

    def seed_default_playbooks(self, db: Session):
        """Ensures the 6 standard verified playbooks exist in the database."""
        for pb_data in DEFAULT_PLAYBOOKS_DATA:
            existing = db.query(RemediationPlaybook).filter(
                (RemediationPlaybook.playbook_number == pb_data["playbook_number"]) |
                (RemediationPlaybook.slug == pb_data["slug"])
            ).first()

            if not existing:
                playbook = RemediationPlaybook(
                    playbook_number=pb_data["playbook_number"],
                    slug=pb_data["slug"],
                    title=pb_data["title"],
                    category=pb_data["category"],
                    target_service=pb_data["target_service"],
                    risk_level=pb_data["risk_level"],
                    estimated_downtime=pb_data["estimated_downtime"],
                    description=pb_data["description"],
                    steps_json=json.dumps(pb_data["steps"]),
                    approval_status="pending_approval",
                    execution_status="not_started",
                    simulation_log_json="[]",
                )
                db.add(playbook)
                db.flush()

                # Add initial audit log
                audit = RemediationAuditLog(
                    playbook_id=playbook.id,
                    action="PLAYBOOK_SEEDED",
                    performed_by="system-init",
                    details_json=json.dumps({"message": f"Predefined playbook {pb_data['playbook_number']} initialized."}),
                )
                db.add(audit)

        db.commit()

    def list_playbooks(
        self,
        db: Session,
        category: Optional[str] = None,
        risk_level: Optional[str] = None,
        search: Optional[str] = None,
        incident_id: Optional[str] = None,
    ) -> List[RemediationPlaybook]:
        """Returns playbooks matching the optional query filters."""
        self.seed_default_playbooks(db)
        query = db.query(RemediationPlaybook)

        if incident_id:
            query = query.filter(RemediationPlaybook.incident_id == incident_id)
        if category and category.upper() != "ALL":
            query = query.filter(RemediationPlaybook.category == category.upper())
        if risk_level and risk_level.upper() != "ALL":
            query = query.filter(RemediationPlaybook.risk_level == risk_level.upper())
        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                RemediationPlaybook.title.ilike(s) |
                RemediationPlaybook.description.ilike(s) |
                RemediationPlaybook.target_service.ilike(s) |
                RemediationPlaybook.playbook_number.ilike(s)
            )

        return query.order_by(RemediationPlaybook.playbook_number.asc()).all()

    def get_playbook(self, db: Session, playbook_id: str) -> Optional[RemediationPlaybook]:
        """Fetches a single playbook by ID or playbook number."""
        self.seed_default_playbooks(db)
        return db.query(RemediationPlaybook).filter(
            (RemediationPlaybook.id == playbook_id) |
            (RemediationPlaybook.playbook_number == playbook_id)
        ).first()

    def create_playbook(self, db: Session, data: Dict[str, Any]) -> RemediationPlaybook:
        """Creates a custom playbook."""
        steps = data.get("steps", [])
        playbook = RemediationPlaybook(
            playbook_number=data.get("playbook_number"),
            slug=data.get("slug"),
            incident_id=data.get("incident_id"),
            title=data.get("title"),
            category=data.get("category", "GENERAL"),
            description=data.get("description", ""),
            target_service=data.get("target_service", "all"),
            risk_level=data.get("risk_level", "SAFE"),
            estimated_downtime=data.get("estimated_downtime", "0 seconds"),
            steps_json=json.dumps([s.dict() if hasattr(s, "dict") else s for s in steps]),
            approval_status="pending_approval",
            execution_status="not_started",
            simulation_log_json="[]",
        )
        db.add(playbook)
        db.flush()

        audit = RemediationAuditLog(
            playbook_id=playbook.id,
            action="PLAYBOOK_CREATED",
            performed_by=data.get("created_by", "sre-operator"),
            details_json=json.dumps({"title": playbook.title}),
        )
        db.add(audit)
        db.commit()
        db.refresh(playbook)
        return playbook

    def recommend_playbooks(self, db: Session, incident_id: str) -> List[Dict[str, Any]]:
        """
        Analyzes the target incident symptoms and ranks matching playbooks
        with grounded scores, reasons, and confidence tiers.
        """
        self.seed_default_playbooks(db)
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return []

        # Collect incident context
        text_corpus = (
            f"{incident.title} {incident.description} {incident.root_cause_hypothesis or ''} "
            f"{incident.primary_service or ''} {incident.affected_services_json or ''}"
        ).lower()

        # Also pull log messages linked to this incident
        from app.models.incident import IncidentLog
        linked_logs = (
            db.query(LogEntry.message)
            .join(IncidentLog, LogEntry.id == IncidentLog.log_entry_id)
            .filter(IncidentLog.incident_id == incident_id)
            .limit(50)
            .all()
        )
        log_text = " ".join([m[0].lower() for m in linked_logs if m[0]])
        full_corpus = f"{text_corpus} {log_text}"

        all_playbooks = db.query(RemediationPlaybook).all()
        recommendations = []

        # Keyword mapping rules
        rules = {
            "DATABASE": {
                "keywords": ["connection pool", "postgres", "mysql", "timeout", "pg_stat", "max_connections", "pool exhausted", "deadlock"],
                "boost": 0.35,
            },
            "CONTAINER": {
                "keywords": ["oomkilled", "exit code 137", "out of memory", "heap", "memory limit", "restarted", "pod crash"],
                "boost": 0.40,
            },
            "CIRCUIT_BREAKER": {
                "keywords": ["circuit breaker", "circuitbreaker", "open state", "callnotpermitted", "503", "gateway timeout", "half_open"],
                "boost": 0.40,
            },
            "CACHE": {
                "keywords": ["redis", "cache stampede", "jedis", "clients reached", "rediscommandtimeout", "memcached"],
                "boost": 0.35,
            },
            "NETWORK": {
                "keywords": ["429", "rate limit", "too many requests", "burst", "throttled", "ingress", "nginx"],
                "boost": 0.35,
            },
            "STORAGE": {
                "keywords": ["no space left", "disk quota", "errno 28", "disk pressure", "filesystem full", "log overflow"],
                "boost": 0.45,
            },
        }

        for pb in all_playbooks:
            score = 0.15  # baseline prior
            reasons = []

            # Service affinity match
            if pb.target_service != "all" and incident.primary_service:
                if pb.target_service.lower() in incident.primary_service.lower() or incident.primary_service.lower() in pb.target_service.lower():
                    score += 0.30
                    reasons.append(f"Target service '{pb.target_service}' directly matches incident primary service '{incident.primary_service}'.")

            # Check rule keywords
            rule = rules.get(pb.category, {"keywords": [], "boost": 0.20})
            matched_keywords = [kw for kw in rule["keywords"] if kw in full_corpus]

            if matched_keywords:
                score += min(0.50, len(matched_keywords) * 0.15 + rule["boost"])
                reasons.append(f"Detected failure signatures in logs/traces: {', '.join(matched_keywords[:3])}.")

            # Title or category alignment
            if pb.category.lower() in full_corpus:
                score += 0.10
                reasons.append(f"Playbook domain '{pb.category}' aligns with incident blast radius.")

            # Bound score to [0.1, 0.98]
            final_score = round(min(0.98, max(0.10, score)), 2)

            if not reasons:
                reasons.append("Standard preventive runbook applicable for service mitigation.")

            confidence = "HIGH" if final_score >= 0.70 else "MEDIUM" if final_score >= 0.40 else "LOW"

            recommendations.append({
                "playbook": pb,
                "match_score": final_score,
                "match_reasons": reasons,
                "confidence": confidence,
            })

        # Sort descending by match_score
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        return recommendations

    def update_step_approval(
        self,
        db: Session,
        playbook_id: str,
        step_number: int,
        approved: bool,
        approver_note: Optional[str] = None,
        performed_by: str = "sre-operator",
    ) -> RemediationPlaybook:
        """Toggles the approval status for a specific step in the playbook."""
        playbook = self.get_playbook(db, playbook_id)
        if not playbook:
            raise ValueError(f"Playbook {playbook_id} not found")

        steps = json.loads(playbook.steps_json)
        target_step = None
        for s in steps:
            if s.get("step_number") == step_number:
                target_step = s
                break

        if not target_step:
            raise ValueError(f"Step {step_number} not found in playbook {playbook_id}")

        target_step["approved"] = approved
        target_step["status"] = "approved" if approved else "pending"

        # Determine overall playbook approval status
        steps_needing_approval = [s for s in steps if s.get("requires_approval", False)]
        if not steps_needing_approval:
            playbook.approval_status = "approved"
        else:
            approved_count = sum(1 for s in steps_needing_approval if s.get("approved", False))
            if approved_count == len(steps_needing_approval):
                playbook.approval_status = "approved"
            elif approved_count > 0:
                playbook.approval_status = "partially_approved"
            else:
                playbook.approval_status = "pending_approval"

        playbook.steps_json = json.dumps(steps)
        playbook.updated_at = utc_now()

        # Audit log entry
        audit_action = "STEP_APPROVED" if approved else "STEP_REJECTED"
        audit = RemediationAuditLog(
            playbook_id=playbook.id,
            action=audit_action,
            step_number=str(step_number),
            performed_by=performed_by,
            details_json=json.dumps({
                "step_name": target_step.get("name"),
                "note": approver_note or "No comment provided",
                "resulting_approval_status": playbook.approval_status,
            }),
        )
        db.add(audit)
        db.commit()
        db.refresh(playbook)
        return playbook

    def _validate_command_safety(self, command: str) -> None:
        """Enforces security boundaries to prevent dangerous execution."""
        clean_cmd = command.strip().lower()

        # Check for dangerous patterns
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, clean_cmd):
                raise SecurityError(f"Security Alert: Command violates safe execution policy: '{command}'")

        # Must start with or contain an allowlisted prefix
        has_allowed = any(clean_cmd.startswith(prefix) or f" {prefix}" in clean_cmd for prefix in ALLOWLISTED_COMMAND_PREFIXES)
        if not has_allowed:
            raise SecurityError(f"Command not in permitted remediation allowlist: '{command}'")

    def simulate_playbook(
        self,
        db: Session,
        playbook_id: str,
        dry_run: bool = True,
        enforce_approvals: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes a safe, isolated simulation of the playbook's approved steps.
        Produces realistic terminal output, latency, exit codes, and verification results.
        """
        playbook = self.get_playbook(db, playbook_id)
        if not playbook:
            raise ValueError(f"Playbook {playbook_id} not found")

        steps = json.loads(playbook.steps_json)
        step_logs = []
        all_passed = True
        total_duration = 0

        for step in steps:
            s_num = step.get("step_number")
            s_name = step.get("name")
            cmd = step.get("command", "")
            safety_tier = step.get("safety_tier", "SAFE")
            req_appr = step.get("requires_approval", False)
            is_appr = step.get("approved", False)
            verif_cmd = step.get("verification_command", "")

            # If approval is required and enforced but missing, skip or fail
            if enforce_approvals and req_appr and not is_appr:
                step_logs.append({
                    "step_number": s_num,
                    "step_name": s_name,
                    "command": cmd,
                    "safety_tier": safety_tier,
                    "preflight_passed": False,
                    "stdout": "",
                    "stderr": f"GATE ENFORCED: Step requires explicit human approval before simulation.",
                    "exit_code": 1,
                    "duration_ms": 0,
                    "verification_passed": False,
                    "verification_output": "Verification skipped due to pending approval gate.",
                    "status": "skipped_unapproved",
                })
                all_passed = False
                continue

            # Security pre-flight check
            try:
                self._validate_command_safety(cmd)
                preflight_passed = True
            except SecurityError as sec_err:
                step_logs.append({
                    "step_number": s_num,
                    "step_name": s_name,
                    "command": cmd,
                    "safety_tier": safety_tier,
                    "preflight_passed": False,
                    "stdout": "",
                    "stderr": str(sec_err),
                    "exit_code": 126,
                    "duration_ms": 10,
                    "verification_passed": False,
                    "verification_output": "Command blocked by security sandbox.",
                    "status": "simulated_failed",
                })
                all_passed = False
                continue

            # Deterministic simulation output generation
            duration = 80 + (s_num * 35) % 120
            total_duration += duration

            stdout_text = self._generate_simulated_stdout(playbook.category, s_num, cmd)
            verification_output = f"[VERIFY OK] {verif_cmd} -> Evaluated true (health criterion satisfied)"

            step["status"] = "simulated"
            step_logs.append({
                "step_number": s_num,
                "step_name": s_name,
                "command": cmd,
                "safety_tier": safety_tier,
                "preflight_passed": preflight_passed,
                "stdout": stdout_text,
                "stderr": "",
                "exit_code": 0,
                "duration_ms": duration,
                "verification_passed": True,
                "verification_output": verification_output,
                "status": "simulated_success",
            })

        # Update playbook state
        playbook.steps_json = json.dumps(steps)
        playbook.execution_status = "simulated" if all_passed else "failed"
        playbook.simulation_log_json = json.dumps(step_logs)
        playbook.updated_at = utc_now()

        # Audit log
        audit = RemediationAuditLog(
            playbook_id=playbook.id,
            action="SIMULATION_EXECUTED",
            performed_by="sandbox-engine",
            details_json=json.dumps({
                "all_passed": all_passed,
                "total_duration_ms": total_duration,
                "step_count": len(step_logs),
            }),
        )
        db.add(audit)
        db.commit()
        db.refresh(playbook)

        return {
            "playbook_id": playbook.id,
            "execution_status": playbook.execution_status,
            "all_passed": all_passed,
            "total_duration_ms": total_duration,
            "steps": step_logs,
            "rollback_ready": True,
            "completed_at": utc_now(),
        }

    def _generate_simulated_stdout(self, category: str, step_num: int, command: str) -> str:
        """Produces realistic stdout text matching the simulated operational action."""
        cmd_lower = command.lower()
        if "pg_stat_activity" in cmd_lower:
            return " state                 | count \n-----------------------+-------\n active                | 88\n idle in transaction   | 12\n idle                  | 0\n(3 rows)"
        elif "pg_terminate_backend" in cmd_lower:
            return " pg_terminate_backend \n----------------------\n t (PID 4012 terminated)\n t (PID 4018 terminated)\n t (PID 4022 terminated)\n(3 terminations successful)"
        elif "alter system set max_connections" in cmd_lower:
            return "ALTER SYSTEM\n pg_reload_conf \n----------------\n t\n(Configuration updated and reloaded)"
        elif "kubectl top pod" in cmd_lower:
            return "NAME                               CPU(cores)   MEMORY(bytes)   \npayment-service-589db4c8bf-2z8vj   245m         1512Mi / 1536Mi [98.4%]\npayment-service-589db4c8bf-h4k9q   210m         1498Mi / 1536Mi [97.5%]"
        elif "jcmd" in cmd_lower:
            return "Dumping heap histogram...\n 1:        182405       29184800  [B (byte array)\n 2:         94200        9043200  java.util.concurrent.ConcurrentHashMap$Node\nDump successfully written to /tmp/heap_histogram.txt"
        elif "rollout restart" in cmd_lower:
            return "deployment.apps/payment-service restarted\nWaiting for deployment \"payment-service\" rollout to finish: 1 out of 2 new replicas updated...\nDeployment \"payment-service\" successfully rolled out (2/2 replicas healthy)"
        elif "set resources" in cmd_lower:
            return "deployment.apps/payment-service resource limits updated (limits: memory=2048Mi, requests: memory=1024Mi)"
        elif "transition" in cmd_lower and "half_open" in cmd_lower:
            return '{"circuitBreaker":"payment-service","previousState":"OPEN","currentState":"HALF_OPEN","canaryQuota":"10%"}'
        elif "transition" in cmd_lower and "closed" in cmd_lower:
            return '{"circuitBreaker":"payment-service","previousState":"HALF_OPEN","currentState":"CLOSED","traffic":"100%"}'
        elif "canary-ping" in cmd_lower:
            return "200 OK\n200 OK\n200 OK\n200 OK\n200 OK\nCanary health score: 100% (5/5 successes, 0 errors)"
        elif "client kill" in cmd_lower:
            return "OK (Killed 48 idle normal client connections)"
        elif "config set maxclients" in cmd_lower:
            return "OK\nOK (maxclients set to 10000, client timeout set to 60s)"
        elif "limit-burst-multiplier" in cmd_lower:
            return 'ingress.networking.k8s.io/main-ingress annotated (burst-multiplier="5")'
        elif "find" in cmd_lower and "-delete" in cmd_lower:
            return "Purged 18 compressed archived archives (freed 842 MB disk space)"
        elif "logrotate" in cmd_lower:
            return "Rotating log /var/log/apps/app.log...\nRenaming /var/log/apps/app.log to /var/log/apps/app.log.1\nCompressing /var/log/apps/app.log.1...\nNotifying daemons via SIGHUP (File descriptor freed)"
        elif "df -h" in cmd_lower:
            return "Filesystem      Size  Used Avail Use% Mounted on\n/dev/root        50G   39G  8.2G  83% /var/log"
        else:
            return f"Executed command successfully (exit code 0)\n[OUTPUT] {command[:60]}... -> OK"

    def rollback_playbook(
        self,
        db: Session,
        playbook_id: str,
        steps_to_rollback: Optional[List[int]] = None,
        performed_by: str = "sre-operator",
    ) -> Dict[str, Any]:
        """
        Executes compensating rollback actions for previously simulated/completed steps in reverse order.
        """
        playbook = self.get_playbook(db, playbook_id)
        if not playbook:
            raise ValueError(f"Playbook {playbook_id} not found")

        steps = json.loads(playbook.steps_json)
        reversed_steps = list(reversed(steps))
        rolled_back_items = []

        for step in reversed_steps:
            s_num = step.get("step_number")
            if steps_to_rollback and s_num not in steps_to_rollback:
                continue

            rollback_cmd = step.get("rollback_command", "N/A")
            if rollback_cmd and rollback_cmd != "N/A":
                rolled_back_items.append({
                    "step_number": s_num,
                    "step_name": step.get("name"),
                    "rollback_command": rollback_cmd,
                    "status": "rolled_back_success",
                    "output": f"Reverted configuration via: {rollback_cmd}",
                })
            step["status"] = "rolled_back"

        playbook.steps_json = json.dumps(steps)
        playbook.execution_status = "rolled_back"
        playbook.updated_at = utc_now()

        # Audit entry
        audit = RemediationAuditLog(
            playbook_id=playbook.id,
            action="ROLLBACK_EXECUTED",
            performed_by=performed_by,
            details_json=json.dumps({"reverted_steps": [item["step_number"] for item in rolled_back_items]}),
        )
        db.add(audit)
        db.commit()
        db.refresh(playbook)

        return {
            "playbook_id": playbook.id,
            "execution_status": "rolled_back",
            "rolled_back_steps": rolled_back_items,
            "message": f"Successfully rolled back {len(rolled_back_items)} compensating step(s).",
        }

    def export_playbook(self, db: Session, playbook_id: str, export_format: str = "yaml") -> str:
        """Exports playbook definition into YAML Ansible, Kubernetes Job, or Shell runbook."""
        playbook = self.get_playbook(db, playbook_id)
        if not playbook:
            raise ValueError(f"Playbook {playbook_id} not found")

        steps = json.loads(playbook.steps_json)
        fmt = export_format.lower()

        if fmt == "shell" or fmt == "bash":
            lines = [
                "#!/usr/bin/env bash",
                f"# LogPilot AI Remediation Runbook: {playbook.title}",
                f"# Playbook Number: {playbook.playbook_number or 'CUSTOM'}",
                f"# Risk Level: {playbook.risk_level}",
                f"# Generated: {utc_now().isoformat()}",
                "set -euo pipefail",
                "",
                "echo '>>> [LogPilot AI] Commencing Remediation Runbook execution...'",
                "",
            ]
            for s in steps:
                lines.append(f"# Step {s.get('step_number')}: {s.get('name')}")
                lines.append(f"# Danger Tier: {s.get('safety_tier')}")
                lines.append(f"echo '>>> Running Step {s.get('step_number')}: {s.get('name')}...'")
                lines.append(f"{s.get('command')}")
                if s.get("verification_command"):
                    lines.append(f"# Verification: {s.get('verification_command')}")
                lines.append("")
            lines.append("echo '>>> [LogPilot AI] Runbook execution completed successfully.'")
            return "\n".join(lines)

        elif fmt == "ansible":
            tasks = []
            for s in steps:
                tasks.append(f"    - name: 'Step {s.get('step_number')}: {s.get('name')}'\n      command: \"{s.get('command')}\"\n      register: step_{s.get('step_number')}_result")
            tasks_str = "\n".join(tasks)
            return f"""---
- name: "LogPilot AI Auto-Remediation - {playbook.title}"
  hosts: {playbook.target_service}
  become: yes
  vars:
    playbook_id: "{playbook.playbook_number or playbook.id}"
    risk_level: "{playbook.risk_level}"
  tasks:
{tasks_str}
"""
        else:
            # Default Kubernetes ConfigMap / Runbook YAML
            steps_yaml = []
            for s in steps:
                steps_yaml.append(f"    - step: {s.get('step_number')}\n      name: \"{s.get('name')}\"\n      command: |\n        {s.get('command')}\n      safety: \"{s.get('safety_tier')}\"")
            steps_body = "\n".join(steps_yaml)
            return f"""apiVersion: v1
kind: ConfigMap
metadata:
  name: "runbook-{playbook.slug or 'remediation'}"
  namespace: logpilot-system
  labels:
    app.kubernetes.io/part-of: logpilot-ai
    remediation.logpilot.ai/playbook: "{playbook.playbook_number or 'PB-CUSTOM'}"
    remediation.logpilot.ai/risk: "{playbook.risk_level}"
data:
  title: "{playbook.title}"
  targetService: "{playbook.target_service}"
  estimatedDowntime: "{playbook.estimated_downtime}"
  runbook.yaml: |
{steps_body}
"""

    def get_audit_logs(self, db: Session, playbook_id: Optional[str] = None, limit: int = 50) -> List[RemediationAuditLog]:
        """Returns recent audit logs."""
        self.seed_default_playbooks(db)
        query = db.query(RemediationAuditLog)
        if playbook_id:
            query = query.filter(RemediationAuditLog.playbook_id == playbook_id)
        return query.order_by(RemediationAuditLog.created_at.desc()).limit(limit).all()


class SecurityError(Exception):
    pass


# Global singleton service
remediation_service = RemediationService()
