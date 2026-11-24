import uuid
import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from starlette.websockets import WebSocket, WebSocketDisconnect, WebSocketState
from app.core.config import settings
from app.core.logging import logger
from app.websocket.subscriptions import subscription_manager
from app.websocket.heartbeat_manager import heartbeat_manager
from app.websocket.event_broadcaster import event_broadcaster


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConnectionManager:
    """
    Robust WebSocket Connection Manager for real-time live log streaming.
    Supports client registration, subscription filters, heartbeats,
    bounded per-client outgoing queues, slow-client protection, and clean teardown.
    """

    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}
        self._queues: Dict[str, asyncio.Queue] = {}
        self._writer_tasks: Dict[str, asyncio.Task] = {}
        # Wire event_broadcaster to this instance
        event_broadcaster.set_manager(self)

    @property
    def connected_clients_count(self) -> int:
        return len(self._connections)

    def validate_origin(self, websocket: WebSocket) -> bool:
        """
        Validates origin header against allowed CORS origins.
        Local dev tools and allowed frontend URLs are accepted.
        """
        origin = websocket.headers.get("origin")
        if not origin:
            return True  # Native agent / CLI clients do not pass origin header

        allowed = set(settings.CORS_ORIGINS)
        # Also allow localhost variants
        for host in ["localhost", "127.0.0.1"]:
            allowed.add(f"http://{host}:5173")
            allowed.add(f"http://{host}:3000")
            allowed.add(f"http://{host}:8000")

        return origin in allowed

    async def connect(self, websocket: WebSocket) -> Optional[str]:
        """
        Accepts incoming WebSocket if origin valid and capacity available.
        Returns client_id string or None if rejected.
        """
        if not self.validate_origin(websocket):
            logger.warning(f"Rejected WebSocket connection: Origin not permitted ({websocket.headers.get('origin')})")
            await websocket.close(code=1008)  # Policy violation
            return None

        if len(self._connections) >= settings.MAX_WEBSOCKET_CLIENTS:
            logger.warning("Rejected WebSocket connection: Maximum client capacity reached.")
            await websocket.close(code=1013)  # Try again later
            return None

        await websocket.accept()
        client_id = f"client-{uuid.uuid4().hex[:8]}"
        self._connections[client_id] = websocket
        self._queues[client_id] = asyncio.Queue(maxsize=settings.MAX_WEBSOCKET_CLIENT_QUEUE)
        subscription_manager.register(client_id)
        heartbeat_manager.record_activity(client_id)

        # Start background writer task for this client
        self._writer_tasks[client_id] = asyncio.create_task(self._client_writer(client_id, websocket))

        # Send connection.ready event
        await self.send_to_client(client_id, {
            "version": 1,
            "type": "connection.ready",
            "sequence": 0,
            "timestamp": utc_now_iso(),
            "data": {
                "client_id": client_id,
                "server_time": utc_now_iso(),
                "heartbeat_interval": settings.WEBSOCKET_HEARTBEAT_INTERVAL,
            },
        })

        logger.info(f"WebSocket client connected: {client_id} (active: {len(self._connections)})")
        return client_id

    async def disconnect(self, client_id: str):
        """Cleans up client state, writer tasks, and queues."""
        subscription_manager.unregister(client_id)
        heartbeat_manager.remove_client(client_id)

        writer_task = self._writer_tasks.pop(client_id, None)
        if writer_task:
            writer_task.cancel()

        self._queues.pop(client_id, None)
        ws = self._connections.pop(client_id, None)
        if ws and ws.client_state == WebSocketState.CONNECTED:
            try:
                await ws.close()
            except Exception:
                pass

        logger.info(f"WebSocket client disconnected: {client_id} (remaining: {len(self._connections)})")

    async def send_to_client(self, client_id: str, message: Dict[str, Any]):
        queue = self._queues.get(client_id)
        if queue:
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                logger.warning(f"Slow client detected: {client_id}. Dropping frame to prevent memory saturation.")

    async def _client_writer(self, client_id: str, websocket: WebSocket):
        queue = self._queues.get(client_id)
        if not queue:
            return
        try:
            while True:
                msg = await queue.get()
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_text(json.dumps(msg))
                queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.debug(f"Client writer error for {client_id}: {e}")
            await self.disconnect(client_id)

    async def broadcast_event(
        self,
        event_payload: Dict[str, Any],
        sequence_id: int,
        source_id: str,
        severity: str,
        service: str,
    ):
        """Dispatches committed log event to all clients matching subscription filters."""
        event_msg = {
            "version": 1,
            "type": "log.created",
            "sequence": sequence_id,
            "timestamp": event_payload.get("timestamp") or utc_now_iso(),
            "data": event_payload,
        }

        for client_id in list(self._connections.keys()):
            if subscription_manager.matches(client_id, severity, service, source_id):
                await self.send_to_client(client_id, event_msg)

    async def handle_client_message(self, client_id: str, raw_text: str):
        """Processes incoming client frames: subscribe, unsubscribe, ping, etc."""
        heartbeat_manager.record_activity(client_id)
        try:
            msg = json.loads(raw_text)
            msg_type = msg.get("type")

            if msg_type == "subscribe":
                filters = msg.get("filters") or {}
                subscription_manager.update_subscription(
                    client_id=client_id,
                    severities=filters.get("severities"),
                    services=filters.get("services"),
                    source_ids=filters.get("source_ids"),
                )
                await self.send_to_client(client_id, {
                    "version": 1,
                    "type": "subscription.updated",
                    "sequence": 0,
                    "timestamp": utc_now_iso(),
                    "data": {
                        "status": "active",
                        "filters": filters,
                    },
                })

            elif msg_type == "ping":
                await self.send_to_client(client_id, {
                    "version": 1,
                    "type": "heartbeat.ack",
                    "sequence": 0,
                    "timestamp": utc_now_iso(),
                    "data": {"pong": True},
                })

        except Exception as e:
            logger.debug(f"Invalid WebSocket message from {client_id}: {e}")

    async def close_all(self):
        """Gracefully closes all connections during server shutdown."""
        for client_id in list(self._connections.keys()):
            await self.disconnect(client_id)


ws_manager = ConnectionManager()
