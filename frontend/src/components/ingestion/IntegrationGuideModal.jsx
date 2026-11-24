import React, { useState } from "react";
import { Copy, Check, X, Code } from "lucide-react";
import { API_BASE_URL } from "../../config/constants";

export default function IntegrationGuideModal({
  isOpen,
  onClose,
  source,
}) {
  const [activeTab, setActiveTab] = useState("curl");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !source) return null;

  const serviceSlug = source.service_name || "my-service";
  const serverEndpoint = `${API_BASE_URL}/ingest/logs`;

  const codeSnippets = {
    curl: `curl -X POST ${serverEndpoint} \\
  -H "Authorization: Bearer $LOGPILOT_INGESTION_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "severity": "INFO",
    "service": "${serviceSlug}",
    "message": "User checkout completed successfully",
    "trace_id": "tr-order-8812",
    "metadata": {
      "duration_ms": 145,
      "environment": "production"
    }
  }'`,

    python: `import os
import httpx

token = os.environ.get("LOGPILOT_INGESTION_TOKEN")

payload = {
    "severity": "ERROR",
    "service": "${serviceSlug}",
    "message": "Database query timeout after 5000ms",
    "trace_id": "tr-db-9912",
    "metadata": {"query_id": "qry-101"}
}

response = httpx.post(
    "${serverEndpoint}",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json=payload,
    timeout=10.0
)
print("Ingestion Status:", response.status_code, response.json())`,

    node: `const token = process.env.LOGPILOT_INGESTION_TOKEN;

async function sendLog() {
  const response = await fetch("${serverEndpoint}", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${token}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      severity: "INFO",
      service: "${serviceSlug}",
      message: "Worker job finished processing",
      trace_id: "tr-node-771"
    })
  });

  const receipt = await response.json();
  console.log("Ingestion accepted:", receipt);
}
sendLog();`,

    agent: `# 1. Configure agents/python/agent-config.json
{
  "server_url": "${API_BASE_URL.replace("/api/v1", "")}",
  "token_env": "LOGPILOT_INGESTION_TOKEN",
  "service_name": "${serviceSlug}",
  "files": [
    { "path": "/var/log/application.log", "start_position": "end" }
  ]
}

# 2. Run the agent
export LOGPILOT_INGESTION_TOKEN="your_token_here"
python agents/python/logpilot_agent.py --config agent-config.json`,

    simulator: `# Run the synthetic microservice simulator for live demonstrations:
export LOGPILOT_SIMULATOR_TOKEN="your_token_here"

# Scenario A: Normal Operations (5 logs/sec)
python simulators/microservice_simulator.py --scenario normal --rate 5 --duration 60

# Scenario B: Cascading Database Failure (10 logs/sec)
python simulators/microservice_simulator.py --scenario database-failure --rate 10 --duration 45`,
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-xl)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={onClose}
          style={{ position: "absolute", right: "16px", top: "16px" }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "rgba(20, 184, 166, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-secondary)",
            }}
          >
            <Code size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Integration Guide
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Targeting source <strong style={{ color: "var(--text-primary)" }}>{source.name}</strong> ({serviceSlug})
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "var(--space-2)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "var(--space-2)" }}>
          {[
            { id: "curl", label: "cURL (REST API)" },
            { id: "python", label: "Python" },
            { id: "node", label: "Node.js" },
            { id: "agent", label: "Collection Agent" },
            { id: "simulator", label: "Synthetic Simulator" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-xs ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Snippet Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Header: <code className="code-font" style={{ color: "var(--accent-primary)" }}>Authorization: Bearer $LOGPILOT_INGESTION_TOKEN</code>
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={copySnippet}
            style={{ gap: "4px" }}
          >
            {copied ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy Code"}
          </button>
        </div>

        {/* Code Box */}
        <pre
          style={{
            backgroundColor: "var(--bg-primary)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-primary)",
            overflowX: "auto",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {codeSnippets[activeTab]}
        </pre>

        {/* Endpoint Notes */}
        <div
          style={{
            backgroundColor: "var(--bg-elevated)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}
        >
          <strong>Delivery Guarantee:</strong> REST and Batch ingestion APIs return HTTP 202 with an ingestion receipt. The background worker applies recursive redaction, Drain3 clustering, and commits records idempotently to the SQLite database before distributing them over WebSockets.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
