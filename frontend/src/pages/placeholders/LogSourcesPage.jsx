import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import DataTable from "../../components/common/DataTable";
import CodeBlock from "../../components/common/CodeBlock";
import { Server, Plus, Upload, Radio } from "lucide-react";

export default function LogSourcesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("file");

  // Configured sources list
  const sources = [
    {
      id: "src-1",
      name: "API Gateway Cluster",
      source_type: "HTTP Stream",
      service_name: "api-gateway",
      status: "active",
      health: "healthy",
      last_seen: "2026-11-24 10:00:01",
    },
    {
      id: "src-2",
      name: "Order Processing Service",
      source_type: "Container Log",
      service_name: "order-service",
      status: "active",
      health: "degraded",
      last_seen: "2026-11-24 10:00:28",
    },
    {
      id: "src-3",
      name: "PostgreSQL Database Logs",
      source_type: "Database Log",
      service_name: "db-primary",
      status: "active",
      health: "healthy",
      last_seen: "2026-11-24 10:00:30",
    },
  ];

  const columns = [
    { key: "name", label: "Source Name" },
    { key: "service_name", label: "Service Identifier", render: (v) => <span className="code-font">{v}</span> },
    { key: "source_type", label: "Type", render: (v) => <Badge variant="default">{v}</Badge> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
    { key: "health", label: "Health", render: (v) => <StatusBadge status={v} /> },
    { key: "last_seen", label: "Last Ingested", render: (v) => <span className="code-font" style={{ fontSize: 11 }}>{v}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Log Sources"
        description="Configure and manage telemetry ingestion sources across microservices, files, and agents."
        badge={<Badge variant="primary" icon={Server}>3 Configured</Badge>}
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
            Add Log Source
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={sources}
        totalItems={sources.length}
      />

      {/* Add Source Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Connect New Log Source"
        maxWidth="560px"
      >
        <div style={{ display: "flex", gap: "var(--space-2)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <button
            type="button"
            className={`btn btn-xs ${activeTab === "file" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("file")}
          >
            <Upload size={12} /> File Upload
          </button>
          <button
            type="button"
            className={`btn btn-xs ${activeTab === "api" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("api")}
          >
            <Radio size={12} /> HTTP Webhook
          </button>
          <button
            type="button"
            className={`btn btn-xs ${activeTab === "agent" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("agent")}
          >
            <Server size={12} /> Server Daemon
          </button>
        </div>

        {activeTab === "file" && (
          <div>
            <div
              style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-8) var(--space-4)",
                textAlign: "center",
                backgroundColor: "var(--bg-input)",
                marginBottom: "var(--space-4)",
              }}
            >
              <Upload size={32} style={{ color: "var(--accent-primary)", marginBottom: "var(--space-2)" }} />
              <div style={{ fontWeight: 600, fontSize: "var(--text-body)", color: "var(--text-primary)" }}>
                Drag and drop log files here
              </div>
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginTop: 4 }}>
                Supports Plain Text (.log), JSON Lines (.jsonl), and CSV format up to 25MB.
              </p>
            </div>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)" }}>
              Uploaded logs are sanitized automatically via the built-in <code>SensitiveDataRedactor</code> before storage.
            </p>
          </div>
        )}

        {activeTab === "api" && (
          <div>
            <p style={{ fontSize: "var(--text-body-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
              Stream logs directly to LogPilot AI using the HTTP ingestion endpoint:
            </p>
            <CodeBlock
              language="bash"
              title="HTTP INGESTION CURL"
              code={`curl -X POST http://127.0.0.1:8000/api/v1/ingest/logs \\
  -H "Content-Type: application/json" \\
  -d '{"service": "payment-service", "level": "ERROR", "message": "Connection timeout"}'`}
            />
          </div>
        )}

        {activeTab === "agent" && (
          <div>
            <p style={{ fontSize: "var(--text-body-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
              Run the LogPilot lightweight syslog forwarder daemon on your servers:
            </p>
            <CodeBlock
              language="bash"
              title="DOCKER LOG AGENT"
              code={`docker run -d --name logpilot-agent \\
  -v /var/log:/var/log:ro \\
  -e LOGPILOT_BACKEND="http://127.0.0.1:8000" \\
  logpilot/agent:latest`}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
