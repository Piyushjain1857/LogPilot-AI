import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Shield,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  Server,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import ThemeToggle from "../components/common/ThemeToggle";
import { getHealthStatus } from "../services/api";

const SAMPLE_LOG_PRESETS = [
  {
    id: "db_exhaustion",
    title: "PostgreSQL Pool Exhaustion",
    service: "order-service",
    severity: "CRITICAL",
    raw: '2026-11-25T03:45:12.311Z [CRITICAL] [order-service] DatabaseConnectionError: connection pool exhausted (max=100) uri=postgresql://postgres:SuperSecretP@ssw0rd!@db-primary:5432/orders?ssl=true api_key=AIzaSyD-981248102 trace_id=tr-db-exhaustion-881',
    redacted: '2026-11-25T03:45:12.311Z [CRITICAL] [order-service] DatabaseConnectionError: connection pool exhausted (max=100) uri=postgresql://postgres:[REDACTED_PASSWORD]@db-primary:5432/orders?ssl=true api_key=[REDACTED_API_KEY] trace_id=tr-db-exhaustion-881',
    detectedSecrets: ["Database Password", "Google API Key"],
    hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  },
  {
    id: "jwt_leak",
    title: "Auth JWT & Bearer Token Exposure",
    service: "auth-service",
    severity: "ERROR",
    raw: '2026-11-25T03:45:15.890Z [ERROR] [auth-service] Failed authentication attempt header=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlBpeXVzaCIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c user_id=usr_88291 token=sk_live_51MzE4928192847192',
    redacted: '2026-11-25T03:45:15.890Z [ERROR] [auth-service] Failed authentication attempt header=Bearer [REDACTED_JWT_TOKEN] user_id=usr_88291 token=[REDACTED_BEARER_TOKEN]',
    detectedSecrets: ["JSON Web Token (JWT)", "Stripe Secret Key"],
    hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    id: "gateway_timeout",
    title: "Gateway 504 Cascading Timeout",
    service: "api-gateway",
    severity: "ERROR",
    raw: '2026-11-25T03:45:18.012Z [ERROR] [api-gateway] Upstream connection timed out after 5000ms target=http://order-service:8080/checkout request_id=req_cascade_991 private_key=-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\\n-----END PRIVATE KEY-----',
    redacted: '2026-11-25T03:45:18.012Z [ERROR] [api-gateway] Upstream connection timed out after 5000ms target=http://order-service:8080/checkout request_id=req_cascade_991 private_key=[REDACTED_RSA_PRIVATE_KEY]',
    detectedSecrets: ["RSA Private Key"],
    hash: "sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activePreviewTab, setActivePreviewTab] = useState("ingest");
  const [systemLive, setSystemLive] = useState(true);

  // Stage 1: Interactive Playground State
  const [selectedPreset, setSelectedPreset] = useState(SAMPLE_LOG_PRESETS[0]);
  const [showMasked, setShowMasked] = useState(true);
  const [copied, setCopied] = useState(false);

  // Stage 3: Interactive Topology Selection
  const [selectedNode, setSelectedNode] = useState("postgres-db");

  // Stage 4: AI Diagnostic Studio Interactive Prompt
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(0);

  // Stage 5: Remediation Simulation State
  const [simulatingMitigation, setSimulatingMitigation] = useState(false);
  const [mitigationProgress, setMitigationProgress] = useState(0);
  const [mitigationDone, setMitigationDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    getHealthStatus()
      .then((res) => {
        if (mounted && res && res.status === "healthy") {
          setSystemLive(true);
        }
      })
      .catch(() => {
        if (mounted) setSystemLive(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const scrollToSection = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCopyHash = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunSimulation = () => {
    setSimulatingMitigation(true);
    setMitigationProgress(0);
    setMitigationDone(false);

    const interval = setInterval(() => {
      setMitigationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSimulatingMitigation(false);
          setMitigationDone(true);
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  const previewTabs = [
    { id: "ingest", label: "01. Multi-Format Ingest & Redact", badge: "Live Pipeline" },
    { id: "detect", label: "02. Rolling Z-Score Anomaly", badge: "4.82σ Burst" },
    { id: "correlate", label: "03. Dependency Causal Graph", badge: "Trace Flow" },
    { id: "diagnose", label: "04. Gemini AI Troubleshooter", badge: "Zero-Hallucination" },
    { id: "remediate", label: "05. Mitigation Runbook Runner", badge: "Human Guardrails" },
  ];

  const capabilities = [
    {
      title: "Multi-Format Ingestion & Masking",
      description: "High-throughput streaming parsers for .log, .txt multiline traces, .csv with column auto-mapping, .json, and .jsonl with cryptographic SHA-256 deduplication and regex secret redaction.",
      icon: UploadCloud,
      status: "Implemented · Phase 3",
      active: true,
      href: "/app/log-sources",
    },
    {
      title: "Real-Time WebSocket Streaming",
      description: "Sub-50ms live log tailing with bounded in-memory sliding buffers (250–2,500 events), pause/resume, and zero-thrash 150ms micro-batching.",
      icon: Zap,
      status: "Implemented · Phase 5",
      active: true,
      href: "/app/live-logs",
    },
    {
      title: "Distributed Trace Waterfall",
      description: "Microsecond transaction spans reconstruction across distributed microservices. Pinpoints exactly which downstream dependency failed first.",
      icon: GitBranch,
      status: "Implemented · Phase 6",
      active: true,
      href: "/app/traces",
    },
    {
      title: "Rolling Z-Score Anomaly Engine",
      description: "Dynamic moving-window frequency baseline modeling. Distinguishes benign background traffic from catastrophic error bursts (>3.0σ thresholds).",
      icon: Activity,
      status: "Implemented · Phase 7",
      active: true,
      href: "/app/anomalies",
    },
    {
      title: "Drain3 Pattern Clustering",
      description: "Online parse-tree log template clustering with Levenshtein similarity. Compresses millions of noisy repetitive log rows into distinct templates.",
      icon: Layers,
      status: "Implemented · Phase 8",
      active: true,
      href: "/app/clusters",
    },
    {
      title: "Incident Correlation & Timeline",
      description: "Cross-service incident auto-correlation grouped by shared trace IDs, cascading time windows, and affected service topologies.",
      icon: Shield,
      status: "Implemented · Phase 9",
      active: true,
      href: "/app/incidents",
    },
    {
      title: "Evidence-Based Root Cause Graph",
      description: "Multi-factor causal path analysis scoring temporal precedence, topological depth, and severity to isolate true origin services.",
      icon: Workflow,
      status: "Implemented · Phase 10",
      active: true,
      href: "/app/root-cause",
    },
    {
      title: "Gemini AI Diagnostic Studio",
      description: "Google Gemini generative AI agent with strict zero-hallucination guardrails: every root cause claim is grounded by verified database citations.",
      icon: Bot,
      status: "Implemented · Phase 11",
      active: true,
      href: "/app/troubleshooter",
    },
    {
      title: "Remediation Playbooks & Runbooks",
      description: "Automated mitigation plans with human-in-the-loop safety gates, non-destructive parameter adjustments, and rollback verification.",
      icon: FileCode,
      status: "Implemented · Phase 12",
      active: true,
      href: "/app/remediation",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      name: "Ingest & Redact",
      desc: "Stream logs via REST or files with SHA-256 deduplication and regex masking of JWTs, keys, and tokens.",
      icon: UploadCloud,
    },
    {
      step: "02",
      name: "Detect & Cluster",
      desc: "Isolate anomalous frequency bursts with rolling z-scores and compress noise via Drain3 template mining.",
      icon: Activity,
    },
    {
      step: "03",
      name: "Correlate Traces",
      desc: "Reconstruct microsecond waterfall transactions and topological dependency graphs across services.",
      icon: GitBranch,
    },
    {
      step: "04",
      name: "Diagnose Root Cause",
      desc: "Execute multi-factor causal graph ranking and synthesize Gemini AI hypotheses backed by verified citations.",
      icon: Bot,
    },
    {
      step: "05",
      name: "Remediate & Report",
      desc: "Deploy human-in-the-loop playbooks, verify rollback safety, and export executive post-mortem SLA reports.",
      icon: FileCode,
    },
  ];

  const aiPrompts = [
    {
      q: "What caused the cascading failure on order-service?",
      hypothesis: "Unindexed table locks on inventory_locks held PostgreSQL pool connections open for >5000ms, exhausting the max_connections limit (100/100) and cascading upstream HTTP 504 timeouts to api-gateway.",
      rootService: "postgres-db:5432",
      confidence: "96% High Confidence",
      citations: ["order-service: DatabaseConnectionError (max=100)", "api-gateway: Upstream 504 Gateway Timeout"],
    },
    {
      q: "Which service failed first chronologically?",
      hypothesis: "Initial anomalous latency spike originated in postgres-db at 03:45:11.890Z (+1,240ms query duration), 1.2 seconds before order-service pool timeout and 2.4 seconds before api-gateway 504 cascade.",
      rootService: "postgres-db:5432",
      confidence: "94% High Confidence",
      citations: ["postgres-db: slow query log on inventory_locks", "order-service: pool checkout timeout"],
    },
    {
      q: "What is the recommended safe mitigation step?",
      hypothesis: "Scale connection pool max_connections buffer to 150, terminate idle in-transaction locks exceeding 120s, and create composite index on inventory_locks(sku, locked_at).",
      rootService: "postgres-db:5432",
      confidence: "98% Actionable",
      citations: ["Remediation Playbook: PB-PG-POOL-01"],
    },
  ];

  return (
    <div style={{ backgroundColor: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>
      {/* Top Header / Navbar */}
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
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            LogPilot AI
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>|</span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 500 }}>
            Detect. Diagnose. Resolve.
          </span>
          <span
            style={{
              marginLeft: "var(--space-2)",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              backgroundColor: systemLive ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: systemLive ? "var(--status-success)" : "var(--status-error)",
              border: `1px solid ${systemLive ? "var(--status-success)" : "var(--status-error)"}`,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: systemLive ? "var(--status-success)" : "var(--status-error)",
              }}
            />
            {systemLive ? "Live Telemetry" : "Backend Offline"}
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <a
            href="#demo"
            onClick={scrollToSection("demo")}
            style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Interactive Demo
          </a>
          <a
            href="#features"
            onClick={scrollToSection("features")}
            style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Capabilities
          </a>
          <a
            href="#workflow"
            onClick={scrollToSection("workflow")}
            style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Architecture Flow
          </a>
          <Link to="/app/demo" style={{ color: "var(--accent-primary)", fontSize: 13, fontWeight: 600 }}>
            7-Stage Live Demo
          </Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <ThemeToggle />
          <Button
            to="/login"
            variant="ghost"
            size="sm"
          >
            Sign In
          </Button>
          <Button
            to="/app"
            variant="primary"
            size="sm"
            icon={ArrowRight}
          >
            Launch Workspace
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="landing-hero"
        style={{
          padding: "var(--space-12) var(--space-6) var(--space-6)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="landing-hero-badge">
          <Sparkles size={14} />
          <span>Tech Fusion 4.0 — Hackathon Problem Statement PS-01A (Codestorm)</span>
        </div>

        <h1
          className="landing-title"
          style={{
            fontSize: "clamp(2.4rem, 5.2vw, 4.2rem)",
            fontWeight: 800,
            lineHeight: 1.12,
            color: "var(--text-primary)",
            margin: "var(--space-5) 0 var(--space-4)",
            letterSpacing: "-0.03em",
          }}
        >
          From High-Volume Logs to <br />
          <span className="landing-gradient-text">
            Autonomous Root Cause Resolution.
          </span>
        </h1>

        <p
          className="landing-tagline"
          style={{
            maxWidth: 760,
            margin: "0 auto var(--space-6)",
            fontSize: "16px",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
          }}
        >
          LogPilot AI ingests multi-format telemetry logs, masks sensitive secrets in real time, isolates anomaly
          bursts with rolling z-score bounds, correlates distributed traces across microservices, and synthesizes
          human-in-the-loop remediation playbooks.
        </p>

        {/* Hero Primary Actions */}
        <div
          className="landing-actions"
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            marginBottom: "var(--space-6)",
          }}
        >
          <Button
            to="/app"
            variant="primary"
            size="lg"
            icon={ArrowRight}
            style={{ fontWeight: 600, padding: "12px 24px", fontSize: "15px" }}
          >
            Open Observability Console
          </Button>
          <Button
            to="/app/log-sources"
            variant="secondary"
            size="lg"
            icon={UploadCloud}
            style={{ padding: "12px 20px", fontSize: "15px" }}
          >
            Upload Log Files
          </Button>
          <Button
            to="/app/demo"
            variant="secondary"
            size="lg"
            icon={Play}
            style={{ padding: "12px 20px", fontSize: "15px" }}
          >
            7-Stage Live Demo
          </Button>
        </div>

        {/* Metric Strip */}
        <div className="landing-metric-strip">
          <div className="landing-metric-item">
            <div className="landing-metric-icon">
              <Zap size={18} />
            </div>
            <div className="landing-metric-text">
              <span className="landing-metric-value">18,000+ logs/s</span>
              <span className="landing-metric-label">High-Throughput Stream Parsing</span>
            </div>
          </div>

          <div className="landing-metric-item">
            <div className="landing-metric-icon">
              <Lock size={18} />
            </div>
            <div className="landing-metric-text">
              <span className="landing-metric-value">100% PII Masking</span>
              <span className="landing-metric-label">Zero Secret Exposure Regex</span>
            </div>
          </div>

          <div className="landing-metric-item">
            <div className="landing-metric-icon">
              <Activity size={18} />
            </div>
            <div className="landing-metric-text">
              <span className="landing-metric-value">Sub-Second Burst</span>
              <span className="landing-metric-label">Rolling Z-Score Anomaly Model</span>
            </div>
          </div>

          <div className="landing-metric-item">
            <div className="landing-metric-icon">
              <Shield size={18} />
            </div>
            <div className="landing-metric-text">
              <span className="landing-metric-value">0% Hallucination</span>
              <span className="landing-metric-label">Cryptographically Verified Citations</span>
            </div>
          </div>
        </div>

        {/* Interactive Feature Demo Container */}
        <div id="demo" className="landing-interactive-console">
          {/* Top macOS Browser Window Header */}
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
                logpilot-ai / telemetry-pipeline (Interactive Command Simulator)
              </span>
            </div>
            <span className="badge badge-success">Production Ready · 15/15 Phases Active</span>
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
                  cursor: "pointer",
                }}
              >
                <span>{tb.label}</span>
                <span className="badge badge-neutral" style={{ fontSize: "10px" }}>{tb.badge}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div style={{ padding: "var(--space-6)" }}>
            {/* 1. Ingest & Redact Playground */}
            {activePreviewTab === "ingest" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: 4 }}>REAL-TIME INLINE REDACTION PLAYGROUND</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Multi-Format Parsing with Secret & Credential Masking
                    </h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${showMasked ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setShowMasked(!showMasked)}
                      style={{ gap: 4 }}
                    >
                      {showMasked ? <Eye size={12} /> : <EyeOff size={12} />}
                      {showMasked ? "Masked Output" : "Raw Log"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => handleCopyHash(selectedPreset.hash)}
                      style={{ gap: 4 }}
                    >
                      {copied ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                      {copied ? "Copied SHA-256" : "Copy Hash"}
                    </button>
                  </div>
                </div>

                {/* Preset Selector Chips */}
                <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
                  {SAMPLE_LOG_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn btn-xs ${selectedPreset.id === p.id ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setSelectedPreset(p)}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>

                {/* Log Line Display Box */}
                <div
                  style={{
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-3)",
                    lineHeight: 1.65,
                    wordBreak: "break-all",
                  }}
                >
                  {showMasked ? (
                    <div>
                      {selectedPreset.redacted.split(/(\[REDACTED_[A-Z0-9_]+\])/g).map((part, i) =>
                        part.startsWith("[REDACTED_") ? (
                          <span key={i} className="redacted-badge" style={{ margin: "0 2px" }}>
                            {part}
                          </span>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                  ) : (
                    <div style={{ color: "var(--status-warning)" }}>{selectedPreset.raw}</div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                    <span>Protected Secrets:</span>
                    {selectedPreset.detectedSecrets.map((s) => (
                      <span key={s} className="badge badge-success" style={{ fontSize: 10 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <Button to="/app/log-sources" variant="primary" size="xs">
                    Upload Real Log Files →
                  </Button>
                </div>
              </div>
            )}

            {/* 2. Anomaly Detection */}
            {activePreviewTab === "detect" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-error" style={{ marginBottom: 4 }}>STATISTICAL ANOMALY BURST DETECTOR</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Rolling z-Score Anomaly Isolation on order-service
                    </h3>
                  </div>
                  <span className="badge badge-error">{"z = 4.82σ (> 3.0σ Threshold)"}</span>
                </div>

                {/* Simulated Anomaly Bar Visualization */}
                <div
                  style={{
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--text-muted)" }}>T-60s Baseline: 1.2 errors/min</span>
                    <span style={{ color: "var(--status-error)", fontWeight: 700 }}>Burst Spike: 88 errors/min (+7,233%)</span>
                  </div>
                  <div style={{ height: 12, width: "100%", backgroundColor: "var(--bg-surface)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "15%", backgroundColor: "var(--status-success)" }} title="Normal Baseline (15%)" />
                    <div style={{ position: "absolute", left: "15%", top: 0, bottom: 0, width: "85%", backgroundColor: "var(--status-error)" }} title="Anomaly Breach (+7,233%)" />
                  </div>
                  <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--status-error)" }}>
                    [BREACH DETECTED] order-service Database connection pool timeout frequency surged 4.82σ above normal 15-min rolling window.
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <span>Sliding Window: <strong>60 seconds</strong></span>
                    <span>•</span>
                    <span>Detection Latency: <strong>420ms</strong></span>
                    <span>•</span>
                    <span>False-Positive Dampener: <strong>Active</strong></span>
                  </div>
                  <Button to="/app/anomalies" variant="primary" size="xs">
                    Inspect Anomaly Explorer →
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Root Cause Topology */}
            {activePreviewTab === "correlate" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-warning" style={{ marginBottom: 4 }}>TOPOLOGICAL CAUSAL GRAPH</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Multi-Hop Causal Propagation & Dependency Analysis
                    </h3>
                  </div>
                  <span className="badge badge-neutral">Trace: tr-cascading-999</span>
                </div>

                {/* Clickable Node Flow */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-4)",
                    backgroundColor: "var(--bg-input)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: "var(--space-3)",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    onClick={() => setSelectedNode("api-gateway")}
                    style={{
                      textAlign: "center",
                      padding: "8px 14px",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-sm)",
                      border: selectedNode === "api-gateway" ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Edge (Symptom)</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>api-gateway</div>
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>HTTP 504</span>
                  </div>

                  <span>→</span>

                  <div
                    onClick={() => setSelectedNode("order-service")}
                    style={{
                      textAlign: "center",
                      padding: "8px 14px",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-sm)",
                      border: selectedNode === "order-service" ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Worker (Propagating)</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>order-service</div>
                    <span className="badge badge-error" style={{ fontSize: 10 }}>Timeout</span>
                  </div>

                  <span>→</span>

                  <div
                    onClick={() => setSelectedNode("postgres-db")}
                    style={{
                      textAlign: "center",
                      padding: "8px 14px",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-sm)",
                      border: selectedNode === "postgres-db" ? "2px solid var(--status-critical)" : "1px solid var(--border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--status-critical)", fontWeight: 800 }}>PRIMARY ROOT CAUSE</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>postgres-db:5432</div>
                    <span className="badge badge-error" style={{ fontSize: 10, backgroundColor: "var(--status-critical)" }}>Pool Saturated</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>
                    Selected: <strong>{selectedNode}</strong> (Causal score: {selectedNode === "postgres-db" ? "0.96 (Primary Root)" : "0.72 (Downstream Propagation)"})
                  </span>
                  <Button to="/app/root-cause" variant="primary" size="xs">
                    Open Full Causal Graph →
                  </Button>
                </div>
              </div>
            )}

            {/* 4. AI Diagnostic Studio */}
            {activePreviewTab === "diagnose" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: 4 }}>GEMINI 1.5 PRO REASONING ENGINE</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      AI Agent Causal Reasoning & Zero-Hallucination Citations
                    </h3>
                  </div>
                  <span className="badge badge-success">{aiPrompts[selectedPromptIdx].confidence}</span>
                </div>

                {/* Quick Prompts Chips */}
                <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
                  {aiPrompts.map((p, idx) => (
                    <button
                      key={p.q}
                      type="button"
                      className={`btn btn-xs ${selectedPromptIdx === idx ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setSelectedPromptIdx(idx)}
                    >
                      {p.q}
                    </button>
                  ))}
                </div>

                {/* AI Reasoning Response Box */}
                <div
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    lineHeight: 1.65,
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong>Root Cause Diagnosis:</strong> {aiPrompts[selectedPromptIdx].hypothesis}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-muted)" }}>
                    <Shield size={12} color="var(--status-success)" />
                    <span>Verified Database Citations:</span>
                    {aiPrompts[selectedPromptIdx].citations.map((c) => (
                      <span key={c} className="format-pill" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>Zero Command Execution Sandbox Guarantee</span>
                  <Button to="/app/troubleshooter" variant="primary" size="xs">
                    Try Interactive Diagnostic Studio →
                  </Button>
                </div>
              </div>
            )}

            {/* 5. Remediation Playbooks */}
            {activePreviewTab === "remediate" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: 4 }}>HUMAN-IN-THE-LOOP APPROVAL RUNNER</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      Synthesized Mitigation Runbook with Safe Rollbacks
                    </h3>
                  </div>
                  <span className="badge badge-success">Safe Non-Destructive</span>
                </div>

                {/* Steps List */}
                <ol style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-primary)", marginBottom: "var(--space-3)" }}>
                  <li>Step 1: Increase PostgreSQL max_connections pool buffer from 100 to 150.</li>
                  <li>Step 2: Terminate idle in-transaction locks exceeding 2 minutes.</li>
                  <li>Step 3: Apply missing composite index on inventory_locks(sku, locked_at).</li>
                </ol>

                {/* Interactive Simulation Progress Bar */}
                {simulatingMitigation && (
                  <div style={{ marginBottom: "var(--space-3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--accent-primary)", marginBottom: 4 }}>
                      <span>Executing safe mitigation step...</span>
                      <span>{mitigationProgress}%</span>
                    </div>
                    <div style={{ height: 6, width: "100%", backgroundColor: "var(--bg-input)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${mitigationProgress}%`, backgroundColor: "var(--status-success)", transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                )}

                {mitigationDone && (
                  <div style={{ padding: "8px 12px", backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--status-success)", color: "var(--status-success)", borderRadius: "var(--radius-sm)", fontSize: 12, marginBottom: "var(--space-3)" }}>
                    ✓ Mitigation executed successfully. Pool utilization dropped from 100% to 34%.
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleRunSimulation}
                    disabled={simulatingMitigation}
                    style={{ gap: 6 }}
                  >
                    <Play size={12} className={simulatingMitigation ? "spinning" : ""} />
                    {simulatingMitigation ? "Simulating..." : "Simulate Non-Destructive Fix"}
                  </button>

                  <Button to="/app/remediation" variant="primary" size="xs">
                    Inspect Full Runbook Runner →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Architectural Workflow Section */}
      <section
        id="workflow"
        className="landing-section"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "var(--space-12) var(--space-8)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <Badge variant="default" icon={Workflow}>
            Autonomous Intelligence Pipeline
          </Badge>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: 8 }}>
            5-Stage End-to-End AIOps Architecture
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: 4, maxWidth: 640, margin: "4px auto 0" }}>
            From distributed streaming ingestion to verified human-in-the-loop mitigation.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-4)",
            maxWidth: 1140,
            margin: "0 auto",
          }}
        >
          {workflowSteps.map((ws) => {
            const Icon = ws.icon;
            return (
              <div key={ws.step} className="landing-workflow-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-primary)" }}>{ws.step}</span>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--accent-primary-alpha)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)" }}>
                    <Icon size={14} />
                  </div>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{ws.name}</h4>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>{ws.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Platform Capabilities Grid */}
      <section
        id="features"
        className="landing-section"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "var(--space-12) var(--space-8)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <Badge variant="default" icon={Cpu}>Platform Capabilities</Badge>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: 8 }}>
            Engineered for Modern Enterprise Observability
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: 4 }}>
            Zero Tailwind, Zero Bootstrap — Pure Semantic ES6+ & SQLite FTS5 Architecture.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "var(--space-5)",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="landing-capability-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--accent-primary-alpha)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-primary)",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="badge badge-success">{cap.status}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  {cap.title}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, flex: 1 }}>
                  {cap.description}
                </p>
                <div style={{ paddingTop: "var(--space-2)" }}>
                  <Button to={cap.href} variant="secondary" size="xs" style={{ width: "100%", justifyContent: "center" }}>
                    Explore Feature →
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "var(--space-8) var(--space-8)",
          backgroundColor: "var(--bg-header)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-6)", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{ maxWidth: 360 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 8 }}>
              <div className="sidebar-logo-icon">
                <Terminal size={14} />
              </div>
              <strong style={{ fontSize: 15 }}>LogPilot AI</strong>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Enterprise Autonomous Observability & Troubleshooting Agent. Built for Tech Fusion 4.0 — Codestorm Track.
            </p>
          </div>

          <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                Monitoring
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <Link to="/app" style={{ color: "var(--text-secondary)" }}>Console Overview</Link>
                <Link to="/app/live-logs" style={{ color: "var(--text-secondary)" }}>Live WebSocket Logs</Link>
                <Link to="/app/log-explorer" style={{ color: "var(--text-secondary)" }}>Log Explorer</Link>
                <Link to="/app/traces" style={{ color: "var(--text-secondary)" }}>Distributed Traces</Link>
                <Link to="/app/log-sources" style={{ color: "var(--text-secondary)" }}>Log Sources</Link>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                Intelligence
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <Link to="/app/anomalies" style={{ color: "var(--text-secondary)" }}>Anomaly Detection</Link>
                <Link to="/app/clusters" style={{ color: "var(--text-secondary)" }}>Pattern Clusters</Link>
                <Link to="/app/incidents" style={{ color: "var(--text-secondary)" }}>Incident Management</Link>
                <Link to="/app/root-cause" style={{ color: "var(--text-secondary)" }}>Root Cause Analysis</Link>
                <Link to="/app/troubleshooter" style={{ color: "var(--text-secondary)" }}>AI Troubleshooter</Link>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                Operations
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <Link to="/app/remediation" style={{ color: "var(--text-secondary)" }}>Remediation Playbooks</Link>
                <Link to="/app/reports" style={{ color: "var(--text-secondary)" }}>SLA & Post-Mortem Reports</Link>
                <Link to="/app/demo" style={{ color: "var(--text-secondary)" }}>7-Stage Live Demo</Link>
                <Link to="/app/settings" style={{ color: "var(--text-secondary)" }}>Platform Settings</Link>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)", maxWidth: 1200, margin: "0 auto", width: "100%", flexWrap: "wrap", gap: 8 }}>
          <span>© 2026 LogPilot AI. Enterprise Observability & Autonomous Troubleshooter Agent.</span>
          <span>FastAPI 0.115 · React 18 · SQLite FTS5 · Zero Tailwind · Pure Semantic CSS</span>
        </div>
      </footer>
    </div>
  );
}
