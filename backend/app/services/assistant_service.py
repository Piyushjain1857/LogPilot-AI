import re
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.playbook import RemediationPlaybook
from app.models.report import Report


class AssistantService:
    def translate_query(self, natural_query: str) -> str:
        """
        Translates natural language questions into LogPilot Boolean Query Syntax.
        e.g. "show 500 errors in payment-service" -> service:payment-service severity:ERROR "500"
        """
        q = natural_query.strip().lower()
        parts = []

        # Service detection
        known_services = [
            "payment-service", "order-service", "gateway-service",
            "auth-service", "notification-service", "postgres-primary", "redis-cluster"
        ]
        detected_service = None
        for svc in known_services:
            if svc in q or svc.replace("-", " ") in q or svc.replace("-service", "") in q:
                detected_service = svc
                break

        if detected_service:
            parts.append(f"service:{detected_service}")

        # Severity detection
        if any(w in q for w in ["critical", "fatal", "disaster"]):
            parts.append("severity:CRITICAL")
        elif any(w in q for w in ["error", "errors", "failed", "failure", "exception", "500"]):
            parts.append("severity:ERROR")
        elif any(w in q for w in ["warning", "warn"]):
            parts.append("severity:WARNING")

        # Specific HTTP status codes
        status_match = re.search(r"\b(4\d\d|5\d\d)\b", q)
        if status_match:
            parts.append(f'"{status_match.group(1)}"')

        # Specific technical terms
        for term in ["timeout", "deadlock", "connection pool", "oomkilled", "circuit breaker", "unauthorized"]:
            if term in q:
                parts.append(f'"{term}"')

        if not parts:
            # Fallback to quoted keyword
            return f'"{natural_query.strip()}"'

        return " AND ".join(parts)

    def handle_chat(
        self,
        db: Session,
        message: str,
        incident_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Provides conversational SRE diagnostic assistance grounded in real telemetry.
        """
        msg_lower = message.strip().lower()
        suggested_actions = []
        query_translation = None

        # 1. Query translation intent
        if any(w in msg_lower for w in ["search", "find", "query", "show me logs", "logs for"]):
            translated = self.translate_query(message)
            query_translation = translated
            suggested_actions.append({
                "type": "RUN_QUERY",
                "label": f"Run query: {translated}",
                "url": f"/app/log-explorer?q={translated}",
            })
            reply = (
                f"I translated your question into LogPilot Boolean Query Syntax: `{translated}`.\n\n"
                f"Click below to execute this search in the Advanced Log Explorer with full-text AST filtering."
            )
            return {
                "reply": reply,
                "query_translation": query_translation,
                "suggested_actions": suggested_actions,
            }

        # 2. Incident status intent
        if "incident" in msg_lower or "active issue" in msg_lower or "outage" in msg_lower:
            incidents = db.query(Incident).filter(Incident.status.in_(["active", "investigating"])).limit(5).all()
            if incidents:
                inc_list = "\n".join([f"- **{i.incident_number or 'INC'}** ({i.severity}): {i.title} on `{i.primary_service}`" for i in incidents])
                reply = f"Currently, there are **{len(incidents)} active incident(s)** under investigation:\n\n{inc_list}\n\nWould you like me to run an evidence-based root cause analysis or synthesize a post-mortem report?"
                suggested_actions.append({"type": "NAVIGATE", "label": "Open Incident Command Center", "url": "/app/incidents"})
                suggested_actions.append({"type": "NAVIGATE", "label": "Inspect Root Cause Graph", "url": "/app/root-cause"})
            else:
                reply = "All services are currently reporting **HEALTHY**. No active or unmitigated incidents detected."
            return {
                "reply": reply,
                "query_translation": None,
                "suggested_actions": suggested_actions,
            }

        # 3. Remediation / Playbook intent
        if any(w in msg_lower for w in ["playbook", "runbook", "remediate", "fix", "mitigate"]):
            playbooks = db.query(RemediationPlaybook).all()
            pb_list = "\n".join([f"- **{pb.playbook_number}**: {pb.title} (`{pb.risk_level}`)" for pb in playbooks[:4]])
            reply = (
                f"LogPilot AI provides verified operational runbooks with human-in-the-loop safety gates:\n\n{pb_list}\n\n"
                f"Every action enforces our **Zero Automatic Execution Policy** and runs inside an isolated dry-run sandbox with rollback verification."
            )
            suggested_actions.append({"type": "NAVIGATE", "label": "Open Remediation Console", "url": "/app/remediation"})
            return {
                "reply": reply,
                "query_translation": None,
                "suggested_actions": suggested_actions,
            }

        # 4. Reports / Post-Mortem intent
        if any(w in msg_lower for w in ["report", "post-mortem", "postmortem", "sla", "audit"]):
            reports = db.query(Report).limit(3).all()
            rpt_list = "\n".join([f"- **{r.report_number}**: {r.title}" for r in reports])
            reply = (
                f"You can review or generate executive incident post-mortems and weekly SLA reliability audits:\n\n{rpt_list}\n\n"
                f"Reports include chronological timelines, evidence citations, and one-click PDF / Markdown downloads."
            )
            suggested_actions.append({"type": "NAVIGATE", "label": "Open Report Studio", "url": "/app/reports"})
            return {
                "reply": reply,
                "query_translation": None,
                "suggested_actions": suggested_actions,
            }

        # 5. Default SRE reasoning reply
        reply = (
            f"Hello! I am **LogPilot AI's Autonomous SRE Assistant**.\n\n"
            f"I can assist you with:\n"
            f"1. **Translating questions to log queries:** e.g. *\"Show 500 errors in payment-service\"*\n"
            f"2. **Incident Triage & Status:** e.g. *\"Are there any active incidents?\"*\n"
            f"3. **Remediation Runbooks:** e.g. *\"How do I fix database connection pool exhaustion?\"*\n"
            f"4. **Post-Mortem Synthesis:** e.g. *\"Generate executive PDF report for the latest incident\"*\n\n"
            f"What would you like to investigate?"
        )
        suggested_actions.append({"type": "NAVIGATE", "label": "Open Log Explorer", "url": "/app/log-explorer"})
        suggested_actions.append({"type": "NAVIGATE", "label": "AIOps Command Center", "url": "/app"})

        return {
            "reply": reply,
            "query_translation": None,
            "suggested_actions": suggested_actions,
        }


assistant_service = AssistantService()
