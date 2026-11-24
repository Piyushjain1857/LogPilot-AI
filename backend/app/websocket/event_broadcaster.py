import asyncio
from typing import Dict, Any, Optional
from app.core.logging import logger


class EventBroadcaster:
    """Dispatches committed, persisted log events to WebSocket clients based on subscription filters."""

    def __init__(self):
        self._manager = None

    def set_manager(self, manager):
        self._manager = manager

    async def broadcast_committed_event(
        self,
        event_payload: Dict[str, Any],
        sequence_id: int,
        source_id: str,
        severity: str,
        service: str,
    ):
        if not self._manager:
            return
        try:
            await self._manager.broadcast_event(
                event_payload=event_payload,
                sequence_id=sequence_id,
                source_id=source_id,
                severity=severity,
                service=service,
            )
        except Exception as e:
            logger.debug(f"Event broadcast exception: {e}")


event_broadcaster = EventBroadcaster()
