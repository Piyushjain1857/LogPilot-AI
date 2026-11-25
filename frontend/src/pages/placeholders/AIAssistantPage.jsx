import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { assistantService } from "../../services/assistantService";
import { incidentService } from "../../services/incidentService";
import { aiService } from "../../services/aiService";
import { listWebsites } from "../../services/websiteService";
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
  Globe,
  AlertCircle,
  FileCode,
} from "lucide-react";

const CANONICAL_QUESTIONS = [
  "Why is my website down?",
  "Why is my API returning HTTP 500?",
  "What caused this database failure?",
  "Why is my website loading slowly?",
  "Which service is causing the issue?",
  "How can I fix this error?",
  "What changed after my latest deployment?",
  "Generate a solution for this incident.",
];

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);

  // Copilot context filters
  const [websites, setWebsites] = useState([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(() => searchParams.get("siteId") || "");
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Chat conversation state
  const [messages, setMessages] = useState([
    {
      id: "msg-welcome",
      role: "assistant",
      content:
        "Hello! I am your LogPilot AI Copilot & Autonomous SRE. Powered by Google Gemini, I continuously synthesize live website health telemetry, causal trace graphs, client SDK errors, and git revisions to formulate verified root-cause diagnoses.",
      confidence: 0.96,
      suggestedActions: [
        { label: "View Active Incidents", path: "/app/incidents" },
        { label: "Connect Website", path: "/app/websites" },
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

    try {
      if (typeof listWebsites === "function") {
        Promise.resolve(listWebsites())
          .then((res) => {
            if (mounted && Array.isArray(res)) {
              setWebsites(res);
              if (searchParams.get("siteId")) {
                setSelectedWebsiteId(searchParams.get("siteId"));
              }
            }
          })
          .catch(() => {});
      }
    } catch {
      // safe fallback
    }

    const initialQuery = searchParams.get("query");
    if (initialQuery) {
      setInputMessage(initialQuery);
    }

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatLoading]);

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (e) {
      console.warn("Failed to copy text:", e);
    }
  };

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
      const response = await aiService.chatCopilot({
        message: text,
        website_id: selectedWebsiteId || null,
        incident_id: selectedIncidentId || null,
        conversation_id: conversationId,
      });

      if (response?.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: response.reply,
        confidence: response.confidence,
        evidence_citations: response.evidence_citations || [],
        code_snippets: response.code_snippets || [],
        suggestedActions: (response.suggested_actions || []).map((a) => ({ label: a, prompt: a })),
        follow_up_prompts: response.follow_up_prompts || [],
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.warn("Copilot API fallback to assistant service:", err);
      try {
        const fallbackRes = await assistantService.chat({ message: text });
        const assistantMsg = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: fallbackRes.reply,
          queryTranslation: fallbackRes.query_translation || null,
          suggestedActions: fallbackRes.suggested_actions || [],
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (fallbackErr) {
        const errorMsg = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "I encountered an issue communicating with the AI service. " +
            (fallbackErr?.message || "Please check backend connection."),
          isError: true,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
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
    <div className="page-container">
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

          {/* Target Website & Incident Context Bar */}
          <div
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <Globe size={13} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600 }}>Target Website:</span>
              <select
                className="input"
                style={{ padding: "3px 8px", fontSize: 12, height: 28 }}
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
              >
                <option value="">All Monitored Websites</option>
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.url})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <AlertCircle size={13} color="var(--status-warning)" />
              <span style={{ fontWeight: 600 }}>Incident:</span>
              <select
                className="input"
                style={{ padding: "3px 8px", fontSize: 12, height: 28 }}
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
              >
                <option value="">Latest Global Telemetry</option>
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.title} ({inc.severity})
                  </option>
                ))}
              </select>
            </div>
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
                      {/* Confidence Tag */}
                      {msg.confidence !== undefined && msg.confidence !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span
                            className="badge badge-success"
                            style={{ fontSize: 10, padding: "1px 6px", textTransform: "none" }}
                          >
                            <ShieldCheck size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                            {Math.round(msg.confidence * 100)}% Confidence · Grounded
                          </span>
                        </div>
                      )}

                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

                      {/* Verified Evidence Citations */}
                      {msg.evidence_citations && msg.evidence_citations.length > 0 && (
                        <div
                          style={{
                            marginTop: "var(--space-3)",
                            padding: "var(--space-2) var(--space-3)",
                            backgroundColor: "rgba(15, 23, 42, 0.4)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>
                            Verified Telemetry Citations ({msg.evidence_citations.length}):
                          </div>
                          {msg.evidence_citations.map((c, i) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 4, display: "flex", gap: 6, alignItems: "baseline" }}>
                              <span className="code-font" style={{ color: "var(--status-warning)", fontWeight: 600, flexShrink: 0 }}>
                                [{c.evidence_id}]
                              </span>
                              <span style={{ color: "var(--text-secondary)" }}>
                                {c.description || c.sample_data}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Code Snippets & Unified Diffs */}
                      {msg.code_snippets && msg.code_snippets.length > 0 && (
                        <div style={{ marginTop: "var(--space-3)" }}>
                          {msg.code_snippets.map((snip, i) => {
                            const codeId = `snip-${msg.id}-${i}`;
                            const codeText = snip.unified_diff || snip.proposed_code || "";
                            return (
                              <div
                                key={i}
                                style={{
                                  marginTop: 6,
                                  backgroundColor: "var(--bg-elevated)",
                                  borderRadius: "var(--radius-sm)",
                                  border: "1px solid var(--border-subtle)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "4px 8px",
                                    backgroundColor: "rgba(0, 0, 0, 0.25)",
                                    fontSize: 11,
                                  }}
                                >
                                  <span className="code-font" style={{ color: "var(--accent-primary)" }}>
                                    <FileCode size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                                    {snip.file_path || "remediation_patch.diff"}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => copyToClipboard(codeText, codeId)}
                                    style={{ gap: 4, fontSize: 10, padding: "2px 6px" }}
                                  >
                                    {copiedCodeId === codeId ? (
                                      <Check size={11} color="var(--status-success)" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                    <span>{copiedCodeId === codeId ? "Copied" : "Copy Code"}</span>
                                  </button>
                                </div>
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: 8,
                                    fontSize: 11,
                                    fontFamily: "var(--font-mono)",
                                    overflowX: "auto",
                                    color: "var(--text-primary)",
                                    lineHeight: 1.45,
                                  }}
                                >
                                  {codeText}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      )}

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

                      {/* Follow-up Prompts */}
                      {msg.follow_up_prompts && msg.follow_up_prompts.length > 0 && (
                        <div style={{ marginTop: "var(--space-2)", display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {msg.follow_up_prompts.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleSendMessage(p)}
                              style={{
                                border: "1px dashed var(--accent-primary)",
                                fontSize: 10.5,
                                padding: "2px 8px",
                                borderRadius: "var(--radius-full, 9999px)",
                              }}
                            >
                              <Sparkles size={10} color="var(--accent-primary)" style={{ marginRight: 3 }} />
                              <span>{p}</span>
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
            {CANONICAL_QUESTIONS.map((prompt, idx) => (
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
