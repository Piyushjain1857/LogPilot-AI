import React from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import { GitBranch, ArrowRight } from "lucide-react";

export default function RootCausePage() {
  return (
    <div>
      <PageHeader
        title="Root Cause Analysis"
        description="Cross-service trace correlation, failure propagation trees, and causal evidence."
        badge={<Badge variant="primary" icon={GitBranch}>Distributed Tracing</Badge>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--card-gap)", marginBottom: "var(--space-6)" }}>
        {/* Service Dependency Topology Container */}
        <Card title="Microservice Failure Propagation Graph">
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
            Visual correlation mapping upstream caller timeouts to downstream primary failures.
          </p>

          <div
            style={{
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-6) var(--space-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-4)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ textAlign: "center", padding: "var(--space-3)", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", width: 140 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Edge Service</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>api-gateway</div>
              <Badge variant="warning" style={{ marginTop: 4 }}>HTTP 504</Badge>
            </div>

            <ArrowRight size={20} style={{ color: "var(--status-error)" }} />

            <div style={{ textAlign: "center", padding: "var(--space-3)", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", width: 140 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Worker</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>order-service</div>
              <Badge variant="error" style={{ marginTop: 4 }}>Pool Exhausted</Badge>
            </div>

            <ArrowRight size={20} style={{ color: "var(--status-critical)" }} />

            <div style={{ textAlign: "center", padding: "var(--space-3)", backgroundColor: "var(--bg-surface)", border: "2px solid var(--severity-critical)", borderRadius: "var(--radius-md)", width: 150 }}>
              <div style={{ fontSize: 11, color: "var(--severity-critical)", fontWeight: 700 }}>ROOT CAUSE</div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>db-primary.internal</div>
              <Badge variant="critical" style={{ marginTop: 4 }}>Max Connections (100)</Badge>
            </div>
          </div>
        </Card>

        {/* Diagnostic Evidence Panel */}
        <Card title="Probable Root Cause & Evidence">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-body-sm)" }}>Diagnosis Confidence:</span>
              <Badge variant="success">96% High Confidence</Badge>
            </div>

            <div style={{ padding: "var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong>Primary Hypothesis:</strong> The PostgreSQL connection pool on <code>db-primary.internal:5432</code> reached maximum capacity (100/100).
              Subsequent connection acquisitions from <code>order-service</code> and <code>inventory-service</code> blocked until the 5000ms timeout threshold, triggering circuit breakers.
            </div>

            <div style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
              Correlated Trace IDs:
            </div>
            <div className="code-font" style={{ fontSize: 12, backgroundColor: "var(--bg-input)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", color: "var(--accent-primary)" }}>
              b223-1109-ee74 (14 correlated log events)
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
