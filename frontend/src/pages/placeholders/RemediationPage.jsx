import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function RemediationPage() {
  const [activeStep, setActiveStep] = useState(2); // Step 2 in progress
  const [approvedSteps, setApprovedSteps] = useState({ 0: true, 1: true });
  const [isRunning, setIsRunning] = useState(false);

  const playbook = {
    id: "PB-2026-101",
    title: "PostgreSQL Connection Pool Recovery & Lock Mitigation",
    targetIncident: "INC-101 (Database Connection Pool Exhausted)",
    safetyLevel: "Safe — Non-Destructive",
    estimatedDowntime: "0 seconds (Online Pool Adjustment)",
    steps: [
      {
        step: 1,
        title: "Adjust PostgreSQL Buffer Pool Threshold",
        action: "ALTER SYSTEM SET max_connections = '150';",
        purpose: "Provides immediate connection headroom to relieve checkout queue timeouts.",
        status: "completed",
        type: "automated",
      },
      {
        step: 2,
        title: "Terminate Idle In-Transaction Locks",
        action: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < current_timestamp - INTERVAL '2 minutes';",
        purpose: "Clears abandoned worker transactions holding row locks on inventory_locks.",
        status: "completed",
        type: "automated",
      },
      {
        step: 3,
        title: "Apply Concurrent Composite Index to inventory_locks",
        action: "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inv_locks_sku_date ON inventory_locks (sku, locked_at);",
        purpose: "Eliminates sequential table scans during concurrent checkout inventory queries.",
        status: "pending_approval",
        type: "human_approval_required",
      },
      {
        step: 4,
        title: "Verify Circuit Breaker Auto-Recovery",
        action: "MONITOR circuit-breaker state for order-service -> db-primary (Transition: HALF_OPEN -> CLOSED)",
        purpose: "Validates healthy round-trip database queries and restores normal traffic.",
        status: "pending",
        type: "automated",
      },
    ],
  };

  const handleApproveStep = (stepIdx) => {
    setApprovedSteps((prev) => ({ ...prev, [stepIdx]: true }));
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setActiveStep(3);
    }, 1500);
  };

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Remediation Playbook Studio"
        subtitle="Synthesized mitigation runbooks with human approval gates, non-destructive safety checks, and rollback plans."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-success" style={{ gap: 4 }}>
              <ShieldCheck size={13} /> Guardrails Enforced
            </span>
            <span className="badge badge-warning">Approval Gate Active</span>
          </div>
        }
      />

      {/* Playbook Overview Header Card */}
      <div className="card" style={{ padding: "var(--space-5)", borderLeft: "4px solid var(--accent-primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
              <span className="code-font" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                {playbook.id}
              </span>
              <span className="badge badge-info">{playbook.safetyLevel}</span>
              <span className="badge badge-neutral">Downtime: {playbook.estimatedDowntime}</span>
            </div>
            <h3 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)" }}>
              {playbook.title}
            </h3>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginTop: "2px" }}>
              Target: <strong style={{ color: "var(--status-critical)" }}>{playbook.targetIncident}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button type="button" className="btn btn-secondary btn-sm">
              <RotateCcw size={14} /> Reset Runbook
            </button>
            <button type="button" className="btn btn-outline btn-sm">
              Export YAML Playbook
            </button>
          </div>
        </div>

        {/* Safety Banner */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", fontSize: "var(--text-caption)", color: "var(--text-secondary)" }}>
          <Lock size={16} color="var(--status-success)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Zero Command Execution Policy:</strong> LogPilot AI never executes commands automatically.
            Every action requires explicit human verification and is restricted to pre-validated operational runbooks.
          </span>
        </div>
      </div>

      {/* Step-by-Step Runbook Flow */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {playbook.steps.map((st, idx) => {
          const isDone = approvedSteps[idx] && idx < activeStep;
          const isCurrent = idx === activeStep;
          const isPendingApproval = st.type === "human_approval_required" && !approvedSteps[idx];

          return (
            <div
              key={st.step}
              className="card"
              style={{
                padding: "var(--space-5)",
                border: isCurrent ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                boxShadow: isCurrent ? "var(--shadow-glow-accent)" : "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: isDone ? "var(--status-success)" : isCurrent ? "var(--accent-primary)" : "var(--bg-hover)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {isDone ? "✓" : st.step}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)" }}>
                      Step {st.step}: {st.title}
                    </h4>
                    <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {st.purpose}
                    </p>
                  </div>
                </div>

                <div>
                  {isDone && <span className="badge badge-success"><CheckCircle2 size={12} /> Executed & Verified</span>}
                  {isCurrent && !isPendingApproval && <span className="badge badge-info"><Clock size={12} /> In Progress</span>}
                  {isPendingApproval && <span className="badge badge-warning"><AlertTriangle size={12} /> Human Approval Required</span>}
                  {!isDone && !isCurrent && !isPendingApproval && <span className="badge badge-neutral">Pending</span>}
                </div>
              </div>

              {/* Action Code block */}
              <div style={{ backgroundColor: "var(--bg-input)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-primary)", wordBreak: "break-all", marginBottom: "var(--space-3)" }}>
                {st.action}
              </div>

              {/* Approval Gate Action */}
              {isPendingApproval && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)", marginTop: "var(--space-2)" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Operator validation required before index creation starts.
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApproveStep(idx)}
                    disabled={isRunning}
                  >
                    {isRunning ? "Verifying & Applying..." : "Approve & Execute Step 3"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
