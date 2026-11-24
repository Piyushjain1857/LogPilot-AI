import React from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import CopyButton from "../../components/common/CopyButton";
import { ShieldCheck, Lock } from "lucide-react";

export default function RemediationPage() {
  const playbooks = [
    {
      id: "PB-01",
      title: "Scale Connection Pool & Drain Hung Worker Queries",
      incident: "INC-101 (PostgreSQL Pool Exhaustion)",
      risk: "MEDIUM",
      approval: "Pending Approval",
      steps: [
        { num: 1, action: "Verify current active PostgreSQL backend connections", cmd: "SELECT count(*), state FROM pg_stat_activity GROUP BY state;" },
        { num: 2, action: "Increase max connection pool limit on order-service config", cmd: "kubectl patch deployment order-service -p '{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"order\",\"env\":[{\"name\":\"DB_POOL_MAX\",\"value\":\"150\"}]}]}}}}'" },
        { num: 3, action: "Perform rolling restart of affected order worker pods", cmd: "kubectl rollout restart deployment order-service" },
        { num: 4, action: "Verify circuit breaker reset to CLOSED state", cmd: "curl -s http://order-service.internal/health | jq .circuit_breaker" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Remediation Playbooks"
        description="Actionable mitigation runbooks generated from diagnosed root causes with human-in-the-loop approvals."
        badge={<Badge variant="primary" icon={ShieldCheck}>Human-in-the-Loop</Badge>}
      />

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
        <Lock size={16} style={{ color: "var(--status-warning)", flexShrink: 0 }} />
        <span>
          <strong>Execution Safety Guard Active:</strong> Remediation commands are displayed for operator verification only (<code>ENABLE_REMEDIATION_EXECUTION=false</code>).
          Automated arbitrary execution is permanently disabled.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {playbooks.map((pb) => (
          <Card key={pb.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                  <span className="code-font" style={{ fontWeight: 700 }}>{pb.id}</span>
                  <Badge variant="warning">{pb.risk} RISK</Badge>
                  <Badge variant="default">{pb.approval}</Badge>
                </div>
                <h3 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)" }}>
                  {pb.title}
                </h3>
                <div style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginTop: 2 }}>
                  Correlated Incident: {pb.incident}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "var(--space-4)" }}>
              <h4 style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-3)" }}>
                Step-by-Step Remediation Sequence:
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {pb.steps.map((st) => (
                  <div
                    key={st.num}
                    style={{
                      padding: "var(--space-3)",
                      backgroundColor: "var(--bg-elevated)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "var(--text-body-sm)", color: "var(--text-primary)", marginBottom: 4 }}>
                      Step {st.num}: {st.action}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "var(--bg-input)",
                        padding: "var(--space-2) var(--space-3)",
                        borderRadius: "var(--radius-sm)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "var(--accent-primary)",
                      }}
                    >
                      <span style={{ overflowX: "auto" }}>{st.cmd}</span>
                      <CopyButton text={st.cmd} label="Copy command" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
