# WebSocket Streaming Protocol Specification

The LogPilot AI real-time WebSocket protocol provides bidirectional streaming between the backend ingestion pipeline and browser clients or external monitoring tools.

---

## 1. Connection Endpoint

```text
ws://127.0.0.1:8000/ws/v1/logs
```

In production or TLS-secured deployments, the protocol upgrades to `wss://`.

---

## 2. Handshake Lifecycle

Upon establishing a WebSocket connection, the server sends an initialization acknowledgment:

```json
{
  "type": "connection.ack",
  "client_id": "client-8f92a10b-4192",
  "server_time": "2026-11-25T00:20:00.000Z",
  "heartbeat_interval_ms": 25000,
  "message": "Connected to LogPilot AI Real-Time Streaming Gateway"
}
```

---

## 3. Client Subscription Messages

Clients customize their log stream by sending `subscribe` messages containing granular filters:

```json
{
  "type": "subscribe",
  "filters": {
    "severities": ["ERROR", "CRITICAL"],
    "services": ["auth-service", "order-service"],
    "source_id": "31b26a11-8263-441d-91b4-2197ef56c12e",
    "environment": "production",
    "search": "database"
  },
  "after_sequence": 1420
}
```

### Supported Filter Keys:
- `severities`: Array of severities to include (e.g. `["ERROR", "CRITICAL"]`).
- `services`: Array of service names to monitor.
- `source_id`: Specific UUID of a log source.
- `environment`: Deployment tier (`production`, `staging`, etc.).
- `search`: Substring search matching log messages or error types.
- `after_sequence`: Monotonic sequence cursor for historical replay catchup.

---

## 4. Server Broadcast Messages

### 4.1 Real-Time Log Event (`log.event`)
Emitted whenever a log record is committed by the worker pipeline:

```json
{
  "type": "log.event",
  "sequence": 1421,
  "timestamp": "2026-11-25T00:20:01.450Z",
  "data": {
    "id": "184b901a-8212-42da-91ca-619bf6267812",
    "source_id": "31b26a11-8263-441d-91b4-2197ef56c12e",
    "service_name": "auth-service",
    "severity": "ERROR",
    "message": "Failed to connect to cache at redis-prod-01:6379",
    "timestamp": "2026-11-25T00:20:01.448Z",
    "environment": "production",
    "host": "auth-pod-1",
    "trace_id": "0af7651916cd43dd8448eb211c80319c",
    "span_id": "b7ad6b7169203331",
    "event_id": "evt-auth-1092834",
    "drain_template": "Failed to connect to cache at <*>",
    "sensitive_redacted": true,
    "ingestion_method": "REST_API"
  }
}
```

### 4.2 Streaming Telemetry Pulse (`stream.metrics`)
Emitted periodically to report system-wide throughput and queue capacity:

```json
{
  "type": "stream.metrics",
  "data": {
    "logs_per_second": 84.5,
    "active_sources": 4,
    "queue_depth": 18,
    "queue_capacity": 5000,
    "connected_clients": 2,
    "severities_last_minute": {
      "INFO": 72,
      "WARNING": 8,
      "ERROR": 4,
      "CRITICAL": 0
    }
  }
}
```

---

## 5. Heartbeat & Connection Health

- **Ping Interval**: The server sends a `heartbeat.ping` every 25 seconds.
- **Client Ack**: The client responds with:
  ```json
  { "type": "heartbeat.pong", "client_time": 1732494000123 }
  ```
- **Timeout**: Connections that fail to respond within 30 seconds are terminated to reclaim system resources.
- **Auto-Reconnect**: The frontend client automatically schedules reconnects using exponential backoff (1s, 2s, 4s... up to 30s) with 20% random jitter.
