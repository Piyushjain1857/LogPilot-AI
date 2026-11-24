import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import {
  Activity,
  Zap,
  TrendingUp,
  ExternalLink,
  Bot,
} from "lucide-react";

export default function AnomaliesPage() {
  const navigate = useNavigate();

  const anomalies = [
    {
      id: "ANOM-401",
      service: "order-service",
      detectedAt: "2026-11-24 10:00:11 UTC",
      zscore: 4.82,
      baselineRate: "1.2 errors/min",
      observedRate: "88 errors/min",
      type: "Frequency Burst Anomaly",
      pattern: "DatabaseConnectionError: connection pool exhausted (max=100)",
      trace_id: "b223-1109-ee74",
      confidence: 98,
    },
    {
      id: "ANOM-402",
      service: "checkout-service",
      detectedAt: "2026-11-24 09:46:12 UTC",
      zscore: 3.91,
      baselineRate: "0.4 errors/min",
      observedRate: "42 errors/min",
      type: "Unhandled Exception Spike",
      pattern: "KeyError: 'tax_rate_id' at CheckoutCalculator.py:142",
      trace_id: "d991-8812-cc55",
      confidence: 94,
    },
    {
      id: "ANOM-403",
      service: "payment-service",
      detectedAt: "2026-11-24 10:15:00 UTC",
      zscore: 3.15,
      baselineRate: "180ms p95 latency",
      observedRate: "15,400ms p95 latency",
      type: "Latency Outlier Anomaly",
      pattern: "HTTP 504 Gateway Timeout upstream provider=StripeConnect",
      trace_id: "a118-7744-bb99",
      confidence: 89,
    },
  ];

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Anomaly Detection Engine"
        subtitle="Rolling z-score statistical burst analysis and unsupervised frequency anomaly detection across telemetry streams."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-error">3 Anomalies Active</span>
            <span className="badge badge-success">z &gt; 3.0 Threshold</span>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Peak z-Score
            </span>
            <TrendingUp size={16} color="var(--status-error)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--status-error)" }}>
            4.82 σ
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Extreme deviation in order-service
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Detection Window
            </span>
            <Zap size={16} color="var(--accent-primary)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}>
            60s Rolling
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Continuous sliding window
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Impacted Microservices
            </span>
            <Activity size={16} color="var(--status-warning)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}>
            3
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            order, checkout, payment
          </div>
        </div>
      </div>

      {/* Anomalies Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {anomalies.map((anom) => (
          <div
            key={anom.id}
            className="card"
            style={{
              padding: "var(--space-5)",
              borderLeft: "4px solid var(--status-error)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
                  <span className="code-font" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {anom.id}
                  </span>
                  <span className="badge badge-error">z = {anom.zscore}σ</span>
                  <span className="format-pill" style={{ color: "var(--accent-primary)" }}>{anom.service}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{anom.detectedAt}</span>
                </div>
                <h3 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)" }}>
                  {anom.type} on {anom.service}
                </h3>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/app/troubleshooter")}
              >
                <Bot size={14} /> Diagnose Anomaly
              </button>
            </div>

            <div style={{ backgroundColor: "var(--bg-input)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--status-error)", wordBreak: "break-all", marginBottom: "var(--space-3)" }}>
              {anom.pattern}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)", fontSize: "var(--text-caption)", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Baseline Frequency: </span>
                <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>{anom.baselineRate}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Observed Rate: </span>
                <span className="tabular-nums" style={{ fontWeight: 700, color: "var(--status-error)" }}>{anom.observedRate}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Trace: </span>
                <span
                  className="code-font"
                  style={{ color: "var(--accent-secondary)", cursor: "pointer" }}
                  onClick={() => navigate(`/app/log-explorer?search=${encodeURIComponent(anom.trace_id)}`)}
                >
                  {anom.trace_id} <ExternalLink size={11} style={{ display: "inline" }} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
