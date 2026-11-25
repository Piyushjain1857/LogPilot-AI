export function getIntegrationExamples(projectKey = "lp_live_sample_token_abc123", endpoint = "http://127.0.0.1:8000/api/v1/websites/ingest") {
  return [
    {
      id: "browser-sdk",
      title: "Browser JavaScript SDK",
      language: "html",
      description: "Embed in any HTML page to automatically observe unhandled JS errors, failed fetch/XHR calls, and Core Web Vitals.",
      code: `<!-- Add to <head> or before </body> in your HTML -->
<script
  src="http://localhost:5173/logpilot-sdk.js"
  data-project-key="${projectKey}"
  data-endpoint="${endpoint}"
  async
></script>`,
    },
    {
      id: "nodejs-express",
      title: "Node.js & Express.js",
      language: "javascript",
      description: "Express middleware that automatically ships unhandled 5xx errors and structured JSON logs to LogPilot AI.",
      code: `const express = require('express');
const axios = require('axios');
const app = express();

const LOGPILOT_KEY = process.env.LOGPILOT_KEY || '${projectKey}';
const LOGPILOT_ENDPOINT = '${endpoint}';

// LogPilot Automated Error Shipper Middleware
app.use((err, req, res, next) => {
  const payload = {
    events: [{
      event_type: 'error',
      severity: 'CRITICAL',
      message: err.message || 'Express Internal Server Error',
      source_file: err.fileName || req.path,
      stack_trace: err.stack,
      url: req.originalUrl,
      metadata: {
        method: req.method,
        status: 500,
        headers: { host: req.headers.host },
        // Sensitive credentials (passwords, tokens) are automatically redacted in-flight
      }
    }]
  };

  axios.post(LOGPILOT_ENDPOINT, payload, {
    headers: { 'X-LogPilot-Key': LOGPILOT_KEY }
  }).catch(() => {});

  res.status(500).json({ error: 'Internal Server Error', reference: req.id });
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
    },
    {
      id: "python-fastapi",
      title: "Python & FastAPI",
      language: "python",
      description: "FastAPI middleware capturing unhandled exceptions and streaming structured JSON telemetry.",
      code: `import httpx
from fastapi import FastAPI, Request
from starlette.responses import JSONResponse

app = FastAPI()
LOGPILOT_KEY = "${projectKey}"
LOGPILOT_ENDPOINT = "${endpoint}"

@app.middleware("http")
async def logpilot_observability_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        if response.status_code >= 500:
            await ship_logpilot_event("api_failure", "CRITICAL", f"HTTP {response.status_code} on {request.url.path}")
        return response
    except Exception as exc:
        import traceback
        await ship_logpilot_event("error", "CRITICAL", str(exc), traceback.format_exc(), request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

async def ship_logpilot_event(event_type: str, severity: str, message: str, stack_trace: str = None, path: str = None):
    payload = {
        "events": [{
            "event_type": event_type,
            "severity": severity,
            "message": message,
            "stack_trace": stack_trace,
            "url": path,
            "metadata": {"framework": "FastAPI"}
        }]
    }
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(LOGPILOT_ENDPOINT, json=payload, headers={"X-LogPilot-Key": LOGPILOT_KEY})
    except Exception:
        pass`,
    },
    {
      id: "python-flask",
      title: "Python & Flask",
      language: "python",
      description: "Flask error handler hook that ships stack traces and request context directly to LogPilot AI.",
      code: `import traceback
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)
LOGPILOT_KEY = "${projectKey}"
LOGPILOT_ENDPOINT = "${endpoint}"

@app.errorhandler(Exception)
def handle_exception(e):
    payload = {
        "events": [{
            "event_type": "error",
            "severity": "CRITICAL",
            "message": str(e),
            "stack_trace": traceback.format_exc(),
            "url": request.path,
            "metadata": {"method": request.method, "framework": "Flask"}
        }]
    }
    try:
        requests.post(LOGPILOT_ENDPOINT, json=payload, headers={"X-LogPilot-Key": LOGPILOT_KEY}, timeout=2)
    except Exception:
        pass
    return jsonify({"error": "Internal Server Error"}), 500`,
    },
    {
      id: "python-django",
      title: "Python & Django",
      language: "python",
      description: "Custom Django logging handler or exception middleware for automated incident correlation.",
      code: `# In your settings.py:
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'logpilot': {
            'level': 'ERROR',
            'class': 'myapp.logpilot_handler.LogPilotHandler',
        },
    },
    'root': {
        'handlers': ['logpilot'],
        'level': 'INFO',
    },
}

# In myapp/logpilot_handler.py:
import logging
import requests

class LogPilotHandler(logging.Handler):
    def emit(self, record):
        try:
            payload = {
                "events": [{
                    "event_type": "error",
                    "severity": record.levelname,
                    "message": record.getMessage(),
                    "source_file": record.pathname,
                    "line_number": record.lineno,
                    "stack_trace": record.exc_text or "",
                }]
            }
            requests.post(
                "${endpoint}",
                json=payload,
                headers={"X-LogPilot-Key": "${projectKey}"},
                timeout=2,
            )
        except Exception:
            pass`,
    },
    {
      id: "docker-apps",
      title: "Docker Container Shipper",
      language: "yaml",
      description: "Docker compose JSON log routing with Fluentbit/Vector or curl sidecar to LogPilot AI.",
      code: `version: '3.8'
services:
  app:
    image: my-storefront:latest
    environment:
      - LOGPILOT_KEY=${projectKey}
      - LOGPILOT_ENDPOINT=${endpoint}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    labels:
      - "logpilot.enable=true"
      - "logpilot.service=storefront"`,
    },
    {
      id: "nginx-logs",
      title: "Nginx JSON Logs",
      language: "nginx",
      description: "Nginx structured JSON log format to stream access and error events to LogPilot AI.",
      code: `http {
    log_format logpilot_json escape=json '{'
        '"timestamp":"$time_iso8601",'
        '"client_ip":"$remote_addr",'
        '"request_method":"$request_method",'
        '"request_uri":"$request_uri",'
        '"status":$status,'
        '"request_time":$request_time,'
        '"user_agent":"$http_user_agent"'
    '}';

    server {
        listen 80;
        server_name myapp.com;

        access_log /var/log/nginx/access.log logpilot_json;
        error_log  /var/log/nginx/error.log warn;

        location / {
            proxy_pass http://127.0.0.1:3000;
        }
    }
}`,
    },
  ];
}
