import React from "react";
import { Link } from "react-router-dom";
import {
  Terminal,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Layers,
  Search,
  Clock,
  Radio,
  FileCode,
  Activity,
  CheckCircle2,
  Workflow,
  Sparkles,
} from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import ThemeToggle from "../components/common/ThemeToggle";

export default function LandingPage() {
  const capabilities = [
    {
      title: "Real-Time Log Monitoring",
      description: "Low-latency streaming ingestion and WebSocket broadcasting across distributed nodes.",
      icon: Radio,
      status: "Planned (Phase 3)",
    },
    {
      title: "Intelligent Anomaly Detection",
      description: "Moving-window rolling z-score burst detection and log frequency shifts.",
      icon: Activity,
      status: "Planned (Phase 3)",
    },
    {
      title: "Automated Error Clustering",
      description: "Drain3 online template extraction grouping high-volume variable error lines into semantic clusters.",
      icon: Search,
      status: "Planned (Phase 3)",
    },
    {
      title: "Evidence-Backed Root Cause Analysis",
      description: "Distributed trace correlation and microservice dependency graph analysis pinpointing root causes.",
      icon: Cpu,
      status: "Planned (Phase 4)",
    },
    {
      title: "AI-Powered Troubleshooting",
      description: "Gemini AI multimodal agent synthesizing stack traces, environment changes, and historical runbooks.",
      icon: ShieldAlert,
      status: "Planned (Phase 4)",
    },
    {
      title: "Remediation Playbooks",
      description: "Automated runbook synthesis with human-in-the-loop approvals and safe execution guards.",
      icon: FileCode,
      status: "Planned (Phase 4)",
    },
  ];

  const workflowSteps = [
    { step: "01", name: "Ingest", desc: "Collect logs via REST API, files, or streams with sensitive-data redaction" },
    { step: "02", name: "Detect", desc: "Filter background noise and isolate abnormal frequency bursts with z-score bounds" },
    { step: "03", name: "Correlate", desc: "Map distributed trace IDs across microservice dependencies within time windows" },
    { step: "04", name: "Diagnose", desc: "Synthesize root cause hypotheses with supporting line-by-line trace evidence" },
    { step: "05", name: "Recommend", desc: "Generate human-in-the-loop remediation playbooks and rollback plans" },
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
          backdropFilter: "blur(8px)",
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
            Features
          </a>
          <a href="#workflow" style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
            How It Works
          </a>
          <a href="#architecture" style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
            Architecture
          </a>
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
      <section className="landing-hero">
        <div className="landing-badge">
          <Sparkles size={14} />
          <span>AIOps & Autonomous Debugging Platform</span>
        </div>
        <h1 className="landing-title">
          From System Logs to <br />
          <span className="landing-title-accent">Intelligent Solutions.</span>
        </h1>
        <p className="landing-tagline">
          LogPilot AI is an intelligent observability and troubleshooting platform designed to
          transform complex system logs into actionable diagnostics and remediation recommendations.
        </p>
        <div className="landing-actions">
          <Link to="/app">
            <Button variant="primary" size="lg" icon={ArrowRight}>
              Launch Workspace
            </Button>
          </Link>
          <a href="#features">
            <Button variant="secondary" size="lg">
              Explore Capabilities
            </Button>
          </a>
        </div>

        {/* Product Preview Card */}
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-dropdown)",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
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
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#EF4444" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22C55E" }} />
              <span className="code-font" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                logpilot-console / incident-triager (Live Preview)
              </span>
            </div>
            <Badge variant="success">Phase 2 Design System</Badge>
          </div>

          <div style={{ padding: "var(--space-6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <div>
                <span className="badge badge-error" style={{ marginBottom: 4 }}>CRITICAL INCIDENT #INC-402</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  Database Connection Pool Exhaustion Cascading to Checkout
                </h3>
              </div>
              <Badge variant="default" icon={Clock}>Last detected 12s ago</Badge>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: "var(--space-4)",
              }}
            >
              <div style={{ color: "var(--severity-critical)", marginBottom: 4 }}>
                [CRITICAL] [order-service] trace_id=b223-1109 DatabaseConnectionError: could not connect to PostgreSQL primary: connection pool exhausted (max=100)
              </div>
              <div style={{ color: "var(--severity-error)" }}>
                [ERROR] [checkout-service] trace_id=b223-1109 HTTP 504 Gateway Timeout while querying inventory lock for sku=SKU-998
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
              <span>Affected: <strong>order-service</strong>, <strong>checkout-service</strong></span>
              <span>•</span>
              <span>Probable Root Cause: <strong>PostgreSQL connection pool max threshold</strong></span>
              <span>•</span>
              <span style={{ color: "var(--accent-secondary)" }}>Trace ID: b223-1109-ee74</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Section */}
      <section id="workflow" className="landing-section" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="landing-section-header">
          <Badge variant="primary" icon={Workflow}>Autonomous Lifecycle</Badge>
          <h2 className="landing-section-title" style={{ marginTop: 8 }}>
            How LogPilot AI Operates
          </h2>
          <p className="landing-section-subtitle">
            An end-to-end pipeline bridging statistical pattern mining with AI diagnostic agents
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
          {workflowSteps.map((st) => (
            <div key={st.step} className="card" style={{ padding: "var(--space-5)" }}>
              <div className="code-font" style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-primary)", marginBottom: 4 }}>
                {st.step}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                {st.name}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="landing-section">
        <div className="landing-section-header">
          <Badge variant="default" icon={Layers}>Subsystems</Badge>
          <h2 className="landing-section-title" style={{ marginTop: 8 }}>
            Core Platform Capabilities
          </h2>
          <p className="landing-section-subtitle">
            Transparent breakdown of active foundation vs planned intelligent subsystems
          </p>
        </div>

        <div className="feature-grid">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="feature-card">
                <div className="feature-icon-wrapper">
                  <Icon size={20} />
                </div>
                <div className="feature-title">
                  <span>{cap.title}</span>
                  <Badge variant="default" icon={Clock}>
                    {cap.status}
                  </Badge>
                </div>
                <p className="feature-desc">{cap.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Technical Architecture Overview */}
      <section id="architecture" className="landing-section" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="landing-section-header">
          <Badge variant="success" icon={CheckCircle2}>Production Architecture</Badge>
          <h2 className="landing-section-title" style={{ marginTop: 8 }}>
            Technical Architecture & Security
          </h2>
          <p className="landing-section-subtitle">
            Enterprise observability standards designed for local development and high-throughput scaling
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-6)" }}>
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Frontend Observability Shell
            </h3>
            <ul style={{ listStyle: "inside disc", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
              <li>React 18 + Vite with ES6+ JavaScript (Zero TypeScript)</li>
              <li>Pure regular CSS with Dark & Light theme tokens</li>
              <li>Recharts & React Flow for topology visualizers</li>
              <li>Visible focus indicators and accessible ARIA navigation</li>
            </ul>
          </div>

          <div className="card" style={{ padding: "var(--space-5)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Backend & Storage Engine
            </h3>
            <ul style={{ listStyle: "inside disc", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
              <li>FastAPI (Python 3.12) with versioned REST endpoints</li>
              <li>SQLAlchemy 2.0 ORM with SQLite PRAGMA foreign keys</li>
              <li>SensitiveDataRedactor stripping tokens & credentials</li>
              <li>X-Request-ID and X-Process-Time diagnostic tracing</li>
            </ul>
          </div>

          <div className="card" style={{ padding: "var(--space-5)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              AIOps & Reasoning Pipeline
            </h3>
            <ul style={{ listStyle: "inside disc", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
              <li>Drain3 online template miner for error log clustering</li>
              <li>Google Gen AI SDK (Gemini) with zero frontend key leakage</li>
              <li>Restricted remediation guard (ENABLE_REMEDIATION_EXECUTION=false)</li>
              <li>Safe plain-text log rendering preventing XSS vulnerabilities</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>LogPilot AI — Detect. Diagnose. Resolve.</div>
        <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
          Tech Fusion 4.0 — Codestorm | Enterprise & Industry (PS-01A) | Phase 2 Premium AIOps UI
        </div>
      </footer>
    </div>
  );
}
