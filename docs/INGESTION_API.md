# Ingestion REST API Specification

LogPilot AI provides high-performance REST endpoints for pushing single log events or bulk log batches from external applications, collection agents, and CI/CD pipelines.

---

## 1. Authentication

Every ingestion request must include a source-specific Bearer token in the `Authorization` header:

```http
Authorization: Bearer lpt_9a7d3f8c12...
```

Tokens are generated per log source, hashed using SHA-256 before storage, and verified in constant time (`hmac.compare_digest`).

---

## 2. Ingest Single Log Record

### `POST /api/v1/ingest/logs`

Ingests an individual log record directly into the streaming pipeline.

#### Request Headers:
- `Content-Type: application/json`
- `Authorization: Bearer <INGESTION_TOKEN>`

#### Request Body:
```json
{
  "timestamp": "2026-11-25T00:15:30.123456Z",
  "severity": "ERROR",
  "service": "auth-service",
  "message": "Redis connection timeout after 3000ms",
  "environment": "production",
  "host": "auth-pod-7f89c-4x9zq",
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "span_id": "b7ad6b7169203331",
  "event_id": "evt-auth-1092834",
  "metadata": {
    "retry_attempt": 3,
    "redis_host": "cache-master.internal"
  }
}
```

#### Field Specifications:
| Field | Type | Required | Description |
|---|---|---|---|
| `timestamp` | string (ISO-8601) | No | Log event creation timestamp. Defaults to UTC now if omitted. |
| `severity` | string | Yes | One of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. |
| `service` | string | No | Microservice name. Defaults to log source service name. |
| `message` | string | Yes | Log message body text. Sensitive data is automatically redacted. |
| `environment` | string | No | Operational environment (`production`, `staging`, `development`). |
| `host` | string | No | Hostname, pod name, or container ID. |
| `trace_id` | string | No | Distributed tracing trace ID (OpenTelemetry / W3C TraceContext). |
| `span_id` | string | No | Distributed tracing span ID. |
| `event_id` | string | No | External unique event ID for idempotent deduplication. |
| `metadata` | object | No | Arbitrary JSON key-value pairs associated with the event. |

#### Successful Response (`200 OK`):
```json
{
  "status": "queued",
  "record_id": "184b901a-8212-42da-91ca-619bf6267812",
  "source_id": "31b26a11-8263-441d-91b4-2197ef56c12e",
  "received_at": "2026-11-25T00:15:30.125000Z",
  "message": "Log record accepted and enqueued for processing"
}
```

---

## 3. Ingest Batch of Log Records

### `POST /api/v1/ingest/batch`

Submits up to 1,000 log records in a single transactional request.

#### Request Body:
```json
{
  "records": [
    {
      "severity": "INFO",
      "service": "api-gateway",
      "message": "HTTP 200 GET /api/v1/products",
      "event_id": "evt-gw-101"
    },
    {
      "severity": "WARN",
      "service": "order-service",
      "message": "Database query exceeded threshold: 245ms",
      "event_id": "evt-ord-204"
    }
  ]
}
```

#### Successful Response (`200 OK`):
```json
{
  "status": "queued",
  "batch_id": "bat-78a23b9c-4912-43bb-a871-381c8167f9a1",
  "source_id": "31b26a11-8263-441d-91b4-2197ef56c12e",
  "accepted_count": 2,
  "received_at": "2026-11-25T00:15:31.000000Z",
  "message": "Batch accepted: 2 records queued for processing"
}
```

---

## 4. Query Batch Processing Status

### `GET /api/v1/ingest/batches/{batch_id}`

Retrieves the execution status and count breakdowns for a previously submitted batch.

#### Response (`200 OK`):
```json
{
  "batch_id": "bat-78a23b9c-4912-43bb-a871-381c8167f9a1",
  "source_id": "31b26a11-8263-441d-91b4-2197ef56c12e",
  "status": "COMPLETED",
  "total_records": 2,
  "processed_records": 2,
  "failed_records": 0,
  "created_at": "2026-11-25T00:15:31Z",
  "completed_at": "2026-11-25T00:15:31Z",
  "error_message": null
}
```

---

## 5. Error Responses

| Status Code | Reason | Description |
|---|---|---|
| `400 Bad Request` | Malformed Request | Payload is missing required fields or has invalid structure. |
| `401 Unauthorized` | Invalid Token | Missing, invalid, or expired ingestion token. |
| `403 Forbidden` | Source Disabled | Source ingestion is explicitly disabled via toggle switch. |
| `422 Unprocessable` | Validation Error | Timestamp format or severity enum does not conform to schema. |
| `429 Too Many Requests` | Rate Limit / Backpressure | Request volume exceeded or ingestion queue is full. |
