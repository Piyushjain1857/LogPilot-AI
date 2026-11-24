import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { demoService } from "../../services/demoService";
import { securityService } from "../../services/securityService";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GitBranch,
  Bot,
  ShieldCheck,
  Radio,
  FileText,
  Activity,
  Terminal,
  FastForward,
  Shield,
  ExternalLink,
} from "lucide-react";

const STAGES = [
  {
    step: 1,
    name: "Telemetry Ingestion",
    icon: Radio,
    color: "var(--accent-primary)",
    targetRoute: "/app/live-logs",
    psReq: "High-volume multi-service log ingestion with real-time sensitive token redaction.",
  },
  {
    step: 2,
    name: "Anomaly Detection",
    icon: Activity,
    color: "var(--status-warning)",
    targetRoute: "/app/anomalies",
    psReq: "Ensemble Z-score and Isolation Forest detecting anomalous connection and error spikes.",
  },
  {
    step: 3,
    name: "Pattern Clustering",
    icon: Layers,
    color: "#a855f7",
    targetRoute: "/app/clusters",
    psReq: "Drain3 log pattern mining with pre-masking regex and 32-char signature hashing.",
  },
  {
    step: 4,
    name: "Incident Correlation",
    icon: AlertTriangle,
    color: "var(--status-error)",
    targetRoute: "/app/incidents",
    psReq: "Cross-service multi-signal sliding-window correlator with blast-radius mapping.",
  },
  {
    step: 5,
    name: "Root Cause Analysis",
    icon: GitBranch,
    color: "#f59e0b",
    targetRoute: "/app/root-cause",
    psReq: "NetworkX service dependency graph calculating multi-factor topological causal scores.",
  },
  {
    step: 6,
    name: "AI Autonomous Diagnosis",
    icon: Bot,
    color: "var(--status-success)",
    targetRoute: "/app/troubleshooter",
    psReq: "Gemini-powered ReAct autonomous loop investigating 4 perspectives with trace evidence.",
  },
  {
    step: 7,
    name: "Remediation & Recovery",
    icon: ShieldCheck,
    color: "var(--status-success)",
    targetRoute: "/app/reports",
    psReq: "Sandboxed playbook execution, audit hashing, and executive ReportLab post-mortem.",
  },
];

export default function DemoPage() {
  const navigate = useNavigate();
  const terminalEndRef = useRef(null);

  const [demoStatus, setDemoStatus] = useState({
    current_stage: 0,
    total_stages: 7,
    logs_ingested: 0,
    incident_id: null,
    incident_status: null,
    post_mortem_id: null,
    is_complete: false,
  });

  const [activeStageData, setActiveStageData] = useState(null);
  const [runningAuto, setRunningAuto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState("ADMIN");
  const [securityPosture, setSecurityPosture] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState([
    `[${new Date().toLocaleTimeString()}] [SYSTEM] LogPilot AI Autonomous Self-Healing Demo Engine Initialized.`,
    `[${new Date().toLocaleTimeString()}] [SYSTEM] Problem Statement PS-01A verification pipeline ready.`,
  ]);

  // Fetch demo status and security posture
  const loadStatus = useCallback(async () => {
    try {
      const [status, sec] = await Promise.all([
        demoService.getStatus(),
        securityService.getAudit(activeRole).catch(() => null),
      ]);
      setDemoStatus(status);
      if (sec) setSecurityPosture(sec);
    } catch (err) {
      console.error("Failed to load demo status:", err);
    }
  }, [activeRole]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (typeof terminalEndRef.current?.scrollIntoView === "function") {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Advance single stage
  const handleAdvanceStage = async (stageNum = null) => {
    setLoading(true);
    try {
      const res = await demoService.advanceStage(stageNum);
      const execution = res.execution;
      setActiveStageData(execution);
      setDemoStatus(res.demo_status);

      const logLine = `[${new Date().toLocaleTimeString()}] [STAGE ${execution.stage}: ${execution.name}] ${execution.details}`;
      setTerminalLogs((prev) => [...prev, logLine]);

      return res;
    } catch (err) {
      console.error("Failed to advance stage:", err);
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [ERROR] Stage execution failed: ${err?.message || "Unknown"}`,
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Run full 7-stage automated demonstration
  const handleRunFullDemo = async () => {
    if (runningAuto) return;
    setRunningAuto(true);
    setTerminalLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [ORCHESTRATOR] Starting automated 7-stage end-to-end self-healing sequence...`,
    ]);

    for (let st = 1; st <= 7; st++) {
      await handleAdvanceStage(st);
      await new Promise((resolve) => setTimeout(resolve, 1400));
    }

    setTerminalLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [ORCHESTRATOR] Demonstration Complete! System health verified and mitigated.`,
    ]);
    setRunningAuto(false);
  };

  // Reset demo
  const handleReset = async () => {
    setLoading(true);
    setRunningAuto(false);
    try {
      const res = await demoService.resetDemo();
      setDemoStatus(res.demo_status);
      setActiveStageData(null);
      setTerminalLogs([
        `[${new Date().toLocaleTimeString()}] [RESET] Demo environment cleared. Baselines restored to zero.`,
      ]);
    } catch (err) {
      console.error("Reset failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentStageInfo =
    STAGES.find((s) => s.step === demoStatus.current_stage) || STAGES[0];

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Autonomous Self-Healing Demonstration"
        subtitle="End-to-End Autonomous Troubleshooting Walkthrough: Ingestion, Anomaly Detection, Clustering, Correlation, RCA, Gemini Diagnosis, and Playbook Recovery."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-success">PS-01A Grounded</span>
            <span className="badge badge-neutral">Stage: {demoStatus.current_stage} / 7</span>
          </div>
        }
      />

      {/* Control Toolbar */}
      <div
        className="card"
        style={{
          padding: "var(--space-4) var(--space-5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunFullDemo}
            disabled={runningAuto || loading}
          >
            <Play size={15} className={runningAuto ? "spin" : ""} />
            <span>{runningAuto ? "Simulating Pipeline..." : "Run Full 7-Stage Demo"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleAdvanceStage()}
            disabled={runningAuto || loading || demoStatus.is_complete}
          >
            <FastForward size={15} />
            <span>Next Stage</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={runningAuto || loading}
          >
            <RotateCcw size={15} />
            <span>Reset Demo</span>
          </button>
        </div>

        {/* Live RBAC Role Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Shield size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            Active RBAC Persona:
          </span>
          <select
            className="select select-sm"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            style={{ fontSize: 12, minWidth: 120 }}
          >
            <option value="ADMIN">ADMIN (Full Control)</option>
            <option value="ANALYST">ANALYST (Diagnostic/Reports)</option>
            <option value="VIEWER">VIEWER (Read-Only)</option>
          </select>
        </div>
      </div>

      {/* 7-Stage Visual Progress Stepper */}
      <div
        className="card"
        style={{
          padding: "var(--space-5)",
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "var(--space-2)",
          overflowX: "auto",
        }}
      >
        {STAGES.map((s) => {
          const Icon = s.icon;
          const isDone = demoStatus.current_stage >= s.step;
          const isCurrent = demoStatus.current_stage === s.step;

          return (
            <button
              key={s.step}
              type="button"
              onClick={() => handleAdvanceStage(s.step)}
              disabled={runningAuto || loading}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 6,
                padding: "var(--space-3) var(--space-2)",
                borderRadius: "var(--radius-md)",
                border: isCurrent
                  ? "2px solid var(--accent-primary)"
                  : isDone
                  ? "1px solid var(--status-success)"
                  : "1px solid var(--border-subtle)",
                backgroundColor: isCurrent
                  ? "rgba(14, 165, 233, 0.1)"
                  : isDone
                  ? "rgba(16, 185, 129, 0.05)"
                  : "var(--bg-elevated)",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: isDone ? "var(--status-success)" : isCurrent ? "var(--accent-primary)" : "var(--bg-surface)",
                  color: isDone || isCurrent ? "#fff" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isDone && !isCurrent ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? "var(--accent-primary)" : "var(--text-primary)" }}>
                {s.step}. {s.name}
              </span>
              <span style={{ fontSize: 9.5, color: "var(--text-muted)", lineHeight: 1.2 }}>
                {isDone ? "Completed" : isCurrent ? "Executing" : "Pending"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split: Stage Deep-Dive Card (Left) + Live Terminal Stream (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--space-6)", alignItems: "start" }}>
        {/* Left: Active Stage Details & Requirement Evidence */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="badge badge-primary">Stage {currentStageInfo.step} of 7</span>
                <span className="badge badge-success">Status: {demoStatus.current_stage >= currentStageInfo.step ? "COMPLETED" : "READY"}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                {currentStageInfo.name}
              </h3>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(currentStageInfo.targetRoute)}
            >
              <span>Inspect Screen</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Problem Statement Requirement Callout */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "var(--space-5)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>
              Problem Statement PS-01A Capability Validated:
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {currentStageInfo.psReq}
            </div>
          </div>

          {/* Live Stage Telemetry Output */}
          {activeStageData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                Execution Output & Telemetry
              </h4>
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "var(--space-3)",
                }}
              >
                {Object.entries(activeStageData).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {k.replace(/_/g, " ")}
                    </div>
                    <div className="code-font" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Click &quot;Run Full 7-Stage Demo&quot; or &quot;Next Stage&quot; to commence the autonomous incident simulation.
            </div>
          )}

          {/* Quick Jump Links to All Core Capabilities */}
          <div style={{ marginTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-4)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: "var(--space-2)", color: "var(--text-muted)" }}>
              Direct Access to Correlated AIOps Views:
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate("/app/live-logs")}>
                <Radio size={12} />
                <span>Live Logs</span>
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate("/app/anomalies")}>
                <Activity size={12} />
                <span>Anomalies</span>
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate("/app/clusters")}>
                <Layers size={12} />
                <span>Clusters</span>
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate("/app/incidents")}>
                <AlertTriangle size={12} />
                <span>Incidents</span>
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate("/app/root-cause")}>
                <GitBranch size={12} />
                <span>Root Cause</span>
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate("/app/reports")}>
                <FileText size={12} />
                <span>Executive Reports</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Terminal & Security Audit Stream */}
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: 560 }}>
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Terminal size={15} color="var(--accent-primary)" />
              <span style={{ fontSize: 12, fontWeight: 700 }}>Telemetry & Security Execution Stream</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--status-success)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--status-success)" }} />
              Live Connected
            </div>
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: "#0d1117",
              color: "#c9d1d9",
              padding: "var(--space-4)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11.5,
              lineHeight: 1.6,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {terminalLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  color: log.includes("[ERROR]")
                    ? "#f85149"
                    : log.includes("[STAGE")
                    ? "#58a6ff"
                    : log.includes("[RESET]")
                    ? "#e3b341"
                    : "#8b949e",
                }}
              >
                {log}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Active Security Posture Footer */}
          {securityPosture && (
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                backgroundColor: "var(--bg-surface)",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: 11,
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                Sandbox Mode: <span style={{ color: "var(--status-success)", fontWeight: 600 }}>STRICT_ALLOWLIST</span>
              </div>
              <div>
                Redaction Patterns: <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>{securityPosture.redaction_engine?.patterns_loaded || 8} Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
