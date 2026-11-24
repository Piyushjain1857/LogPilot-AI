import React, { useState } from "react";
import SeverityBadge from "../common/SeverityBadge";
import {
  Activity,
  Database,
  Code,
  ShieldCheck,
  Copy,
  Check,
  Wrench,
  Bot,
  FileText,
} from "lucide-react";

export default function TroubleshootingReport({ report }) {
  const [activePerspective, setActivePerspective] = useState("sre");
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!report) return null;

  const handleCopyCommand = (cmd, idx) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const perspectives = report.perspectives || {};

  const perspectiveTabs = [
    { key: "sre", label: "SRE & Reliability", icon: Activity, data: perspectives.sre },
    { key: "database_infra", label: "Database & Infra", icon: Database, data: perspectives.database_infra },
    { key: "application", label: "Application Logic", icon: Code, data: perspectives.application },
    { key: "security", label: "Security & Access", icon: ShieldCheck, data: perspectives.security },
  ];

  const currentPerspective = perspectives[activePerspective] || perspectives.sre;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Executive Summary Card */}
      <div
        className="card"
        style={{
          padding: "20px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          backgroundColor: "color-mix(in srgb, var(--accent-primary) 5%, var(--bg-card))",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-primary)",
              }}
            >
              <Bot size={16} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                AI Diagnostic Synthesis
              </span>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                Executive Diagnostic Assessment
              </h3>
            </div>
          </div>

          <span
            className="code-font"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "var(--severity-success)",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            {report.model_used}
          </span>
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.6, margin: "0 0 10px 0" }}>
          {report.executive_summary}
        </p>

        {report.root_cause_analysis && (
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
            {report.root_cause_analysis}
          </p>
        )}
      </div>

      {/* 4-Perspective Investigation Panel */}
      <div className="card" style={{ padding: "16px" }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
          Multi-Perspective Diagnostic Breakdown
        </h4>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          {perspectiveTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePerspective === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`btn btn-sm ${isActive ? "btn-primary" : "btn-outline"}`}
                onClick={() => setActivePerspective(tab.key)}
                style={{ gap: "6px", fontSize: "12px" }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {currentPerspective && (
          <div style={{ backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "14px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                {currentPerspective.title}
              </span>
              <SeverityBadge severity={currentPerspective.severity || "INFO"} />
            </div>

            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 10px 0", lineHeight: 1.5 }}>
              {currentPerspective.summary}
            </p>

            {currentPerspective.findings && currentPerspective.findings.length > 0 && (
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Key Diagnostic Findings:
                </span>
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px", fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.6 }}>
                  {currentPerspective.findings.map((finding, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step-by-Step Actionable Remediation Plan */}
      <div className="card" style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Wrench size={16} color="var(--severity-success)" />
          <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
            Actionable Remediation Playbook
          </h4>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {(report.remediation_steps || []).map((step, idx) => (
            <div
              key={step.step_number || idx}
              style={{
                padding: "14px",
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "var(--severity-success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {step.step_number}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {step.action}
                </span>
              </div>

              {/* Command box with copy */}
              {step.command && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "var(--bg-card)",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-subtle)",
                    margin: "8px 0",
                  }}
                >
                  <code className="code-font" style={{ fontSize: "11px", color: "var(--text-primary)", wordBreak: "break-all" }}>
                    {step.command}
                  </code>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleCopyCommand(step.command, idx)}
                    style={{ padding: "2px 6px", fontSize: "10px", gap: "3px", flexShrink: 0 }}
                  >
                    {copiedIndex === idx ? <Check size={11} color="var(--severity-success)" /> : <Copy size={11} />}
                    {copiedIndex === idx ? "Copied" : "Copy"}
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px", fontSize: "11px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Verification: </span>
                  <span style={{ color: "var(--text-primary)" }}>{step.verification}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Rollback: </span>
                  <span style={{ color: "var(--text-primary)" }}>{step.rollback_plan}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Evidence Citations */}
      {report.evidence_citations && report.evidence_citations.length > 0 && (
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <FileText size={16} color="var(--accent-primary)" />
            <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
              Verified Grounded Evidence Citations ({report.evidence_citations.length})
            </h4>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {report.evidence_citations.map((c, i) => (
              <div
                key={c.log_id || i}
                style={{
                  padding: "10px 12px",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <SeverityBadge severity={c.severity} />
                  <span style={{ color: "var(--text-muted)" }}>{c.timestamp}</span>
                  <span style={{ fontWeight: 700, color: "var(--accent-primary)" }}>{c.service}</span>
                  {c.trace_id && <span style={{ color: "var(--text-muted)" }}>[{c.trace_id}]</span>}
                </div>
                <div style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {c.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
