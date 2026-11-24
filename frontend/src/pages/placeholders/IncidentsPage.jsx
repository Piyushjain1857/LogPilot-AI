import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import {
  AlertOctagon,
  Clock,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Bot,
  Zap,
} from "lucide-react";

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIncident, setExpandedIncident] = useState("INC-101");

  const incidents = [
    {
      id: "INC-101",
      title: "PostgreSQL Database Connection Pool Exhausted",
      severity: "CRITICAL",
      status: "active",
      priority: "P1",
      mttd: "420ms",
      duration: "24m 12s",
      affected_services: ["order-service", "inventory-service", "checkout-service", "db-primary.internal"],
      first_detected: "2026-11-24 10:00:11 UTC",
      last_detected: "2026-11-24 10:24:23 UTC",
      root_cause: "Database connection pool saturated (max=100) causing cascading timeouts across dependent checkout order processing workers.",
      trace_id: "b223-1109-ee74",
      timeline: [
        { time: "10:00:11.890Z", event: "PostgreSQL pool saturated (100/100 active connections) on db-primary:5432" },
        { time: "10:00:12.311Z", event: "inventory-service blocked on lock contention: SELECT * FROM inventory_locks" },
        { time: "10:00:14.650Z", event: "order-service checkout queue backed up, 18 requests waiting" },
        { time: "10:00:18.005Z", event: "Circuit breaker order-service -> db-primary tripped to OPEN" },
      ],
    },
    {
      id: "INC-102",
      title: "Canary Release Error Burst: checkout-service v2.4.1",
      severity: "HIGH",
      status: "resolved",
      priority: "P2",
      mttd: "1.2s",
      duration: "12m 45s",
      affected_services: ["checkout-service", "deploy-orchestrator"],
      first_detected: "2026-11-24 09:45:07 UTC",
      last_detected: "2026-11-24 09:57:52 UTC",
      root_cause: "Unhandled KeyError 'tax_rate_id' during checkout calculation prompted automated canary rollback to v2.4.0.",
      trace_id: "d991-8812-cc55",
      timeline: [
        { time: "09:45:07.120Z", event: "Canary deployment v2.4.1 began routing 10% of production traffic" },
        { time: "09:46:12.440Z", event: "KeyError 'tax_rate_id' raised on CheckoutCalculator.py line 142" },
        { time: "09:48:00.000Z", event: "Automated canary health probe failed (18.5% error rate > 1.0% limit)" },
        { time: "09:48:30.000Z", event: "Rollback completed to v2.4.0, error rate returned to 0.02%" },
      ],
    },
    {
      id: "INC-103",
      title: "Upstream Stripe Webhook Ingress Latency Spike",
      severity: "WARNING",
      status: "investigating",
      priority: "P3",
      mttd: "3.5s",
      duration: "8m 10s",
      affected_services: ["payment-service", "api-gateway"],
      first_detected: "2026-11-24 10:15:00 UTC",
      last_detected: "2026-11-24 10:23:10 UTC",
      root_cause: "Stripe Connect webhook response delays exceeded 15,000ms causing synchronous payment workers to block.",
      trace_id: "a118-7744-bb99",
      timeline: [
        { time: "10:15:00.000Z", event: "StripeConnect webhook latency increased from 240ms to 15,400ms" },
        { time: "10:17:30.000Z", event: "api-gateway returned HTTP 504 Gateway Timeout for 4 client requests" },
        { time: "10:20:00.000Z", event: "Async retry worker engaged, reducing client impact" },
      ],
    },
  ];

  const filtered = incidents.filter((i) => {
    if (selectedStatus !== "ALL" && i.status.toUpperCase() !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = i.title.toLowerCase().includes(q);
      const matchService = i.affected_services.some((s) => s.toLowerCase().includes(q));
      const matchTrace = i.trace_id.toLowerCase().includes(q);
      return matchTitle || matchService || matchTrace;
    }
    return true;
  });

  const toggleExpand = (id) => {
    setExpandedIncident((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Incident Command Center"
        subtitle="Automated correlation of clustered log failures into consolidated incidents with severity triage and timeline evidence."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-error">1 Active P1</span>
            <span className="badge badge-warning">1 Investigating</span>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>Active Incidents</span>
            <AlertOctagon size={16} color="var(--status-error)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--status-error)" }}>
            1
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            P1 Database Pool Saturation
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>Mean Time to Detect (MTTD)</span>
            <Zap size={16} color="var(--accent-primary)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}>
            420ms
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Log frequency burst threshold
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>Impacted Microservices</span>
            <Cpu size={16} color="var(--status-warning)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--text-primary)" }}>
            4
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            order, inventory, checkout, db
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 500 }}>Resolved Today</span>
            <CheckCircle2 size={16} color="var(--status-success)" />
          </div>
          <div className="metric-value" style={{ fontSize: "24px", fontWeight: 700, marginTop: "var(--space-2)", color: "var(--status-success)" }}>
            1
          </div>
          <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Canary v2.4.1 rollback verified
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {["ALL", "ACTIVE", "INVESTIGATING", "RESOLVED"].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-xs ${selectedStatus === st ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Filter by title, service, or trace ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 32,
                paddingLeft: 32,
                paddingRight: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--text-caption)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {filtered.map((inc) => {
          const isExp = expandedIncident === inc.id;
          const isCritical = inc.severity === "CRITICAL";

          return (
            <div
              key={inc.id}
              className="card"
              style={{
                borderLeft: `4px solid ${isCritical ? "var(--status-critical)" : inc.severity === "HIGH" ? "var(--status-error)" : "var(--status-warning)"}`,
                padding: "var(--space-5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
                    <span className="code-font" style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "13px" }}>
                      {inc.id}
                    </span>
                    <span className={`badge ${isCritical ? "badge-error" : inc.severity === "HIGH" ? "badge-warning" : "badge-neutral"}`}>
                      {inc.priority} • {inc.severity}
                    </span>
                    <StatusBadge status={inc.status} />
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={12} /> Detected {inc.first_detected}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)" }}>
                    {inc.title}
                  </h3>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleExpand(inc.id)}
                  >
                    {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isExp ? "Hide Evidence" : "Investigate Evidence"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate("/app/troubleshooter")}
                  >
                    <Bot size={14} /> AI Troubleshoot
                  </button>
                </div>
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
                <strong>Probable Cause:</strong> {inc.root_cause}
              </p>

              {/* Service tags & Trace ID */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
                  <span>Impacted Services:</span>
                  {inc.affected_services.map((svc) => (
                    <span key={svc} className="format-pill" style={{ color: "var(--accent-primary)" }}>
                      {svc}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-caption)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Trace:</span>
                  <span
                    className="code-font"
                    style={{ color: "var(--accent-secondary)", cursor: "pointer" }}
                    onClick={() => navigate(`/app/log-explorer?search=${encodeURIComponent(inc.trace_id)}`)}
                    title="Filter in Log Explorer"
                  >
                    {inc.trace_id} <ExternalLink size={11} style={{ display: "inline" }} />
                  </span>
                </div>
              </div>

              {/* Expandable Timeline & Diagnostics */}
              {isExp && (
                <div className="animate-slide-up" style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px dashed var(--border-subtle)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "var(--space-3)" }}>
                    Incident Causal Event Timeline
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {inc.timeline.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", fontSize: "var(--text-caption)" }}>
                        <span className="code-font" style={{ color: "var(--text-muted)", fontSize: "11px", width: "120px", flexShrink: 0 }}>
                          {item.time}
                        </span>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: idx === 0 ? "var(--status-error)" : "var(--accent-primary)", marginTop: 5, flexShrink: 0 }} />
                        <span style={{ color: "var(--text-primary)" }}>{item.event}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => navigate(`/app/root-cause`)}
                    >
                      View Failure Propagation Graph <ArrowRight size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => navigate(`/app/remediation`)}
                    >
                      View Mitigation Runbook
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
