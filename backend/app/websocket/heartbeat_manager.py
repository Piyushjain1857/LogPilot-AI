import asyncio
import time
from typing import Dict
from app.core.config import settings
from app.core.logging import logger


class HeartbeatManager:
    """Monitors client responsiveness and sends periodic ping frames."""

    def __init__(self):
        self._last_pong: Dict[str, float] = {}

    def record_activity(self, client_id: str):
        self._last_pong[client_id] = time.time()

    def remove_client(self, client_id: str):
        self._last_pong.pop(client_id, None)

    def is_timed_out(self, client_id: str) -> bool:
        last = self._last_pong.get(client_id)
        if not last:
            return False
        return (time.time() - last) > settings.WEBSOCKET_CONNECTION_TIMEOUT


heartbeat_manager = HeartbeatManager()
