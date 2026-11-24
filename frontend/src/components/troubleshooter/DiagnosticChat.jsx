import React, { useState } from "react";
import { Send, Bot, User, CheckCircle2 } from "lucide-react";

export default function DiagnosticChat({
  investigationId,
  incidentId,
  onSendMessage,
  loading,
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "I am LogPilot AI Troubleshooter. I have access to verified log evidence, distributed trace spans, and anomaly models. How can I assist with your investigation?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input.trim();
    setInput("");
    const newHistory = [...messages, { role: "user", text: userText }];
    setMessages(newHistory);
    setSending(true);

    try {
      const res = await onSendMessage({
        investigationId,
        incidentId,
        message: userText,
        history: messages,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.response || "No response received.",
          citations: res.evidence_citations || [],
        },
      ]);
    } catch (err) {
      console.error("Diagnostic chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Encountered an issue communicating with diagnostic agent. Please verify service connection.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        height: "460px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
        <Bot size={16} color="var(--accent-primary)" />
        <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
          Grounded Diagnostic Chat
        </h4>
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
        {messages.map((m, idx) => {
          const isUser = m.role === "user";

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                justifyContent: isUser ? "flex-end" : "flex-start",
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot size={13} />
                </div>
              )}

              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: isUser ? "var(--accent-primary)" : "var(--bg-secondary)",
                  color: isUser ? "#ffffff" : "var(--text-primary)",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  border: isUser ? "none" : "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

                {m.citations && m.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: "6px",
                      paddingTop: "6px",
                      borderTop: "1px solid var(--border-subtle)",
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <CheckCircle2 size={11} color="var(--severity-success)" />
                    <span>Grounded in {m.citations.length} verified log citations</span>
                  </div>
                )}
              </div>

              {isUser && (
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User size={13} />
                </div>
              )}
            </div>
          );
        })}

        {(sending || loading) && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
            <Bot size={13} className="animate-spin" />
            <span>Consulting log evidence and trace graphs...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <input
          type="text"
          className="form-control"
          placeholder="Ask diagnostic questions (e.g., Why did checkout-service fail?)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || loading}
          style={{ flex: 1, fontSize: "12px" }}
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={sending || loading || !input.trim()}
          style={{ gap: "4px" }}
        >
          <Send size={12} />
          Send
        </button>
      </form>
    </div>
  );
}
