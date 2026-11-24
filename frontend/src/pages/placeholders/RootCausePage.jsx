import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import {
  ArrowRight,
  Database,
  Server,
  Activity,
  Bot,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

export default function RootCausePage() {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState("db-primary");
  const [copiedTrace, setCopiedTrace] = useState(false);

  const nodes = {
    "api-gateway": {
      name: "api-gateway",
      role: "Edge Reverse Proxy",
      status: "degraded",
      error: "HTTP 504 Gateway Timeout (4.2% requests)",
      latency: "15,200ms p99",
      correlatedEvents: 6,
      rootCauseLikelihood: "Upstream Symptom",
      details: "Client requests arriving at /v1/checkout/orders blocked awaiting responses from order-service.",
    },
    "order-service": {
      name: "order-service",
      role: "Core Checkout Worker",
      status: "critical",
      error: "DatabaseConnectionError: Pool Exhausted (100/100)",
      latency: "5,000ms timeout",
      correlatedEvents: 18,
      rootCauseLikelihood: "Intermediate Failure",
      details: "Worker threads attempted to acquire connection from Hikari pool; all 100 connections were occupied by long-running transactions.",
    },
    "db-primary": {
      name: "db-primary.internal:5432",
      role: "PostgreSQL Database Cluster",
      status: "root-cause",
      error: "Lock Contention on inventory_locks table",
      latency: "Saturated (100% capacity)",
      correlatedEvents: 24,
      rootCauseLikelihood: "Confirmed Root Cause (96% Confidence)",
      details: "Missing index on inventory_locks(sku) forced sequential table scans during concurrent holiday traffic, causing locks to hold connections open for >5000ms.",
    },
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  const activeInfo = nodes[selectedNode] || nodes["db-primary"];

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Root Cause Analysis & Topology"
        subtitle="Cross-service trace correlation, causal dependency trees, and failure propagation analysis."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-error">Root Cause Identified</span>
            <span className="badge badge-success">96% Confidence</span>
          </div>
        }
      />

      {/* Main Failure Propagation Graph */}
      <Card title="Interactive Failure Propagation Tree">
        <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
          Click any microservice node below to inspect telemetry latency, error states, and causal evidence.
        </p>

        <div
          style={{
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-8) var(--space-4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-5)",
            flexWrap: "wrap",
            position: "relative",
          }}
        >
          {/* Node 1: api-gateway */}
          <div
            onClick={() => setSelectedNode("api-gateway")}
            className="card"
            style={{
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              width: 170,
              cursor: "pointer",
              border: selectedNode === "api-gateway" ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-surface)",
              boxShadow: selectedNode === "api-gateway" ? "var(--shadow-glow-accent)" : "var(--shadow-sm)",
              textAlign: "center",
              transition: "all var(--transition-fast)",
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--accent-primary-alpha)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-2)" }}>
              <Server size={16} />
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Edge Service</div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "13px" }}>api-gateway</div>
            <span className="badge badge-warning" style={{ marginTop: 6, fontSize: "10px" }}>HTTP 504</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <ArrowRight size={22} style={{ color: "var(--status-warning)" }} />
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>+420ms</span>
          </div>

          {/* Node 2: order-service */}
          <div
            onClick={() => setSelectedNode("order-service")}
            className="card"
            style={{
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              width: 170,
              cursor: "pointer",
              border: selectedNode === "order-service" ? "2px solid var(--status-error)" : "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-surface)",
              boxShadow: selectedNode === "order-service" ? "var(--shadow-glow-error)" : "var(--shadow-sm)",
              textAlign: "center",
              transition: "all var(--transition-fast)",
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--status-error-alpha)", color: "var(--status-error)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-2)" }}>
              <Activity size={16} />
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Worker Service</div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "13px" }}>order-service</div>
            <span className="badge badge-error" style={{ marginTop: 6, fontSize: "10px" }}>Pool Blocked</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <ArrowRight size={22} style={{ color: "var(--status-critical)" }} />
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>+5,000ms</span>
          </div>

          {/* Node 3: db-primary (Root Cause) */}
          <div
            onClick={() => setSelectedNode("db-primary")}
            className="card"
            style={{
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              width: 190,
              cursor: "pointer",
              border: selectedNode === "db-primary" ? "2px solid var(--status-critical)" : "2px dashed var(--status-critical)",
              backgroundColor: "var(--bg-surface)",
              boxShadow: "0 0 24px rgba(168, 85, 247, 0.3)",
              textAlign: "center",
              transition: "all var(--transition-fast)",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", backgroundColor: "var(--status-critical)", color: "#FFFFFF", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "var(--radius-full)", letterSpacing: "0.05em" }}>
              ROOT CAUSE
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "rgba(168, 85, 247, 0.15)", color: "var(--status-critical)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-2)" }}>
              <Database size={18} />
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Primary Database</div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "13px" }}>db-primary:5432</div>
            <span className="badge badge-error" style={{ marginTop: 6, fontSize: "10px", backgroundColor: "var(--status-critical)" }}>
              Pool Saturated (100)
            </span>
          </div>
        </div>
      </Card>

      {/* Two-Column Diagnostic & Evidence Inspector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--space-6)" }}>
        {/* Node Inspector Card */}
        <Card title={`Node Telemetry Details: ${activeInfo.name}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-3)" }}>
              <div className="metric-box">
                <div className="metric-box-label">Classification</div>
                <div className="metric-box-val" style={{ fontSize: "13px", color: activeInfo.status === "root-cause" ? "var(--status-critical)" : "var(--text-primary)" }}>
                  {activeInfo.rootCauseLikelihood}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-box-label">Observed Latency</div>
                <div className="metric-box-val" style={{ fontSize: "13px", color: "var(--status-error)" }}>
                  {activeInfo.latency}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-box-label">Correlated Events</div>
                <div className="metric-box-val" style={{ fontSize: "13px" }}>
                  {activeInfo.correlatedEvents}
                </div>
              </div>
            </div>

            <div style={{ padding: "var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", fontSize: "var(--text-caption)", lineHeight: 1.6, color: "var(--text-primary)" }}>
              <strong>Observation:</strong> {activeInfo.details}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(`/app/log-explorer?service_name=${encodeURIComponent(activeInfo.name.split(":")[0])}`)}
              >
                Inspect Logs for {activeInfo.name.split(":")[0]} <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/app/troubleshooter")}
              >
                <Bot size={13} /> Ask Troubleshooter
              </button>
            </div>
          </div>
        </Card>

        {/* Trace Evidence & Causal Citations */}
        <Card title="Correlated Distributed Trace Evidence">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--text-muted)" }}>Trace ID:</span>
                <span className="code-font" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
                  b223-1109-ee74
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => handleCopy("b223-1109-ee74")}
              >
                {copiedTrace ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                <span>{copiedTrace ? "Copied" : "Copy ID"}</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--bg-primary)", borderRadius: "var(--radius-xs)", borderLeft: "3px solid var(--status-critical)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--text-muted)" }}>10:00:11.890Z</span> [CRITICAL] [order-service] DatabaseConnectionError: connection pool exhausted (max=100)
              </div>
              <div style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--bg-primary)", borderRadius: "var(--radius-xs)", borderLeft: "3px solid var(--status-error)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--text-muted)" }}>10:00:12.311Z</span> [ERROR] [inventory-service] Database query timeout after 5000ms: SELECT * FROM inventory_locks WHERE sku=&apos;SKU-998&apos;
              </div>
              <div style={{ padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--bg-primary)", borderRadius: "var(--radius-xs)", borderLeft: "3px solid var(--status-warning)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--text-muted)" }}>10:00:18.005Z</span> [WARNING] [circuit-breaker] Circuit breaker for order-service -&gt; db-primary tripped to OPEN
              </div>
            </div>

            <div style={{ marginTop: "var(--space-2)", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/app/remediation")}
              >
                Open Remediation Runbook <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
