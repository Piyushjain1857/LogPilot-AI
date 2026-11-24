import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import {
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState("RPT-001");
  const [copied, setCopied] = useState(false);

  const reports = [
    {
      id: "RPT-001",
      title: "Post-Mortem: PostgreSQL Connection Pool Saturation (INC-101)",
      category: "Incident Post-Mortem",
      date: "2026-11-24 10:30 UTC",
      duration: "24m 12s",
      impact: "Order checkout latency elevated for 4.2% of users",
      status: "Finalized",
      mttd: "420ms",
      mttr: "24m 12s",
      summary:
        "On 2026-11-24 at 10:00:11 UTC, an unindexed table scan on inventory_locks saturated all 100 available connections in db-primary's Hikari pool. Cascading checkout timeouts were contained by the order-service circuit breaker. Mitigated by terminating idle locks, increasing buffer pool to 150, and adding composite index idx_inv_locks_sku_date.",
    },
    {
      id: "RPT-002",
      title: "Canary Rollback Audit: checkout-service v2.4.1 (INC-102)",
      category: "Release Health Audit",
      date: "2026-11-24 09:58 UTC",
      duration: "12m 45s",
      impact: "18.5% error rate on canary traffic; 0 user data loss",
      status: "Finalized",
      mttd: "1.2s",
      mttr: "12m 45s",
      summary:
        "Canary deployment v2.4.1 introduced a regression expecting missing tax_rate_id attribute. Automated health probe triggered rollback to v2.4.0 within 12 seconds of breach. No production data was corrupted.",
    },
    {
      id: "RPT-003",
      title: "Weekly Telemetry Ingestion & Reliability Summary",
      category: "Weekly SLA Audit",
      date: "2026-11-23 23:59 UTC",
      duration: "7 Days",
      impact: "99.98% overall microservice availability",
      status: "Automated",
      mttd: "2.1s avg",
      mttr: "14m avg",
      summary:
        "Processed 2.4 million log lines across 18 microservice endpoints. 4,120 sensitive tokens redacted. 3 statistical anomaly bursts detected and investigated.",
    },
  ];

  const current = reports.find((r) => r.id === selectedReport) || reports[0];

  const handleCopyMarkdown = () => {
    const md = `# ${current.title}\n**ID:** ${current.id}\n**Category:** ${current.category}\n**Date:** ${current.date}\n**MTTD:** ${current.mttd} | **MTTR:** ${current.mttr}\n\n## Executive Summary\n${current.summary}\n\n## Impact Assessment\n${current.impact}\n\n*Generated automatically by LogPilot AI Post-Mortem Engine.*`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Incident & Reliability Reports"
        subtitle="Automated post-mortem synthesis, SLA impact audits, and executive reliability summaries."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-success">3 Reports Ready</span>
            <span className="badge badge-neutral">SLA: 99.98%</span>
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginBottom: 4 }}>
            System Availability (7d)
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, color: "var(--status-success)" }}>
            99.98%
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>Within SLA target of 99.95%</div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginBottom: 4 }}>
            Average MTTD
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
            810ms
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>Real-time z-score detection</div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginBottom: 4 }}>
            Average MTTR
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-primary)" }}>
            18m 28s
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>Automated playbook guidance</div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginBottom: 4 }}>
            Masked Credentials
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, color: "var(--status-warning)" }}>
            4,120
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>Zero leak policy verified</div>
        </div>
      </div>

      {/* Two Column Layout: Report Selector & Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: "var(--space-6)" }}>
        {/* Report List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {reports.map((rep) => (
            <div
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              className="card"
              style={{
                padding: "var(--space-4)",
                cursor: "pointer",
                border: selectedReport === rep.id ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                backgroundColor: selectedReport === rep.id ? "var(--bg-elevated)" : "var(--bg-surface)",
                transition: "all var(--transition-fast)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span className="code-font" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>
                  {rep.id}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: 10 }}>{rep.category}</span>
              </div>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                {rep.title}
              </h4>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: "var(--space-2)" }}>
                <span>{rep.date}</span>
                <span>•</span>
                <span>{rep.duration}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Report Viewer */}
        <div className="card" style={{ padding: "var(--space-6)", borderLeft: "4px solid var(--accent-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                <span className="code-font" style={{ fontWeight: 700, fontSize: 13, color: "var(--accent-primary)" }}>
                  {current.id}
                </span>
                <span className="badge badge-success">{current.status}</span>
                <span className="badge badge-neutral">{current.category}</span>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                {current.title}
              </h2>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyMarkdown}
            >
              {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
              <span>{copied ? "Copied Markdown" : "Copy Report"}</span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-6)", backgroundColor: "var(--bg-elevated)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Generated</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{current.date}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Impact Window</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{current.duration}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Detection (MTTD)</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: "var(--status-success)" }}>{current.mttd}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Resolution (MTTR)</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent-primary)" }}>{current.mttr}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                1. Executive Summary
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {current.summary}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                2. User Impact Assessment
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {current.impact}
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-4)", display: "flex", alignItems: "center", gap: 6, fontSize: "11.5px", color: "var(--text-muted)" }}>
              <ShieldCheck size={14} color="var(--status-success)" />
              <span>Verified against raw SQLite logs with zero credential leakage.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
