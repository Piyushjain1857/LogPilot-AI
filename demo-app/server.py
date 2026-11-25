#!/usr/bin/env python3
"""
LogPilot AI — Hackathon Fault Injection Demo Application
Runs on http://localhost:5174.
Provides a local web storefront with controlled failure simulation buttons.
Integrated with the actual LogPilot AI log ingestion API and synthetic probe monitoring.
"""
import time
import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

PORT = 5174
LOGPILOT_API_ENDPOINT = "http://127.0.0.1:8000/api/v1/websites/ingest"
DEMO_PROJECT_KEY = "lp_live_hackathon_demo"

# Dynamic server failure state for judges/demonstrations
SERVER_STATE = {
    "simulate_down": False,
    "simulate_latency_ms": 0,
    "last_fault_triggered": "None",
}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LogPilot AI — Fault Injection Demo Application</title>
  <style>
    :root {
      --bg-base: #090e1a;
      --bg-surface: #111827;
      --border: #263244;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-base);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif;
      padding: 32px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge.down {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border-color: rgba(239, 68, 68, 0.3);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }
    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.15s ease;
    }
    .btn:hover { opacity: 0.9; }
    .btn-danger { background: var(--danger); }
    .btn-warning { background: var(--warning); color: #000; }
    .console-box {
      background: #040711;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 16px;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.6;
      max-height: 220px;
      overflow-y: auto;
      color: #94a3b8;
    }
    .console-line { margin-bottom: 4px; }
    .console-line.err { color: #f87171; }
    .console-line.ok { color: #34d399; }
    .console-line.warn { color: #fbbf24; }
  </style>

  <!-- Real LogPilot AI Client-Side Telemetry SDK Injection -->
  <script
    src="http://localhost:5173/logpilot-sdk.js"
    data-project-key="lp_live_hackathon_demo"
    data-endpoint="http://127.0.0.1:8000/api/v1/websites/ingest"
    data-debug="true"
  ></script>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div>
        <h1 style="font-size: 20px; margin-bottom: 4px;">LogPilot AI — Live Fault Injection Sandbox</h1>
        <p style="font-size: 13px; color: var(--text-muted);">
          Simulate controlled real-world incidents. Observed live by LogPilot AI Synthetic Probes &amp; Telemetry SDK.
        </p>
      </div>
      <div>
        <span class="badge" id="status-badge">● Target Status: ONLINE (HTTP 200)</span>
      </div>
    </div>

    <!-- Fault Injection Action Grid -->
    <div class="grid">
      <!-- 1. HTTP 500 -->
      <div class="card">
        <div>
          <h3 style="font-size: 15px; margin-bottom: 6px;">1. HTTP 500 Internal Error</h3>
          <p style="font-size: 12px; color: var(--text-muted);">
            Triggers a 500 error simulating internal order checkout calculation failure.
          </p>
        </div>
        <button class="btn btn-danger" onclick="triggerHttp500()">Trigger HTTP 500</button>
      </div>

      <!-- 2. HTTP 404 -->
      <div class="card">
        <div>
          <h3 style="font-size: 15px; margin-bottom: 6px;">2. HTTP 404 Endpoint Missing</h3>
          <p style="font-size: 12px; color: var(--text-muted);">
            Requests a non-existent API route <code>/api/v1/broken-link</code>.
          </p>
        </div>
        <button class="btn btn-warning" onclick="triggerHttp404()">Trigger HTTP 404</button>
      </div>

      <!-- 3. DB Failure -->
      <div class="card">
        <div>
          <h3 style="font-size: 15px; margin-bottom: 6px;">3. Database Connection Failure</h3>
          <p style="font-size: 12px; color: var(--text-muted);">
            Simulates Postgres pool lock saturation (max=100 connections).
          </p>
        </div>
        <button class="btn btn-danger" onclick="triggerDbFailure()">Simulate DB Crash</button>
      </div>

      <!-- 4. Slow Latency -->
      <div class="card">
        <div>
          <h3 style="font-size: 15px; margin-bottom: 6px;">4. Slow API Latency (3500ms)</h3>
          <p style="font-size: 12px; color: var(--text-muted);">
            Triggers an unindexed query simulation delaying response by 3.5s.
          </p>
        </div>
        <button class="btn btn-warning" onclick="triggerSlowApi()">Trigger Slow Query</button>
      </div>

      <!-- 5. JS Runtime Crash -->
      <div class="card">
        <div>
          <h3 style="font-size: 15px; margin-bottom: 6px;">5. JavaScript TypeError</h3>
          <p style="font-size: 12px; color: var(--text-muted);">
            Dereferences undefined object attribute in browser runtime.
          </p>
        </div>
        <button class="btn btn-danger" onclick="triggerJsRuntimeError()">Throw JS Exception</button>
      </div>

      <!-- 6. Toggle Server Outage -->
      <div class="card">
        <div>
          <h3 style="font-size: 15px; margin-bottom: 6px;">6. Synthetic Health Outage</h3>
          <p style="font-size: 12px; color: var(--text-muted);">
            Toggles <code>/health</code> between HTTP 200 OK and HTTP 503 Outage.
          </p>
        </div>
        <button class="btn" id="toggle-outage-btn" onclick="toggleServerHealth()">Toggle Outage (503)</button>
      </div>
    </div>

    <!-- Live Telemetry Stream Logs -->
    <div class="card" style="margin-top: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 14px;">Sandbox Local Telemetry Stream</h3>
        <span style="font-size: 11px; color: var(--text-muted);">Auto-transmitting to LogPilot AI Ingestion Engine</span>
      </div>
      <div class="console-box" id="console-output">
        <div class="console-line ok">[00:00:00] Ready. LogPilot AI client SDK connected to http://127.0.0.1:8000</div>
      </div>
    </div>
  </div>

  <script>
    function logMsg(msg, type) {
      const box = document.getElementById('console-output');
      const line = document.createElement('div');
      line.className = 'console-line ' + (type || '');
      const time = new Date().toLocaleTimeString();
      line.innerText = '[' + time + '] ' + msg;
      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
    }

    async function triggerHttp500() {
      logMsg('Firing GET /api/simulate/server-error...', 'warn');
      try {
        const res = await fetch('/api/simulate/server-error');
        logMsg('Captured HTTP 500: Server returned Internal Error (SDK notified LogPilot AI)', 'err');
      } catch (e) {
        logMsg('Network Error: ' + e.message, 'err');
      }
    }

    async function triggerHttp404() {
      logMsg('Firing GET /api/simulate/not-found...', 'warn');
      try {
        const res = await fetch('/api/simulate/not-found');
        logMsg('Captured HTTP 404: Endpoint Not Found (SDK notified LogPilot AI)', 'warn');
      } catch (e) {
        logMsg('Network Error: ' + e.message, 'err');
      }
    }

    async function triggerDbFailure() {
      logMsg('Firing POST /api/simulate/db-failure...', 'warn');
      try {
        const res = await fetch('/api/simulate/db-failure', { method: 'POST' });
        logMsg('Database Failure: PostgreSQL pool exhausted (CRITICAL event shipped to LogPilot AI)', 'err');
      } catch (e) {
        logMsg('Network Error: ' + e.message, 'err');
      }
    }

    async function triggerSlowApi() {
      logMsg('Firing GET /api/simulate/slow-api (awaiting 3500ms delay)...', 'warn');
      const start = performance.now();
      try {
        const res = await fetch('/api/simulate/slow-api');
        const dur = Math.round(performance.now() - start);
        logMsg('Slow API resolved in ' + dur + 'ms (Degraded latency metric shipped)', 'warn');
      } catch (e) {
        logMsg('Network Error: ' + e.message, 'err');
      }
    }

    function triggerJsRuntimeError() {
      logMsg('Injecting unhandled TypeError into browser runtime...', 'warn');
      try {
        // Deliberate runtime null pointer
        window.__nonExistentService.performAction();
      } catch (err) {
        // Also trigger unhandled so SDK window.onerror intercepts it
        setTimeout(() => {
          throw new TypeError("Cannot read properties of undefined (reading 'customer_id') at CheckoutView.jsx:42");
        }, 10);
        logMsg('Thrown TypeError: Cannot read properties of undefined (reading customer_id)', 'err');
      }
    }

    async function toggleServerHealth() {
      const res = await fetch('/api/simulate/toggle-health', { method: 'POST' });
      const data = await res.json();
      const badge = document.getElementById('status-badge');
      const btn = document.getElementById('toggle-outage-btn');
      if (data.simulate_down) {
        badge.className = 'badge down';
        badge.innerText = '● Target Status: OUTAGE (HTTP 503)';
        btn.innerText = 'Restore Service (HTTP 200)';
        logMsg('SIMULATED OUTAGE ACTIVE: /health will now return HTTP 503', 'err');
      } else {
        badge.className = 'badge';
        badge.innerText = '● Target Status: ONLINE (HTTP 200)';
        btn.innerText = 'Toggle Outage (503)';
        logMsg('SERVICE RESTORED: /health returns HTTP 200 OK', 'ok');
      }
    }
  </script>
</body>
</html>
"""

class DemoRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # 1. Root / UI
        if parsed.path in ("/", "/index.html"):
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
            return

        # 2. Health check endpoint (Monitored by LogPilot AI probe!)
        if parsed.path == "/health":
            self._send_cors_headers()
            if SERVER_STATE["simulate_down"]:
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"down","error":"Service Unavailable: Database Connection Failure"}')
            else:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"healthy","uptime_seconds":1420,"version":"1.4.0"}')
            return

        # 3. Simulate HTTP 500
        if parsed.path == "/api/simulate/server-error":
            self._send_cors_headers()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error":"InternalServerError","message":"NullPointerException at OrderCalculator.java:104"}')
            return

        # 4. Simulate HTTP 404
        if parsed.path == "/api/simulate/not-found":
            self._send_cors_headers()
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error":"NotFound","message":"Endpoint /api/v1/broken-link was not found on this server"}')
            return

        # 5. Simulate Slow API (3500ms delay)
        if parsed.path == "/api/simulate/slow-api":
            time.sleep(3.5)
            self._send_cors_headers()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok","latency_ms":3500,"result":"Unindexed query completed with high latency"}')
            return

        # Fallback 404
        self._send_cors_headers()
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        # 6. Simulate Database Failure
        if parsed.path == "/api/simulate/db-failure":
            self._send_cors_headers()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error":"DatabaseConnectionError","message":"PostgreSQL connection pool exhausted (max=100) at pool.js:88"}')
            return

        # 7. Toggle Health State
        if parsed.path == "/api/simulate/toggle-health":
            SERVER_STATE["simulate_down"] = not SERVER_STATE["simulate_down"]
            self._send_cors_headers()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(SERVER_STATE).encode("utf-8"))
            return

        self._send_cors_headers()
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        # Quieter console output
        pass


def run_demo_server():
    server = HTTPServer(("0.0.0.0", PORT), DemoRequestHandler)
    print("==================================================")
    print(f"🚀 LogPilot AI Hackathon Fault Demo running on http://localhost:{PORT}")
    print(f"📡 Probe Health URL: http://localhost:{PORT}/health")
    print(f"💡 Target Ingestion Key: {DEMO_PROJECT_KEY}")
    print("==================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Demo server stopped.")
        server.server_close()


if __name__ == "__main__":
    run_demo_server()
