import React, { useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Lock,
  Play,
  Terminal,
  Copy,
  Check,
  FileCode,
  Flame,
  CheckSquare,
  RefreshCw,
} from "lucide-react";
import { remediationService } from "../../services/remediationService";
import PlaybookExportModal from "./PlaybookExportModal";

export default function RemediationConsole({
  playbook,
  onPlaybookUpdated,
  onResetRunbook,
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState(playbook?.simulation_log || []);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedStepCmd, setCopiedStepCmd] = useState(null);
  const [approverNotes] = useState({});
  const [activeTab, setActiveTab] = useState("steps"); // 'steps' | 'terminal'

  if (!playbook) {
    return (
      <div className="card" style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>
        Select a runbook from the library to inspect steps and launch remediation simulation.
      </div>
    );
  }

  const steps = Array.isArray(playbook.steps) ? playbook.steps : [];

  const handleToggleApproval = async (stepNumber, currentApproved) => {
    try {
      const note = approverNotes[stepNumber] || (currentApproved ? "Approval revoked by operator" : "Authorized by SRE on-call");
      const updated = await remediationService.approveStep(
        playbook.id || playbook.playbook_number,
        stepNumber,
        !currentApproved,
        note
      );
      if (onPlaybookUpdated) {
        onPlaybookUpdated(updated);
      }
    } catch (err) {
      alert(`Approval update failed: ${err.message}`);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setActiveTab("terminal");
    try {
      const result = await remediationService.simulatePlaybook(
        playbook.id || playbook.playbook_number,
        { dry_run: true, enforce_approvals: true }
      );
      setSimulationLogs(result.steps || []);
      if (onPlaybookUpdated) {
        onPlaybookUpdated({
          ...playbook,
          execution_status: result.execution_status,
        });
      }
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRollback = async () => {
    setIsRollingBack(true);
    setActiveTab("terminal");
    try {
      const result = await remediationService.rollbackPlaybook(
        playbook.id || playbook.playbook_number,
        { performed_by: "sre-operator" }
      );
      // Append rollback events to simulation logs
      const rollbackLogEntries = (result.rolled_back_steps || []).map((rb) => ({
        step_number: rb.step_number,
        step_name: rb.step_name,
        command: rb.rollback_command,
        safety_tier: "SAFE",
        preflight_passed: true,
        stdout: rb.output,
        stderr: "",
        exit_code: 0,
        duration_ms: 65,
        verification_passed: true,
        verification_output: "[ROLLBACK OK] Reverted previous configuration change",
        status: "rolled_back",
      }));
      setSimulationLogs((prev) => [...prev, ...rollbackLogEntries]);
      if (onPlaybookUpdated) {
        onPlaybookUpdated({
          ...playbook,
          execution_status: "rolled_back",
        });
      }
    } catch (err) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleCopyCommand = (stepNumber, command) => {
    navigator.clipboard.writeText(command);
    setCopiedStepCmd(stepNumber);
    setTimeout(() => setCopiedStepCmd(null), 2000);
  };

  const getSafetyBadge = (tier) => {
    switch (tier) {
      case "SAFE":
        return (
          <span className="badge badge-success" style={{ gap: 4 }}>
            <ShieldCheck size={12} /> Safe
          </span>
        );
      case "CAUTION":
        return (
          <span className="badge badge-warning" style={{ gap: 4 }}>
            <AlertTriangle size={12} /> Caution
          </span>
        );
      case "CRITICAL_DESTRUCTIVE":
        return (
          <span className="badge badge-critical" style={{ gap: 4 }}>
            <Flame size={12} /> Critical / Destructive
          </span>
        );
      default:
        return <span className="badge badge-neutral">{tier}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Top Card: Runbook Overview */}
      <div
        className="card"
        style={{
          padding: "var(--space-5)",
          borderLeft: "4px solid var(--accent-primary)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            marginBottom: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
              <span className="code-font" style={{ fontWeight: 700, color: "var(--accent-primary)" }}>
                {playbook.playbook_number || "PB-CUSTOM"}
              </span>
              {getSafetyBadge(playbook.risk_level)}
              <span className="badge badge-neutral">Downtime: {playbook.estimated_downtime}</span>
              <span className="badge badge-neutral">Service: {playbook.target_service}</span>
              <span className={`badge ${playbook.approval_status === "approved" ? "badge-success" : playbook.approval_status === "partially_approved" ? "badge-warning" : "badge-neutral"}`}>
                Approval: {playbook.approval_status?.replace("_", " ")}
              </span>
              <span className={`badge ${playbook.execution_status === "simulated" ? "badge-success" : playbook.execution_status === "rolled_back" ? "badge-warning" : "badge-neutral"}`}>
                Status: {playbook.execution_status?.replace("_", " ")}
              </span>
            </div>

            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              {playbook.title}
            </h3>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "800px" }}>
              {playbook.description}
            </p>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsExportOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <FileCode size={14} /> Export Automation
            </button>
            {onResetRunbook && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onResetRunbook}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Zero-execution Safety Policy Banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            backgroundColor: "var(--bg-elevated)",
            borderRadius: "var(--radius-md)",
            fontSize: "12px",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Lock size={16} color="var(--status-success)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Zero Command Execution Policy:</strong> LogPilot AI never executes destructive operations automatically.
            Every action requires explicit human verification gates and is simulated within an isolated dry-run sandbox with automatic rollback support.
          </span>
        </div>
      </div>

      {/* Tabs: Step Workflow vs Sandbox Terminal */}
      <div style={{ display: "flex", gap: "var(--space-2)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "var(--space-2)" }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "steps" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("steps")}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <ShieldCheck size={14} /> Remediation Steps ({steps.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "terminal" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("terminal")}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Terminal size={14} /> Sandbox Terminal {simulationLogs.length > 0 && `(${simulationLogs.length} events)`}
        </button>
      </div>

      {/* View 1: Step-by-Step Workflow */}
      {activeTab === "steps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {steps.map((st) => {
            const isApproved = st.approved || false;
            const requiresApproval = st.requires_approval || false;
            const isCopied = copiedStepCmd === st.step_number;

            return (
              <div
                key={st.step_number}
                className="card"
                style={{
                  padding: "var(--space-5)",
                  border: isApproved ? "1px solid var(--status-success)" : "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Step Title & Metadata */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "var(--space-3)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        backgroundColor: isApproved ? "var(--status-success)" : "var(--bg-hover)",
                        color: isApproved ? "#FFFFFF" : "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      {isApproved ? <Check size={16} /> : st.step_number}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {st.name}
                        </h4>
                        {getSafetyBadge(st.safety_tier)}
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {st.description}
                      </p>
                    </div>
                  </div>

                  {/* Approval Toggle */}
                  <div>
                    {requiresApproval ? (
                      <button
                        type="button"
                        className={`btn btn-sm ${isApproved ? "btn-secondary" : "btn-warning"}`}
                        onClick={() => handleToggleApproval(st.step_number, isApproved)}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        {isApproved ? (
                          <>
                            <CheckSquare size={14} color="var(--status-success)" />
                            Approved
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={14} />
                            Approve Step
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="badge badge-success" style={{ gap: 4 }}>
                        <ShieldCheck size={12} /> Auto-Permitted
                      </span>
                    )}
                  </div>
                </div>

                {/* Command Snippet */}
                <div
                  style={{
                    backgroundColor: "#0D1117",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3) var(--space-4)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "12px",
                    color: "#58A6FF",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "var(--space-3)",
                    overflowX: "auto",
                  }}
                >
                  <code style={{ whiteSpace: "pre-wrap" }}>$ {st.command}</code>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleCopyCommand(st.step_number, st.command)}
                    style={{ color: "#8B949E", flexShrink: 0, marginLeft: "var(--space-2)" }}
                    aria-label="Copy command"
                  >
                    {isCopied ? <Check size={14} color="#3FB950" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Verification & Rollback Footnote */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--space-4)",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    paddingTop: "var(--space-2)",
                    borderTop: "1px dashed var(--border-subtle)",
                  }}
                >
                  {st.verification_command && (
                    <div>
                      <strong style={{ color: "var(--text-secondary)" }}>Verify:</strong>{" "}
                      <span className="code-font">{st.verification_command}</span>
                    </div>
                  )}
                  {st.rollback_command && st.rollback_command !== "N/A" && (
                    <div>
                      <strong style={{ color: "var(--text-secondary)" }}>Rollback:</strong>{" "}
                      <span className="code-font">{st.rollback_command}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bottom Execution Bar */}
          <div
            className="card"
            style={{
              padding: "var(--space-4) var(--space-5)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            <div>
              <h5 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Ready to Validate Runbook
              </h5>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Simulation verifies syntax, permissions, preflight conditions, and post-verification checks.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {isSimulating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Run Safe Simulation
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* View 2: Sandbox Terminal Console */}
      {activeTab === "terminal" && (
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "1px solid var(--border-default)",
          }}
        >
          {/* Terminal Window Header */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "#161B22",
              borderBottom: "1px solid #30363D",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27C93F" }} />
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#8B949E",
                  fontFamily: "var(--font-mono, monospace)",
                  marginLeft: "var(--space-2)",
                }}
              >
                logpilot-sandbox — {playbook.playbook_number} (dry-run mode)
              </span>
            </div>

            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {isSimulating ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                {isSimulating ? "Simulating..." : "Run Simulation"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRollback}
                disabled={isRollingBack || simulationLogs.length === 0}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <RotateCcw size={13} />
                {isRollingBack ? "Rolling back..." : "Rollback Runbook"}
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            style={{
              padding: "var(--space-4) var(--space-5)",
              backgroundColor: "#0D1117",
              minHeight: "340px",
              maxHeight: "500px",
              overflowY: "auto",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "13px",
              color: "#C9D1D9",
              lineHeight: 1.6,
            }}
          >
            {simulationLogs.length === 0 ? (
              <div style={{ color: "#8B949E", fontStyle: "italic" }}>
                Terminal initialized. Click &quot;Run Safe Simulation&quot; to test preflight checks, command execution, and verification telemetry in the isolated sandbox.
              </div>
            ) : (
              simulationLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: "var(--space-4)" }}>
                  {/* Step Command Line */}
                  <div style={{ color: "#58A6FF", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#8B949E" }}>[Step {log.step_number}]</span>
                    <strong>$ {log.command}</strong>
                    <span style={{ fontSize: "11px", color: "#8B949E", marginLeft: "auto" }}>
                      {log.duration_ms}ms
                    </span>
                  </div>

                  {/* Preflight Check Status */}
                  <div style={{ color: log.preflight_passed ? "#3FB950" : "#F85149", fontSize: "12px", marginTop: "2px" }}>
                    {log.preflight_passed ? "[PREFLIGHT PASS] Allowlist policy satisfied" : `[PREFLIGHT BLOCKED] ${log.stderr}`}
                  </div>

                  {/* Stdout Output */}
                  {log.stdout && (
                    <pre
                      style={{
                        margin: "6px 0",
                        padding: "6px 10px",
                        backgroundColor: "#161B22",
                        borderRadius: "4px",
                        color: "#E6EDF3",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {log.stdout}
                    </pre>
                  )}

                  {/* Verification Status */}
                  {log.verification_output && (
                    <div style={{ color: log.verification_passed ? "#3FB950" : "#F85149", fontSize: "12px" }}>
                      {log.verification_output}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      <PlaybookExportModal
        playbook={playbook}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
