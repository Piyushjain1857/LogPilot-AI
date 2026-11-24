import uuid
import random
from datetime import datetime, timezone
from typing import Dict, Any, Optional


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SyntheticLogGenerator:
    """Generates structured synthetic microservice log events with trace correlation."""

    SERVICES = [
        "api-gateway",
        "auth-service",
        "payment-service",
        "database-service",
        "inventory-service",
        "notification-service",
    ]

    @classmethod
    def generate_event(
        cls,
        service: str,
        severity: str,
        message: str,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        t_id = trace_id or f"tr-{uuid.uuid4().hex[:12]}"
        s_id = span_id or f"sp-{uuid.uuid4().hex[:8]}"

        event = {
            "event_id": f"sim-evt-{uuid.uuid4().hex[:12]}",
            "timestamp": utc_now_iso(),
            "severity": severity.upper(),
            "service": service,
            "message": message,
            "trace_id": t_id,
            "span_id": s_id,
            "metadata": metadata or {},
        }
        return event
