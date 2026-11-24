import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Terminal,
  ArrowRight,
  Cpu,
  FileCode,
  Activity,
  Workflow,
  Sparkles,
  UploadCloud,
  Lock,
  GitBranch,
  Bot,
} from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import ThemeToggle from "../components/common/ThemeToggle";

export default function LandingPage() {
  const [activePreviewTab, setActivePreviewTab] = useState("ingest");

  const previewTabs = [
    { id: "ingest", label: "01. Log Ingestion & Redaction", badge: "Live in Phase 3" },
    { id: "detect", label: "02. Anomaly Detection", badge: "Rolling z-Score" },
    { id: "correlate", label: "03. Root Cause Topology", badge: "Trace Correlation" },
    { id: "diagnose", label: "04. AI Diagnostic Studio", badge: "Gemini Core" },
    { id: "remediate", label: "05. Remediation Playbooks", badge: "Human Guardrails" },
  ];

  const capabilities = [
    {
      title: "Multi-Format Log Ingestion",
      description: "High-throughput streaming parsers for .log, .txt multiline traces, .csv with column auto-mapping, .json, and .jsonl.",
      icon: UploadCloud,
      status: "Implemented (Phase 3)",
      active: true,
    },
    {
      title: "Automated Secret Redaction",
      description: "Zero-credential exposure regex pipeline masking Bearer tokens, JWTs, API keys, passwords, and private keys prior to persistence.",
      icon: Lock,
      status: "Implemented (Phase 3)",
      active: true,
    },
    {
      title: "Intelligent Anomaly Detection",
      description: "Moving-window rolling z-score burst detection and log frequency shifts isolating signal from noise.",
      icon: Activity,
      status: "Phase 4 Ready",
      active: false,
    },
    {
      title: "Cross-Service Trace Correlation",
      description: "Distributed trace correlation and microservice dependency graph analysis pinpointing root causes.",
      icon: GitBranch,
      status: "Phase 4 Ready",
      active: false,
    },
    {
      title: "AI Troubleshooter Agent",
      description: "Gemini AI multimodal agent synthesizing stack traces, environment changes, and historical runbooks in a read-only sandbox.",
      icon: Bot,
      status: "Phase 4 Ready",
      active: false,
    },
    {
      title: "Remediation Playbooks",
      description: "Automated runbook synthesis with human-in-the-loop approvals, non-destructive safety checks, and rollback plans.",
      icon: FileCode,
      status: "Phase 4 Ready",
      active: false,
    },
  ];

  const workflowSteps = [
    { step: "01", name: "Ingest", desc: "Multi-format files (.log, .csv, .json, .jsonl) with cryptographic SHA-256 deduplication and secret redaction" },
    { step: "02", name: "Detect", desc: "Filter background noise and isolate abnormal frequency bursts with rolling z-score bounds" },
    { step: "03", name: "Correlate", desc: "Map distributed trace IDs across microservice dependencies within time windows" },
    { step: "04", name: "Diagnose", desc: "Synthesize root cause hypotheses with supporting line-by-line trace evidence citations" },
    { step: "05", name: "Remediate", desc: "Generate human-in-the-loop remediation playbooks and automated rollback verification" },
  ];

  return (
    <div style={{ backgroundColor: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "var(--space-3) var(--space-8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "var(--bg-header)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div className="sidebar-logo-icon">
            <Terminal size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>
            LogPilot AI
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>|</span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Detect. Diagnose. Resolve.
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <a href="#features" style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
            Capabilities
          </a>
          <a href="#workflow" style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
            How It Works
          </a>
          <Link to="/app/log-sources" style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
            Log Ingestion
          </Link>
          <Link to="/app/troubleshooter" style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
            AI Troubleshooter
          </Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <ThemeToggle />
          <Link to="/app">
            <Button variant="primary" size="sm" icon={ArrowRight}>
              Launch Workspace
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero" style={{ padding: "var(--space-12) var(--space-6) var(--space-8)", textAlign: "center" }}>
        <div className="landing-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "var(--accent-primary-alpha)", color: "var(--accent-primary)", border: "1px solid var(--accent-primary)", borderRadius: "var(--radius-full)", padding: "4px 14px", fontSize: "12px", fontWeight: 600, marginBottom: "var(--space-4)" }}>
          <Sparkles size={14} />
          <span>Tech Fusion 4.0 — Hackathon Problem Statement PS-01A</span>
        </div>
        <h1 className="landing-title" style={{ fontSize: "clamp(2.4rem, 5vw, 3.8rem)", fontWeight: 800, lineHeight: 1.15, color: "var(--text-primary)", marginBottom: "var(--space-4)" }}>
          From High-Volume Logs to <br />
          <span className="landing-title-accent" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Autonomous Root Cause Resolution.
          </span>
        </h1>
        <p className="landing-tagline" style={{ maxWidth: 720, margin: "0 auto var(--space-6)", fontSize: "16px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          LogPilot AI ingests distributed system logs, redacts sensitive secrets in real time, isolates anomaly bursts with z-score bounds, correlates traces across microservices, and synthesizes actionable remediation runbooks.
        </p>

        <div className="landing-actions" style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)", marginBottom: "var(--space-10)" }}>
          <Link to="/app">
            <Button variant="primary" size="lg" icon={ArrowRight}>
              Open Observability Console
            </Button>
          </Link>
          <Link to="/app/log-sources">
            <Button variant="secondary" size="lg" icon={UploadCloud}>
              Upload Log Files
            </Button>
          </Link>
        </div>

        {/* Interactive Feature Demo Container */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-dropdown)",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          {/* Top Browser Header Bar */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "#EF4444", display: "inline-block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "#F59E0B", display: "inline-block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "#22C55E", display: "inline-block" }} />
              <span className="code-font" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                logpilot-ai / telemetry-pipeline (Interactive Console)
              </span>
            </div>
            <span className="badge badge-success">Production Ready</span>
          </div>

          {/* Interactive Feature Tabs */}
          <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-header)" }}>
            {previewTabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setActivePreviewTab(tb.id)}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: activePreviewTab === tb.id ? "var(--accent-primary)" : "var(--text-muted)",
                  borderBottom: activePreviewTab === tb.id ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  backgroundColor: activePreviewTab === tb.id ? "var(--bg-surface)" : "transparent",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{tb.label}</span>
                <span className="badge badge-neutral" style={{ fontSize: "10px" }}>{tb.badge}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div style={{ padding: "var(--space-6)" }}>
            {activePreviewTab === "ingest" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: 4 }}>REAL-TIME INLINE REDACTION</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Multi-Format Parsing with Secret & Credential Masking
                    </h3>
                  </div>
                  <Badge variant="primary">SHA-256 Verified</Badge>
                </div>
                <div style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
                  <div style={{ color: "var(--severity-error)", marginBottom: 4 }}>
                    2026-11-24T10:00:11.890Z [ERROR] [auth-service] Failed authentication token=<span className="redacted-badge">[REDACTED_BEARER_TOKEN]</span> api_key=<span className="redacted-badge">[REDACTED_API_KEY]</span>
                  </div>
                  <div style={{ color: "var(--severity-critical)" }}>
                    2026-11-24T10:00:12.311Z [CRITICAL] [order-service] DatabaseConnectionError: connection pool exhausted (max=100) uri=<span className="redacted-badge">[REDACTED_DB_URL]</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>Supported: <strong>.log</strong>, <strong>.txt</strong>, <strong>.csv</strong>, <strong>.json</strong>, <strong>.jsonl</strong></span>
                  <span>•</span>
                  <span>Throughput: <strong>18,000+ logs/sec</strong></span>
                  <span>•</span>
                  <span>Size limit: <strong>25 MB / file</strong></span>
                </div>
              </div>
            )}

            {activePreviewTab === "detect" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-error" style={{ marginBottom: 4 }}>STATISTICAL ANOMALY BURST</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Rolling z-Score Anomaly Isolation on order-service
                    </h3>
                  </div>
                  <span className="badge badge-error">z = 4.82σ</span>
                </div>
                <div style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                  <div>Baseline Frequency: 1.2 errors/min → Observed Spike: <strong>88 errors/min (+7,233%)</strong></div>
                  <div style={{ color: "var(--status-error)", marginTop: 4 }}>[ANOMALY] Database connection pool checkout timeout after 5000ms</div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>Sliding Window: <strong>60 seconds</strong></span>
                  <span>•</span>
                  <span>Detection Latency: <strong>420ms</strong></span>
                </div>
              </div>
            )}

            {activePreviewTab === "correlate" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-warning" style={{ marginBottom: 4 }}>CAUSAL PROPAGATION</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Distributed Trace Waterfall & Topology Map
                    </h3>
                  </div>
                  <span className="badge badge-neutral">Trace: b223-1109-ee74</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", padding: "var(--space-4)", backgroundColor: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", marginBottom: "var(--space-4)" }}>
                  <div style={{ textAlign: "center", padding: "8px 14px", backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Edge</div>
                    <div style={{ fontWeight: 600 }}>api-gateway</div>
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>HTTP 504</span>
                  </div>
                  <span>→</span>
                  <div style={{ textAlign: "center", padding: "8px 14px", backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Worker</div>
                    <div style={{ fontWeight: 600 }}>order-service</div>
                    <span className="badge badge-error" style={{ fontSize: 10 }}>Timeout</span>
                  </div>
                  <span>→</span>
                  <div style={{ textAlign: "center", padding: "8px 14px", backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "2px solid var(--status-critical)" }}>
                    <div style={{ fontSize: 10, color: "var(--status-critical)", fontWeight: 800 }}>ROOT CAUSE</div>
                    <div style={{ fontWeight: 700 }}>db-primary:5432</div>
                    <span className="badge badge-error" style={{ fontSize: 10, backgroundColor: "var(--status-critical)" }}>Pool Saturated</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === "diagnose" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: 4 }}>GEMINI DIAGNOSTIC STUDIO</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      AI Agent Causal Reasoning & Hypothesis Synthesis
                    </h3>
                  </div>
                  <span className="badge badge-success">96% High Confidence</span>
                </div>
                <div style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: "var(--space-4)" }}>
                  <strong>Root Cause Hypothesis:</strong> Unindexed table locks on <code>inventory_locks</code> during concurrent holiday traffic held PostgreSQL connections open for &gt;5000ms, saturating the max_connections limit (100/100) and cascading upstream timeouts.
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Zero Command Execution Sandbox Guarantee</span>
                  <Link to="/app/troubleshooter">
                    <button type="button" className="btn btn-primary btn-xs">
                      Try Interactive Diagnostic Studio →
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {activePreviewTab === "remediate" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: 4 }}>HUMAN-IN-THE-LOOP APPROVAL</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Synthesized Mitigation Runbook (Non-Destructive)
                    </h3>
                  </div>
                  <Badge variant="success">Safe Rollback Plan</Badge>
                </div>
                <ol style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-primary)", marginBottom: "var(--space-4)" }}>
                  <li>Step 1: Increase PostgreSQL max_connections pool buffer from 100 to 150.</li>
                  <li>Step 2: Terminate idle in-transaction locks exceeding 2 minutes.</li>
                  <li>Step 3: Apply missing composite index on inventory_locks(sku, locked_at).</li>
                </ol>
                <Link to="/app/remediation">
                  <button type="button" className="btn btn-secondary btn-xs">
                    Inspect Full Runbook Runner →
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Visual Workflow Section */}
      <section id="workflow" className="landing-section" style={{ borderTop: "1px solid var(--border-subtle)", padding: "var(--space-12) var(--space-8)" }}>
        <div className="landing-section-header" style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <Badge variant="primary" icon={Workflow}>Autonomous Lifecycle</Badge>
          <h2 className="landing-section-title" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: 8 }}>
            How LogPilot AI Operates
          </h2>
          <p className="landing-section-subtitle" style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: 4 }}>
            An end-to-end AIOps pipeline bridging statistical pattern mining with AI diagnostic agents
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-4)", maxWidth: 1200, margin: "0 auto" }}>
          {workflowSteps.map((st) => (
            <div key={st.step} className="card" style={{ padding: "var(--space-5)" }}>
              <div className="code-font" style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-primary)", marginBottom: 4 }}>
                {st.step}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                {st.name}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities Grid */}
      <section id="features" className="landing-section" style={{ borderTop: "1px solid var(--border-subtle)", padding: "var(--space-12) var(--space-8)", backgroundColor: "var(--bg-elevated)" }}>
        <div className="landing-section-header" style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <Badge variant="default" icon={Cpu}>Platform Capabilities</Badge>
          <h2 className="landing-section-title" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: 8 }}>
            Engineered for Modern Observability
          </h2>
          <p className="landing-section-subtitle" style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: 4 }}>
            Zero Tailwind, Zero Bootstrap — Pure semantic CSS architecture designed for low latency.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)", maxWidth: 1200, margin: "0 auto" }}>
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="card" style={{ padding: "var(--space-5)", borderTop: cap.active ? "3px solid var(--status-success)" : "3px solid var(--accent-primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-primary-alpha)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)" }}>
                    <Icon size={18} />
                  </div>
                  <span className={`badge ${cap.active ? "badge-success" : "badge-neutral"}`}>
                    {cap.status}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  {cap.title}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "var(--space-6) var(--space-8)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)", backgroundColor: "var(--bg-header)", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <strong>LogPilot AI</strong> — Enterprise Observability & Autonomous Debugging. Tech Fusion 4.0 (Codestorm).
        </div>
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <Link to="/app" style={{ color: "var(--text-secondary)" }}>Console</Link>
          <Link to="/app/log-sources" style={{ color: "var(--text-secondary)" }}>Log Sources</Link>
          <Link to="/app/log-explorer" style={{ color: "var(--text-secondary)" }}>Log Explorer</Link>
          <Link to="/app/troubleshooter" style={{ color: "var(--text-secondary)" }}>AI Studio</Link>
        </div>
      </footer>
    </div>
  );
}
