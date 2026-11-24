import React, { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/common/PageHeader";
import LogTable from "../../components/logs/LogTable";
import {
  Play,
  Pause,
  RotateCcw,
  Search,
} from "lucide-react";

const INITIAL_STREAM_LOGS = [
  {
    id: "live-1",
    timestamp: "2026-11-24T10:30:15.112Z",
    severity: "INFO",
    service_name: "api-gateway",
    message: "GET /api/v1/orders/status HTTP/1.1 status=200 duration=14ms ip=192.168.1.42",
    trace_id: "tr-9981-aa01",
    span_id: "sp-01",
  },
  {
    id: "live-2",
    timestamp: "2026-11-24T10:30:15.890Z",
    severity: "INFO",
    service_name: "auth-service",
    message: "Validated JWT bearer token for subject user_id=usr_88921 client_id=mobile-app",
    trace_id: "tr-9981-aa01",
    span_id: "sp-02",
  },
  {
    id: "live-3",
    timestamp: "2026-11-24T10:30:16.210Z",
    severity: "WARNING",
    service_name: "inventory-service",
    message: "High lock acquisition latency: SELECT * FROM stock WHERE sku='SKU-441' took 342ms",
    trace_id: "tr-9981-aa02",
    span_id: "sp-03",
  },
  {
    id: "live-4",
    timestamp: "2026-11-24T10:30:17.050Z",
    severity: "ERROR",
    service_name: "payment-service",
    message: "HTTP 504 Gateway Timeout connecting to StripeConnect webhook upstream latency=15,200ms",
    trace_id: "tr-9981-aa03",
    span_id: "sp-04",
  },
  {
    id: "live-5",
    timestamp: "2026-11-24T10:30:18.420Z",
    severity: "CRITICAL",
    service_name: "order-service",
    message: "DatabaseConnectionError: HikariPool-1 connection pool saturated (100/100 active)",
    trace_id: "tr-9981-aa04",
    span_id: "sp-05",
  },
];

const STREAM_TEMPLATES = [
  { sev: "INFO", svc: "api-gateway", msg: "HTTP 200 GET /v1/health status=UP duration=2ms" },
  { sev: "INFO", svc: "cart-service", msg: "Cart items updated session_id=sess_998 item_count=3" },
  { sev: "WARNING", svc: "cache-redis", msg: "Memory utilization warning: redis cache reached 82% threshold" },
  { sev: "INFO", svc: "order-service", msg: "Order created successfully order_id=ord_4812 status=PENDING" },
  { sev: "ERROR", svc: "notification-svc", msg: "Failed to dispatch SMS notification provider=Twilio timeout=3000ms" },
  { sev: "INFO", svc: "auth-service", msg: "Session refreshed token_expiry=3600s user_id=usr_104" },
  { sev: "CRITICAL", svc: "order-service", msg: "Connection pool timeout acquiring connection after 5000ms" },
];

export default function LiveLogsPage() {
  const [logs, setLogs] = useState(INITIAL_STREAM_LOGS);
  const [isPaused, setIsPaused] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x
  const [eventsPerSec, setEventsPerSec] = useState(12);

  const streamEndRef = useRef(null);

  // Streaming log generator
  useEffect(() => {
    if (isPaused) return;

    const intervalMs = Math.round(1800 / speed);
    const interval = setInterval(() => {
      const template = STREAM_TEMPLATES[Math.floor(Math.random() * STREAM_TEMPLATES.length)];
      const randTrace = `tr-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6)}`;
      const newEntry = {
        id: `live-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        severity: template.sev,
        service_name: template.svc,
        message: template.msg,
        trace_id: randTrace,
        span_id: `sp-${Math.floor(Math.random() * 99)}`,
      };

      setLogs((prev) => [...prev.slice(-150), newEntry]);
      setEventsPerSec((prev) => Math.max(6, Math.min(60, Math.round(prev + (Math.random() * 4 - 2)))));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPaused, speed]);

  const filteredLogs = logs.filter((l) => {
    if (severityFilter !== "ALL" && l.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.service_name.toLowerCase().includes(q) ||
        (l.trace_id && l.trace_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Live Log Stream"
        subtitle="Real-time telemetry streaming buffer with level filtering, pattern search, and live event frequency metrics."
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <button
              type="button"
              className={`btn ${isPaused ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={() => setIsPaused((prev) => !prev)}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? "Resume Stream" : "Pause Stream"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setLogs([])}
              title="Clear buffer"
            >
              <RotateCcw size={14} /> Clear Buffer
            </button>
          </div>
        }
      />

      {/* Stream Controls Toolbar */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
          {/* Status Indicator & Rate */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                className={isPaused ? "" : "pulse-dot"}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: isPaused ? "var(--status-neutral)" : "var(--status-error)",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-primary)" }}>
                {isPaused ? "STREAM PAUSED" : "LIVE STREAMING"}
              </span>
            </div>

            <span className="tabular-nums" style={{ fontSize: "11.5px", color: "var(--text-secondary)", backgroundColor: "var(--bg-elevated)", padding: "2px 8px", borderRadius: "var(--radius-full)", border: "1px solid var(--border-subtle)" }}>
              ~{eventsPerSec} events/sec
            </span>

            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              Buffer: {logs.length} records
            </span>
          </div>

          {/* Speed & Autoscroll Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "var(--text-caption)" }}>
              <span style={{ color: "var(--text-muted)" }}>Speed:</span>
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn btn-xs ${speed === s ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span>Auto-scroll</span>
            </label>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-subtle)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
          {/* Level Filter Chips */}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {["ALL", "CRITICAL", "ERROR", "WARNING", "INFO"].map((sev) => (
              <button
                key={sev}
                type="button"
                className={`btn btn-xs ${severityFilter === sev ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Filter Search input */}
          <div style={{ position: "relative", minWidth: 240 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Filter live messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 30,
                paddingLeft: 28,
                paddingRight: "var(--space-2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Streaming Console Table */}
      <div className="card" style={{ minHeight: 480 }}>
        <LogTable
          logs={filteredLogs}
          loading={false}
          emptyTitle="No log entries in current stream buffer"
          emptyDescription="Matching log entries will appear automatically as events arrive."
        />
        <div ref={streamEndRef} />
      </div>
    </div>
  );
}
