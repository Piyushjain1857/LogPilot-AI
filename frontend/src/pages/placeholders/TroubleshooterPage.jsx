import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Bot, Send, Info } from "lucide-react";

export default function TroubleshooterPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am LogPilot AI Troubleshooter. I analyze correlated log traces, stack traces, and system events to infer root causes and suggest mitigations. How can I assist you with current incidents?",
    },
  ]);
  const [inputVal, setInputVal] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    // Truthful message response explaining Gemini status
    const userMsg = { role: "user", content: inputVal };
    const agentMsg = {
      role: "assistant",
      content: "Gemini AI Agent integration is scheduled for Phase 4. To enable live inference, provide your GEMINI_API_KEY in backend/.env. No arbitrary commands will be executed without human confirmation.",
    };
    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setInputVal("");
  };

  return (
    <div>
      <PageHeader
        title="AI Troubleshooter"
        description="Autonomous diagnostic agent driven by Google Gen AI SDK (Gemini) synthesizing contextual traces."
        badge={<Badge variant="warning" icon={Bot}>Gemini Core (Phase 4)</Badge>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--card-gap)" }}>
        {/* Chat / Conversation Area */}
        <Card title="Diagnostic Agent Console" style={{ minHeight: 480, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: m.role === "user" ? "var(--accent-primary)" : "var(--bg-elevated)",
                  color: m.role === "user" ? "#FFFFFF" : "var(--text-primary)",
                  fontSize: "var(--text-body-sm)",
                  lineHeight: 1.6,
                }}
              >
                {m.content}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Ask the troubleshooter about incident traces or service anomalies..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <Button type="submit" variant="primary" icon={Send}>
              Send
            </Button>
          </form>
        </Card>

        {/* Security & Context Panel */}
        <Card title="Agent Operating Context & Guardrails">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}>
              <Info size={18} style={{ color: "var(--accent-primary)", marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                <strong>Zero Command Execution Guard:</strong> The AI agent operates in a read-only reasoning sandbox.
                It produces structured recommendations and evidence citations without executing arbitrary shell or database operations.
              </div>
            </div>

            <div style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
              Suggested Diagnostic Prompts:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {[
                "Why did checkout-service fail after canary release v2.4.1?",
                "Analyze the correlation between PostgreSQL pool exhaustion and Stripe timeouts.",
                "Generate a step-by-step mitigation plan for order-service database connection leaks.",
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-secondary btn-xs"
                  style={{ textAlign: "left", whiteSpace: "normal", height: "auto", padding: "6px 10px" }}
                  onClick={() => setInputVal(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
