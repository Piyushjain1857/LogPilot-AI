from typing import Set, Dict, Optional, List
from dataclasses import dataclass, field


@dataclass
class ClientSubscription:
    severities: Set[str] = field(default_factory=set)
    services: Set[str] = field(default_factory=set)
    source_ids: Set[str] = field(default_factory=set)
    last_sequence_id: int = 0


class SubscriptionManager:
    """Maintains active filter subscriptions for connected WebSocket clients."""

    def __init__(self):
        self._subscriptions: Dict[str, ClientSubscription] = {}

    def register(self, client_id: str):
        self._subscriptions[client_id] = ClientSubscription()

    def unregister(self, client_id: str):
        self._subscriptions.pop(client_id, None)

    def update_subscription(
        self,
        client_id: str,
        severities: Optional[List[str]] = None,
        services: Optional[List[str]] = None,
        source_ids: Optional[List[str]] = None,
    ):
        if client_id not in self._subscriptions:
            self._subscriptions[client_id] = ClientSubscription()

        sub = self._subscriptions[client_id]
        if severities is not None:
            sub.severities = {s.upper() for s in severities if s}
        if services is not None:
            sub.services = {s for s in services if s}
        if source_ids is not None:
            sub.source_ids = {s for s in source_ids if s}

    def matches(
        self,
        client_id: str,
        severity: str,
        service: str,
        source_id: str,
    ) -> bool:
        sub = self._subscriptions.get(client_id)
        if not sub:
            return True  # Default to receiving all events if no filter set

        if sub.severities and severity.upper() not in sub.severities:
            return False

        if sub.services and service not in sub.services:
            return False

        if sub.source_ids and source_id not in sub.source_ids:
            return False

        return True


subscription_manager = SubscriptionManager()
