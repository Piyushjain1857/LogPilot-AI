import React, { useState, useRef, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Database,
  Server,
  Terminal,
  Activity,
  CheckCircle2,
} from "lucide-react";

const SUGGESTED_PROMPTS = [
  {
    label: "Diagnose DB Pool Saturation",
    prompt: "Why did order-service database connection pool exhaust, and what triggered the cascading timeouts?",
    scenario: "db-pool",
  },
  {
    label: "Analyze Stripe Webhook 504s",
    prompt: "Investigate HTTP 504 Gateway Timeouts from payment-service connecting to Stripe provider.",
    scenario: "stripe-webhook",
  },
  {
    label: "Checkout-Service Canary Rollback",
    prompt: "Analyze checkout-service error spike following canary release v2.4.1 and verify rollback.",
    scenario: "canary-rollback",
  },
  {
    label: "Check Circuit Breaker Tripping",
    prompt: "Why did the circuit breaker between order-service and db-primary transition from OPEN to HALF_OPEN?",
    scenario: "circuit-breaker",
  },
];

const PRESET_RESPONSES = {
  "db-pool": {
    thinking: [
      "Extracted 14 correlated log entries sharing trace_id=b223-1109-ee74 across order-service and inventory-service.",
      "Identified critical saturation point: PostgreSQL connection pool reached 100/100 limit at 10:00:11.890Z.",
      "Analyzed slow query locks: SELECT * FROM inventory_locks WHERE sku='SKU-998' exceeded 5000ms threshold.",
      "Correlated circuit breaker trip in order-service: switched to OPEN state to prevent cascade to payment-service.",
    ],
    hypothesis:
      "Database connection pool saturation on db-primary.internal:5432 caused by unindexed lock contention in inventory-service during concurrent checkout transactions.",
    confidence: 96,
    affectedServices: ["order-service", "inventory-service", "db-primary.internal"],
    evidence: [
      {
        line: "2026-11-24T10:00:11.890Z [CRITICAL] [order-service] trace_id=b223-1109-ee74 DatabaseConnectionError: could not connect to PostgreSQL primary: connection pool exhausted (max=100)",
        source: "order-service",
        severity: "CRITICAL",
      },
      {
        line: "2026-11-24T10:00:12.311Z [ERROR] [inventory-service] trace_id=b223-1109-ee74 Database query timeout after 5000ms: SELECT * FROM inventory_locks WHERE sku='SKU-998'",
        source: "inventory-service",
        severity: "ERROR",
      },
    ],
    remediation: [
      "Temporarily increase PostgreSQL max_connections pool buffer from 100 to 150 on db-primary.",
      "Add missing composite index on inventory_locks(sku, locked_at) to eliminate sequential table scan locks.",
      "Tune connection pool checkout timeout in order-service application configuration from 5000ms to 2000ms with exponential backoff.",
      "Verify circuit breaker reset: monitor transitions from HALF_OPEN to CLOSED state.",
    ],
  },
  "stripe-webhook": {
    thinking: [
      "Scanned payment-service error logs with trace_id=a118-7744-bb99.",
      "Upstream Stripe Connect webhook endpoint experienced a 15,000ms gateway timeout.",
      "Observed 3 consecutive retries with exponential backoff before HTTP 504 was propagated to api-gateway.",
    ],
    hypothesis:
      "Upstream network latency spike in Stripe webhook ingress caused payment worker threads to block waiting for response payloads.",
    confidence: 91,
    affectedServices: ["payment-service", "api-gateway"],
    evidence: [
      {
        line: "2026-11-24T10:00:14.650Z [ERROR] [payment-service] trace_id=a118-7744-bb99 HTTP 504 Gateway Timeout while awaiting upstream payment gateway webhook provider=StripeConnect",
        source: "payment-service",
        severity: "ERROR",
      },
    ],
    remediation: [
      "Enable asynchronous webhook processing queue via Redis/Celery instead of blocking synchronous HTTP handlers.",
      "Configure ingress timeout threshold to 8000ms with graceful customer notification.",
    ],
  },
  "canary-rollback": {
    thinking: [
      "Correlated deploy-orchestrator telemetry with checkout-service v2.4.1 canary rollout.",
      "Detected sudden error spike: 18.5% error rate exceeded 1.0% automated canary rollback threshold.",
      "Extracted exception trace: KeyError 'tax_rate_id' at CheckoutCalculator.py:142.",
    ],
    hypothesis:
      "Regression introduced in canary v2.4.1 expecting missing tax_rate_id attribute in order request payload, triggering automated canary rollback to stable v2.4.0.",
    confidence: 99,
    affectedServices: ["checkout-service", "deploy-orchestrator"],
    evidence: [
      {
        line: "2026-11-24T10:00:10.512Z [ERROR] [checkout-service] trace_id=d991-8812-cc55 HTTP 500 InternalServerError - Unhandled KeyError: 'tax_rate_id' at CheckoutCalculator.py:142",
        source: "checkout-service",
        severity: "ERROR",
      },
      {
        line: "2026-11-24T10:00:18.005Z [WARNING] [deploy-orchestrator] trace_id=d991-8812-cc55 Canary health probe failed: checkout-service error rate 18.5% exceeds threshold 1.0%",
        source: "deploy-orchestrator",
        severity: "WARNING",
      },
    ],
    remediation: [
      "Maintain active deployment on stable revision v2.4.0.",
      "Add schema validation guard in CheckoutCalculator.py with fallback default for tax_rate_id.",
      "Add integration test verifying backward-compatible payload schema before next canary rollout.",
    ],
  },
};

export default function TroubleshooterPage() {
  const [messages, setMessages] = useState([
    {
      id: "msg-welcome",
      role: "assistant",
      content:
        "Welcome to the LogPilot AI Diagnostic Studio. I correlate multi-service log streams, distributed traces, and stack traces to infer probable root causes and synthesize mitigation runbooks. Click a diagnostic scenario below or type an investigation query.",
      meta: null,
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedThinking, setExpandedThinking] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing]);

  const handleSendPrompt = (promptText, scenarioKey = null) => {
    if (!promptText.trim()) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: promptText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsAnalyzing(true);

    // Simulate agent synthesis and reasoning delay
    setTimeout(() => {
      let responseData = null;
      if (scenarioKey && PRESET_RESPONSES[scenarioKey]) {
        responseData = PRESET_RESPONSES[scenarioKey];
      } else {
        const lower = promptText.toLowerCase();
        if (lower.includes("pool") || lower.includes("database") || lower.includes("db")) {
          responseData = PRESET_RESPONSES["db-pool"];
        } else if (lower.includes("stripe") || lower.includes("webhook") || lower.includes("504")) {
          responseData = PRESET_RESPONSES["stripe-webhook"];
        } else if (lower.includes("canary") || lower.includes("checkout") || lower.includes("rollback")) {
          responseData = PRESET_RESPONSES["canary-rollback"];
        } else {
          responseData = {
            thinking: [
              "Queried local SQLite logs database for correlated traces matching the prompt tokens.",
              "Evaluated log frequency distribution across active services.",
              "Verified zero arbitrary command execution policy in effect.",
            ],
            hypothesis:
              "The diagnostic agent parsed the requested context. Detailed LLM reasoning will stream via Google Gen AI SDK in Phase 4 when GEMINI_API_KEY is configured.",
            confidence: 88,
            affectedServices: ["backend-services"],
            evidence: [
              {
                line: "System telemetry verified: Read-only sandbox active with zero credential exposure.",
                source: "audit-guard",
                severity: "INFO",
              },
            ],
            remediation: [
              "Review correlated logs in the Log Explorer under /app/log-explorer.",
              "Verify microservice resource limits and database pool configurations.",
            ],
          };
        }
      }

      const agentMsg = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: responseData.hypothesis,
        meta: responseData,
      };

      setMessages((prev) => [...prev, agentMsg]);
      setIsAnalyzing(false);
    }, 1100);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThinking = (msgId) => {
    setExpandedThinking((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="AI Troubleshooter Studio"
        subtitle="Autonomous diagnostic agent correlating distributed trace evidence, analyzing failure propagation, and synthesizing remediation runbooks."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <span className="badge badge-success" style={{ gap: "4px" }}>
              <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--status-success)" }} />
              Reasoning Engine Ready
            </span>
            <span className="badge badge-neutral">Gemini Core (Phase 4)</span>
          </div>
        }
      />

      {/* Suggested Scenario Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
        <span style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Diagnostic Scenarios:
        </span>
        {SUGGESTED_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => handleSendPrompt(item.prompt, item.scenario)}
            style={{ borderRadius: "var(--radius-full)", padding: "4px 10px", fontSize: "11px", gap: "4px" }}
          >
            <Sparkles size={11} color="var(--accent-primary)" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: "var(--space-6)", alignItems: "start" }}>
        {/* Chat / Diagnostic Feed */}
        <div className="card" style={{ height: "680px", display: "flex", flexDirection: "column" }}>
          {/* Header bar */}
          <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-elevated)", borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--accent-primary-alpha)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)" }}>
                <Bot size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "var(--text-caption)", color: "var(--text-primary)" }}>LogPilot Autonomous Troubleshooter</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Trace-backed root cause synthesis & runbook generation</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "11px", color: "var(--status-success)" }}>
              <ShieldCheck size={14} /> Zero Execution Sandbox Active
            </div>
          </div>

          {/* Conversation Area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {messages.map((m) => (
              <div
                key={m.id}
                className="animate-slide-up"
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: m.role === "user" ? "75%" : "95%",
                  display: "flex",
                  gap: "var(--space-3)",
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    backgroundColor: m.role === "user" ? "var(--bg-hover)" : "var(--accent-primary-alpha)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.role === "user" ? "var(--text-primary)" : "var(--accent-primary)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {m.role === "user" ? <Terminal size={14} /> : <Bot size={16} />}
                </div>

                {/* Message Body */}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", minWidth: 0 }}>
                  <div
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: m.role === "user" ? "var(--accent-primary)" : "var(--bg-elevated)",
                      color: m.role === "user" ? "#FFFFFF" : "var(--text-primary)",
                      fontSize: "var(--text-caption)",
                      lineHeight: 1.6,
                      border: m.role === "user" ? "none" : "1px solid var(--border-subtle)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {m.content}
                  </div>

                  {/* Rich Metadata Card if Assistant */}
                  {m.meta && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-1)" }}>
                      {/* Expandable Thinking Process */}
                      {m.meta.thinking && m.meta.thinking.length > 0 && (
                        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-surface)", overflow: "hidden" }}>
                          <button
                            type="button"
                            onClick={() => toggleThinking(m.id)}
                            style={{
                              width: "100%",
                              padding: "var(--space-2) var(--space-3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              color: "var(--text-secondary)",
                              backgroundColor: "var(--bg-hover)",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Sparkles size={12} color="var(--accent-secondary)" />
                              Thinking & Correlation Steps ({m.meta.thinking.length} stages)
                            </span>
                            {expandedThinking[m.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                          {expandedThinking[m.id] && (
                            <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "11.5px", color: "var(--text-secondary)", borderTop: "1px solid var(--border-subtle)" }}>
                              {m.meta.thinking.map((th, i) => (
                                <div key={i} style={{ display: "flex", gap: "6px" }}>
                                  <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>0{i + 1}.</span>
                                  <span>{th}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Diagnostic Confidence Score Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Confidence Score:</span>
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>
                            {m.meta.confidence}% High Confidence
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {m.meta.affectedServices?.map((svc) => (
                            <span key={svc} className="format-pill" style={{ color: "var(--accent-primary)" }}>
                              {svc}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Evidence Citations */}
                      {m.meta.evidence && m.meta.evidence.length > 0 && (
                        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase" }}>
                            Correlated Trace Evidence
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {m.meta.evidence.map((ev, i) => (
                              <div
                                key={i}
                                style={{
                                  backgroundColor: "var(--bg-primary)",
                                  padding: "var(--space-2) var(--space-3)",
                                  borderRadius: "var(--radius-xs)",
                                  borderLeft: `3px solid ${ev.severity === "CRITICAL" ? "var(--status-critical)" : "var(--status-error)"}`,
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "11px",
                                  color: "var(--text-secondary)",
                                  wordBreak: "break-all",
                                }}
                              >
                                {ev.line}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Remediation Runbook Proposal */}
                      {m.meta.remediation && m.meta.remediation.length > 0 && (
                        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--status-success)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle2 size={13} /> Recommended Action Runbook (Human Approval Required)
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleCopy(m.meta.remediation.join("\n"), `rem-${m.id}`)}
                            >
                              {copiedId === `rem-${m.id}` ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                              <span>{copiedId === `rem-${m.id}` ? "Copied" : "Copy Runbook"}</span>
                            </button>
                          </div>
                          <ol style={{ paddingLeft: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "12px", color: "var(--text-primary)" }}>
                            {m.meta.remediation.map((step, i) => (
                              <li key={i} style={{ lineHeight: 1.5 }}>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "var(--accent-primary-alpha)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)" }}>
                  <Bot size={16} />
                </div>
                <div style={{ padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-lg)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-caption)", color: "var(--text-secondary)" }}>
                  <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--accent-primary)" }} />
                  Correlating trace graphs and synthesizing root cause hypothesis...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputVal);
            }}
            style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", display: "flex", gap: "var(--space-2)", borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)" }}
          >
            <input
              type="text"
              placeholder="Ask about error spikes, database timeouts, or canary rollbacks..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isAnalyzing}
              style={{
                flex: 1,
                height: "38px",
                padding: "0 var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--text-caption)",
              }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!inputVal.trim() || isAnalyzing}>
              <Send size={14} /> Send
            </button>
          </form>
        </div>

        {/* Right Sidebar: Contextual Inspector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Active Incident Snapshot */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--status-critical)", textTransform: "uppercase" }}>
                Active Incident Context
              </span>
              <span className="badge badge-error">INC-101</span>
            </div>
            <h4 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
              PostgreSQL Connection Pool Saturated
            </h4>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "var(--space-3)" }}>
              Cascading connection checkout timeouts propagating from <code>order-service</code> to <code>api-gateway</code>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Root Node:</span>
                <span className="code-font" style={{ color: "var(--text-primary)" }}>db-primary.internal:5432</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Trace ID:</span>
                <span className="code-font" style={{ color: "var(--accent-primary)" }}>b223-1109-ee74</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Duration:</span>
                <span className="tabular-nums">19m 22s</span>
              </div>
            </div>
          </Card>

          {/* Microservice Topology Flow */}
          <Card>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "var(--space-3)" }}>
              Causal Propagation Map
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Server size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>api-gateway</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: "10px" }}>HTTP 504</span>
              </div>
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>↓</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Activity size={14} color="var(--status-warning)" />
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>order-service</span>
                </div>
                <span className="badge badge-error" style={{ fontSize: "10px" }}>Timeout</span>
              </div>
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>↓</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) var(--space-3)", backgroundColor: "rgba(168, 85, 247, 0.1)", borderRadius: "var(--radius-sm)", border: "1px solid var(--status-critical)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Database size={14} color="var(--status-critical)" />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--status-critical)" }}>db-primary</span>
                </div>
                <span className="badge badge-error" style={{ fontSize: "10px", backgroundColor: "var(--status-critical)" }}>ROOT CAUSE</span>
              </div>
            </div>
          </Card>

          {/* Security Guardrails Guarantee */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--status-success)", marginBottom: "var(--space-2)" }}>
              <ShieldCheck size={16} /> Autonomous Safety Policy
            </div>
            <ul style={{ paddingLeft: "var(--space-4)", display: "flex", flexDirection: "column", gap: "6px", fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <li>Read-only diagnostic reasoning sandbox.</li>
              <li>Arbitrary shell execution strictly prohibited.</li>
              <li>Human approval required before any playbook action.</li>
              <li>All tokens, JWTs, and passwords masked at ingestion.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
