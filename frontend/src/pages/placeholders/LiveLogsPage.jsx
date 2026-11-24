import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import LogTable from "../../components/logs/LogTable";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Radio, Play, Pause, Info } from "lucide-react";

export default function LiveLogsPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [autoScroll, setAutoScroll] = useState(true);

  // Demonstration synthetic log buffer
  const sampleLogs = [
    {
      id: "log-1",
      timestamp: "2026-11-24T10:00:11.890Z",
      severity: "CRITICAL",
      service_name: "order-service",
      message: "DatabaseConnectionError: could not connect to PostgreSQL primary host=db-primary.internal port=5432: connection pool exhausted (max=100)",
      raw_message: "2026-11-24T10:00:11.890Z [CRITICAL] [order-service] trace_id=b223-1109-ee74 span_id=s-007 DatabaseConnectionError: could not connect to PostgreSQL primary host=db-primary.internal port=5432: connection pool exhausted (max=100)",
      trace_id: "b223-1109-ee74",
      span_id: "s-007",
      source_id: "src-order",
    },
    {
      id: "log-2",
      timestamp: "2026-11-24T10:00:12.311Z",
      severity: "ERROR",
      service_name: "inventory-service",
      message: "Database query timeout after 5000ms: SELECT * FROM inventory_locks WHERE sku='SKU-998'",
      raw_message: "2026-11-24T10:00:12.311Z [ERROR] [inventory-service] trace_id=b223-1109-ee74 span_id=s-008 Database query timeout after 5000ms: SELECT * FROM inventory_locks WHERE sku='SKU-998'",
      trace_id: "b223-1109-ee74",
      span_id: "s-008",
      source_id: "src-inv",
    },
    {
      id: "log-3",
      timestamp: "2026-11-24T10:00:14.650Z",
      severity: "ERROR",
      service_name: "payment-service",
      message: "HTTP 504 Gateway Timeout while awaiting upstream payment gateway webhook provider=StripeConnect",
      raw_message: "2026-11-24T10:00:14.650Z [ERROR] [payment-service] trace_id=a118-7744-bb99 span_id=s-009 HTTP 504 Gateway Timeout while awaiting upstream payment gateway webhook provider=StripeConnect",
      trace_id: "a118-7744-bb99",
      span_id: "s-009",
      source_id: "src-pay",
    },
    {
      id: "log-4",
      timestamp: "2026-11-24T10:00:18.005Z",
      severity: "WARNING",
      service_name: "deploy-orchestrator",
      message: "Canary health probe failed: checkout-service error rate 18.5% exceeds threshold 1.0%",
      raw_message: "2026-11-24T10:00:18.005Z [WARNING] [deploy-orchestrator] trace_id=d991-8812-cc55 span_id=s-010 Canary health probe failed: checkout-service error rate 18.5% exceeds threshold 1.0%",
      trace_id: "d991-8812-cc55",
      span_id: "s-010",
      source_id: "src-deploy",
    },
    {
      id: "log-5",
      timestamp: "2026-11-24T10:00:25.100Z",
      severity: "INFO",
      service_name: "circuit-breaker",
      message: "Circuit breaker for order-service -> db-primary switched from OPEN to HALF_OPEN",
      raw_message: "2026-11-24T10:00:25.100Z [INFO] [circuit-breaker] trace_id=b223-1109-ee74 span_id=s-012 Circuit breaker for order-service -> db-primary switched from OPEN to HALF_OPEN",
      trace_id: "b223-1109-ee74",
      span_id: "s-012",
      source_id: "src-cb",
    },
  ];

  const filteredLogs = sampleLogs.filter((l) => {
    if (severityFilter === "ALL") return true;
    return l.severity === severityFilter;
  });

  return (
    <div>
      <PageHeader
        title="Live Logs Stream"
        description="Low-latency log tailing, paused inspection, and live stream filtering."
        badge={<Badge variant="default" icon={Radio}>WebSocket Stream</Badge>}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Button
              variant={isPaused ? "primary" : "secondary"}
              size="sm"
              icon={isPaused ? Play : Pause}
              onClick={() => setIsPaused((prev) => !prev)}
            >
              {isPaused ? "Resume Stream" : "Pause Stream"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll((prev) => !prev)}
            >
              Auto-Scroll: {autoScroll ? "ON" : "OFF"}
            </Button>
          </div>
        }
      />

      {/* Streaming Status Information Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-4)",
          fontSize: "var(--text-caption)",
          color: "var(--text-secondary)",
        }}
      >
        <Info size={16} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
        <span>
          <strong>Streaming Notice:</strong> Displaying benchmark demonstration buffer. Full live WebSocket stream broadcasting will be enabled in Phase 3.
        </span>
      </div>

      {/* Filter Toolbar */}
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>Severity:</span>
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
          <div style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
            Buffered lines: <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>{filteredLogs.length}</strong>
          </div>
        </div>
      </Card>

      {/* Log Table */}
      <LogTable logs={filteredLogs} />
    </div>
  );
}
