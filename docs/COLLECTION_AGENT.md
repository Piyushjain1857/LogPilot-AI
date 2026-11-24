# Python Log Collection Agent Guide

The LogPilot AI Python Collection Agent (`agents/python/`) is a lightweight, zero-dependency standalone agent that monitors local log files, tracks read offsets with inode awareness, detects file rotations and truncations, and streams logs to the LogPilot AI backend via batched HTTP requests.

---

## 1. Directory Structure

```text
agents/python/
├── logpilot_agent.py        # CLI Entrypoint & main orchestration loop
├── collector.py             # Inode-aware file tailer and line parser
├── checkpoint_manager.py    # Atomic offset and file metadata persistence
├── api_client.py            # HTTP batch streaming client with retries
├── config.example.json      # Configuration template
├── requirements.txt         # Minimal production dependencies (requests / urllib3)
└── README.md                # Agent overview and quickstart
```

---

## 2. Key Capabilities

1. **Inode-Aware File Tracking**: Detects log rotation even when files are renamed (`app.log` -> `app.log.1`) or compressed.
2. **Truncation Handling**: Automatically resets byte offsets when log files are truncated (`copytruncate` strategy) without missing newly appended lines.
3. **Atomic Checkpointing**: Writes file offsets, inodes, and hash fingerprints atomically using temporary files and directory replacements to survive abrupt host crashes.
4. **Adaptive Batching**: Buffers records into batches (default 100 records or 1.0 second flush interval) to balance latency and network efficiency.
5. **Backpressure & Retries**: Implements exponential backoff with jitter and respects `Retry-After` headers on HTTP 429 / 503 responses.

---

## 3. Configuration (`config.json`)

```json
{
  "api_url": "http://127.0.0.1:8000",
  "ingestion_token": "lpt_your_ingestion_token_here",
  "service_name": "payment-service",
  "environment": "production",
  "log_files": [
    "/var/log/payment/app.log",
    "/var/log/payment/access.log"
  ],
  "batch_size": 100,
  "flush_interval_seconds": 1.0,
  "checkpoint_file": ".checkpoints/agent_checkpoints.json",
  "backoff_initial_seconds": 1.0,
  "backoff_max_seconds": 30.0,
  "max_retries": 5
}
```

---

## 4. Running the Agent

### Standalone CLI:
```bash
cd agents/python
python logpilot_agent.py --config config.json
```

### Overriding Parameters via CLI Flags:
```bash
python logpilot_agent.py \
  --token "lpt_your_token_here" \
  --file "/var/log/app.log" \
  --service "auth-service" \
  --api-url "http://127.0.0.1:8000"
```

---

## 5. Systemd Service Deployment

```ini
[Unit]
Description=LogPilot AI Collection Agent
After=network.target

[Service]
Type=simple
User=logpilot
WorkingDirectory=/opt/logpilot/agent
ExecStart=/opt/logpilot/agent/.venv/bin/python logpilot_agent.py --config /etc/logpilot/config.json
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```
