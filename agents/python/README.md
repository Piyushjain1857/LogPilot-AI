# LogPilot AI — Python Log Collection Agent

A lightweight, robust, standalone log tailer and shipping agent for Linux, macOS, and container environments.

## Features

- **Selective Monitoring**: Tails only explicitly configured log files (never scans filesystem or private credentials).
- **At-Least-Once Delivery**: Durable file offset and inode tracking (`.logpilot-checkpoint.json`) prevents duplicate ingestion or data loss across restarts.
- **Log Rotation Awareness**: Detects inode changes and file truncation automatically.
- **Resilient Transport**: Uses `httpx` with exponential backoff and respects HTTP 429/503 `Retry-After` backpressure headers.
- **Deterministic Event IDs**: Generates stable client-side event hashes (`evt-agent-...`) for server-side idempotency.
- **Client-Side Sanitization**: Redacts sensitive Bearer tokens and passwords before transmission.

## Quick Start

### 1. Requirements

```bash
pip install -r requirements.txt
```

### 2. Configuration

Create `agent-config.json` (or copy `config.example.json`):

```json
{
  "server_url": "http://127.0.0.1:8000",
  "token_env": "LOGPILOT_INGESTION_TOKEN",
  "service_name": "payment-service",
  "files": [
    {
      "path": "./sample-data/application.log",
      "format": "auto",
      "start_position": "end"
    }
  ],
  "batch_size": 50,
  "flush_interval_seconds": 2,
  "max_retry_delay_seconds": 30,
  "checkpoint_file": "./.logpilot-checkpoint.json"
}
```

### 3. Generate Ingestion Token

In the LogPilot AI web console (*Log Sources* -> *Manage Tokens*), create an ingestion credential for your source.

Export the token:

```bash
export LOGPILOT_INGESTION_TOKEN="lp_live_YOUR_GENERATED_TOKEN"
```

### 4. Run the Agent

```bash
python logpilot_agent.py --config agent-config.json
```
