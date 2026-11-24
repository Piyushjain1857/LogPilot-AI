import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import StatusBadge from "../../components/common/StatusBadge";
import Button from "../../components/common/Button";
import { AlertTriangle } from "lucide-react";

export default function IncidentsPage() {
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const incidents = [
    {
      id: "INC-101",
      title: "PostgreSQL Database Connection Pool Exhausted",
      severity: "CRITICAL",
      status: "active",
      affected_services: ["order-service", "inventory-service", "checkout-service"],
      first_detected: "2026-11-24 10:00:11 UTC",
      last_detected: "2026-11-24 10:00:30 UTC",
      description: "Database connection pool saturated (max=100) causing cascading timeouts across dependent checkout order processing workers.",
    },
    {
      id: "INC-102",
      title: "Canary Release Health Failure: checkout-service v2.4.1",
      severity: "HIGH",
      status: "resolved",
      affected_services: ["checkout-service", "deploy-orchestrator"],
      first_detected: "2026-11-24 10:00:07 UTC",
      last_detected: "2026-11-24 10:00:19 UTC",
      description: "Unhandled KeyError 'tax_rate_id' during checkout calculation prompted automatic canary rollback to v2.4.0.",
    },
  ];

  const filtered = incidents.filter((i) => {
    if (selectedStatus !== "ALL" && i.status !== selectedStatus.toLowerCase()) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Incident Management"
        description="Automated error grouping into consolidated incidents with lifecycle state tracking and triage."
        badge={<Badge variant="error" icon={AlertTriangle}>2 Incidents</Badge>}
      />

      {/* Filter Bar */}
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>Filter Status:</span>
          {["ALL", "ACTIVE", "RESOLVED"].map((st) => (
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
      </Card>

      {/* Incidents Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {filtered.map((inc) => (
          <Card key={inc.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                  <span className="code-font" style={{ fontWeight: 700, color: "var(--text-primary)" }}>{inc.id}</span>
                  <Badge variant={inc.severity === "CRITICAL" ? "critical" : "warning"}>{inc.severity}</Badge>
                  <StatusBadge status={inc.status} />
                </div>
                <h3 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)" }}>
                  {inc.title}
                </h3>
              </div>
              <span className="code-font" style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)" }}>
                {inc.first_detected}
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
              {inc.description}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
                <span>Affected Services:</span>
                {inc.affected_services.map((svc) => (
                  <span key={svc} className="code-font" style={{ backgroundColor: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "var(--radius-xs)", color: "var(--accent-secondary)" }}>
                    {svc}
                  </span>
                ))}
              </div>
              <Button variant="outline" size="xs">
                Investigate Traces
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
