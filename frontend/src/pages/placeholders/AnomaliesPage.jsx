import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import MetricCard from "../../components/dashboard/MetricCard";
import Badge from "../../components/common/Badge";
import Timeline from "../../components/common/Timeline";
import { Activity, ShieldAlert, Sliders } from "lucide-react";

export default function AnomaliesPage() {
  const [zScoreThreshold, setZScoreThreshold] = useState("3.0");
  const [windowSize, setWindowSize] = useState("15m");

  const anomalyEvents = [
    {
      title: "Sudden Error Burst in order-service",
      timestamp: "10:00:11 UTC",
      description: "Error frequency spiked to 18.5 standard deviations above 15m baseline. Correlated with DB connection exhaustion.",
      color: "var(--severity-critical)",
    },
    {
      title: "Latency Distribution Shift in payment-service",
      timestamp: "10:00:14 UTC",
      description: "P99 duration shifted from 120ms to 5004ms (HTTP 504 Gateway Timeout).",
      color: "var(--severity-error)",
    },
    {
      title: "Checkout Error Rate Canary Threshold Breached",
      timestamp: "10:00:18 UTC",
      description: "Canary error rate 18.5% exceeded 1.0% maximum tolerance.",
      color: "var(--severity-warning)",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Anomaly Detection"
        description="Statistical moving-window burst detection and log rate shift analysis."
        badge={<Badge variant="primary" icon={Activity}>Drain3 + Z-Score</Badge>}
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          title="Active Anomalies"
          value="3"
          icon={ShieldAlert}
          color="var(--severity-critical)"
          footerText="Exceeding 3.0σ bounds"
        />
        <MetricCard
          title="Peak Z-Score"
          value="18.5σ"
          icon={Activity}
          color="var(--severity-error)"
          footerText="order-service burst"
        />
        <MetricCard
          title="Baseline Window"
          value={windowSize}
          icon={Sliders}
          color="var(--text-primary)"
          footerText="Rolling sample window"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--card-gap)", marginBottom: "var(--space-6)" }}>
        {/* Timeline of Anomalies */}
        <Card title="Detected Anomaly Sequence">
          <Timeline events={anomalyEvents} />
        </Card>

        {/* Sensitivity & Configuration */}
        <Card title="Statistical Detection Thresholds">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <label style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Z-Score Confidence Threshold (σ)
              </label>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {["2.0", "2.5", "3.0", "3.5"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`btn btn-xs ${zScoreThreshold === val ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setZScoreThreshold(val)}
                  >
                    {val}σ
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Rolling Baseline Window
              </label>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {["5m", "15m", "30m", "1h"].map((win) => (
                  <button
                    key={win}
                    type="button"
                    className={`btn btn-xs ${windowSize === win ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setWindowSize(win)}
                  >
                    {win}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--text-muted)" }}>
              Statistical burst detection algorithms will be attached to live streaming data during Phase 3.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
