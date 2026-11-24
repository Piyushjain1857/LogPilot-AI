import React from "react";
import { Activity, AlertTriangle, Layers, Database, Radio } from "lucide-react";

export default function LiveMetricsRow({ metrics, totalSessionEvents, queueDepth }) {
  const { logsPerSecond = 0, errorsPerMinute = 0, activeSources = 0 } = metrics || {};

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "var(--space-4)",
      }}
    >
      {/* Logs Per Second */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
            Ingestion Throughput
          </span>
          <Activity size={16} color="var(--accent-primary)" />
        </div>
        <div
          className="metric-value tabular-nums"
          style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}
        >
          {logsPerSecond.toFixed(1)} <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>logs/s</span>
        </div>
        <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          Rolling 5-min window
        </div>
      </div>

      {/* Errors / Minute */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
            Error Velocity
          </span>
          <AlertTriangle size={16} color="var(--status-error)" />
        </div>
        <div
          className="metric-value tabular-nums"
          style={{
            fontSize: "24px",
            fontWeight: 700,
            marginTop: "var(--space-2)",
            color: errorsPerMinute > 0 ? "var(--status-error)" : "var(--text-primary)",
          }}
        >
          {errorsPerMinute} <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>err/min</span>
        </div>
        <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          ERROR & CRITICAL events
        </div>
      </div>

      {/* Active Streaming Sources */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
            Active Sources
          </span>
          <Radio size={16} color="var(--status-success)" />
        </div>
        <div
          className="metric-value tabular-nums"
          style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}
        >
          {activeSources}
        </div>
        <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          Connected pipelines & agents
        </div>
      </div>

      {/* Ingestion Queue Depth */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
            Queue Depth
          </span>
          <Layers size={16} color="var(--status-warning)" />
        </div>
        <div
          className="metric-value tabular-nums"
          style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}
        >
          {queueDepth} <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>/ 5,000</span>
        </div>
        <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          Pending worker buffer
        </div>
      </div>

      {/* Session Events */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
            Session Events
          </span>
          <Database size={16} color="var(--accent-secondary)" />
        </div>
        <div
          className="metric-value tabular-nums"
          style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}
        >
          {totalSessionEvents.toLocaleString()}
        </div>
        <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          Streamed to this browser
        </div>
      </div>
    </div>
  );
}
