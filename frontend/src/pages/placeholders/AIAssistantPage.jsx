import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { assistantService } from "../../services/assistantService";
import { incidentService } from "../../services/incidentService";
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowRight,
  Code,
  Copy,
  Check,
  Search,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Database,
} from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Show 500 errors in payment-service",
  "What incidents are currently active?",
  "How to mitigate connection pool exhaustion?",
  "Find checkout-service database timeouts",
  "List critical anomalies in inventory-service",
];

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Chat conversation state
  const [messages, setMessages] = useState([
    {
      id: "msg-welcome",
      role: "assistant",
      content:
        "Hello! I am your LogPilot AI SRE Assistant. I have live access to your microservices topology, active incidents, anomaly detectors, and remediation playbooks. Ask me anything or describe a log search in natural language.",
      queryTranslation: null,
      suggestedActions: [
        { label: "View Active Incidents", path: "/app/incidents" },
        { label: "Remediation Playbooks", path: "/app/remediation" },
      ],
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Dedicated NLQ Translator widget state
  const [nlqQuestion, setNlqQuestion] = useState("");
  const [nlqResult, setNlqResult] = useState(null);
  const [nlqLoading, setNlqLoading] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  // Active Incidents Context
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    let mounted = true;
    incidentService.listIncidents({ pageSize: 5 }).then((res) => {
      if (mounted && res?.incidents) setIncidents(res.incidents);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatLoading]);

  // Handle chat message submission
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || chatLoading) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setChatLoading(true);

    try {
      const response = await assistantService.chat({ message: text });
      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: response.reply,
        queryTranslation: response.query_translation || null,
        suggestedActions: response.suggested_actions || [],
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "I encountered an issue communicating with the AI service. " +
          (err?.message || "Please check backend connection."),
        isError: true,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle direct NLQ translation
  const handleTranslateQuery = async (e) => {
    if (e) e.preventDefault();
    if (!nlqQuestion.trim() || nlqLoading) return;
    setNlqLoading(true);
    try {
      const result = await assistantService.translateQuery(nlqQuestion.trim());
      setNlqResult(result);
    } catch (err) {
      console.error("Translation error:", err);
      setNlqResult({
        question: nlqQuestion,
        translated_query: `error OR fail`,
        explanation: "Translation fallback to general error search.",
      });
    } finally {
      setNlqLoading(false);
    }
  };

  const handleRunInExplorer = (query) => {
    if (!query) return;
    navigate(`/app/log-explorer?query=${encodeURIComponent(query)}`);
  };

  const handleCopyQuery = async (query) => {
    if (!query) return;
    await navigator.clipboard.writeText(query);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="AI SRE Assistant & NLQ Translator"
        subtitle="Conversational operational intelligence grounded in live system topology, incidents, and natural language query compilation."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-success">Gemini Grounded</span>
            <span className="badge badge-neutral">LogPilot AST Ready</span>
          </div>
        }
      />

      {/* Main Grid: Interactive Chat (Left) + NLQ Translator & Context (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--space-6)", alignItems: "start" }}>
        {/* Left Column: Chat Console */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: 680, padding: 0, overflow: "hidden" }}>
          {/* Chat Header */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-elevated)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "rgba(14, 165, 233, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={16} color="var(--accent-primary)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>LogPilot Autonomous SRE</div>
                <div style={{ fontSize: 10, color: "var(--status-success)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--status-success)" }} />
                  Operational Telemetry Connected
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() =>
                setMessages([
                  {
                    id: "msg-welcome-reset",
                    role: "assistant",
                    content: "Conversation history cleared. How may I assist you with cluster health or log queries?",
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ])
              }
              title="Clear chat history"
            >
              <RefreshCw size={13} />
              <span>Clear</span>
            </button>
          </div>

          {/* Chat Messages Scrollable Container */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      maxWidth: "85%",
                      flexDirection: isUser ? "row-reverse" : "row",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: isUser ? "var(--bg-elevated)" : "rgba(14, 165, 233, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isUser ? <User size={13} /> : <Bot size={13} color="var(--accent-primary)" />}
                    </div>

                    <div
                      style={{
                        backgroundColor: isUser ? "var(--accent-primary)" : "var(--bg-surface)",
                        color: isUser ? "#fff" : "var(--text-primary)",
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        border: isUser ? "none" : "1px solid var(--border-subtle)",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

                      {/* Attached Query Translation if present */}
                      {msg.queryTranslation && (
                        <div
                          style={{
                            marginTop: "var(--space-3)",
                            padding: "var(--space-2) var(--space-3)",
                            backgroundColor: "var(--bg-elevated)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <Code size={12} />
                            <span>Translated Boolean AST Query:</span>
                          </div>
                          <div
                            className="code-font"
                            style={{
                              fontSize: 12,
                              color: "var(--accent-primary)",
                              fontWeight: 600,
                              marginBottom: 6,
                            }}
                          >
                            {msg.queryTranslation}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleRunInExplorer(msg.queryTranslation)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <Search size={11} />
                            <span>Run in Log Explorer</span>
                          </button>
                        </div>
                      )}

                      {/* Suggested Action buttons */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                          {msg.suggestedActions.map((act, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => {
                                if (act.path) navigate(act.path);
                                else if (act.prompt) handleSendMessage(act.prompt);
                              }}
                              style={{ border: "1px solid var(--border-subtle)", fontSize: 11 }}
                            >
                              <span>{act.label || act.title}</span>
                              <ArrowRight size={11} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, padding: "0 32px" }}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {chatLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "rgba(14, 165, 233, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={13} color="var(--accent-primary)" />
                </div>
                <div
                  style={{
                    padding: "8px 14px",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RefreshCw size={12} className="spin" />
                  <span>Synthesizing response & cross-referencing telemetry...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--bg-elevated)",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: "var(--space-2)",
              overflowX: "auto",
            }}
          >
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => handleSendMessage(prompt)}
                disabled={chatLoading}
                style={{
                  whiteSpace: "nowrap",
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full, 9999px)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <Sparkles size={11} color="var(--accent-primary)" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-surface)",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: "var(--space-2)",
            }}
          >
            <input
              type="text"
              placeholder="Ask SRE Assistant or describe what you want to query..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={chatLoading}
              className="input"
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={chatLoading || !inputMessage.trim()}
              title="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* Right Column: NLQ Translator Studio + Active Grounding Context */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* NLQ Query Translator Card */}
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-3)" }}>
              <Terminal size={17} color="var(--accent-primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Natural Language Query Compiler</h3>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
              Translates plain English developer inquiries into AST-validated Boolean expressions (&quot;service:&lt;name&gt;&quot;, &quot;severity:&lt;level&gt;&quot;, &quot;tokens&quot;).
            </p>

            <form onSubmit={handleTranslateQuery} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <textarea
                placeholder="e.g. Find connection pool errors in auth-service or database timeouts"
                value={nlqQuestion}
                onChange={(e) => setNlqQuestion(e.target.value)}
                rows={3}
                className="input"
                style={{ width: "100%", fontSize: 12, resize: "none" }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={nlqLoading || !nlqQuestion.trim()}
                style={{ width: "100%" }}
              >
                <Code size={14} className={nlqLoading ? "spin" : ""} />
                <span>{nlqLoading ? "Compiling..." : "Translate to LogPilot Query"}</span>
              </button>
            </form>

            {nlqResult && (
              <div
                style={{
                  marginTop: "var(--space-4)",
                  padding: "var(--space-3)",
                  backgroundColor: "var(--bg-elevated)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                  Compiled Syntax:
                </div>
                <div
                  className="code-font"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--accent-primary)",
                    padding: "6px 8px",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--border-subtle)",
                    wordBreak: "break-all",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {nlqResult.translated_query}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                  {nlqResult.explanation}
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => handleRunInExplorer(nlqResult.translated_query)}
                  >
                    <Search size={12} />
                    <span>Open in Log Explorer</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => handleCopyQuery(nlqResult.translated_query)}
                  >
                    {copiedQuery ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                    <span>{copiedQuery ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SRE Knowledge Context Card */}
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-3)" }}>
              <Database size={16} color="var(--status-success)" />
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>Live Grounding Context</h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Active Incidents</span>
                <span className="badge badge-error">{incidents.length} Detected</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Cloud-Native Playbooks</span>
                <span className="badge badge-neutral">6 Pre-Seeded</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Topology Microservices</span>
                <span className="badge badge-success">7 Monitored</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Search AST Grammar</span>
                <span className="badge badge-neutral">FTS5 Enabled</span>
              </div>
            </div>

            <div
              style={{
                marginTop: "var(--space-4)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: 11,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ShieldCheck size={14} color="var(--status-success)" />
              <span>Read-only sandboxed tooling with zero destructive commands.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
