import React from "react";
import { Server, Database, Radio, UploadCloud, Edit, Key, Code, Cpu } from "lucide-react";

export default function LogSourceTable({
  sources = [],
  isLoading = false,
  onUploadForSource,
  onEditSource,
  onManageTokens,
  onViewGuide,
}) {
  const getSourceIcon = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("api") || t.includes("rest")) {
      return <Radio size={16} color="var(--accent-secondary)" />;
    }
    if (t.includes("agent")) {
      return <Server size={16} color="var(--accent-primary)" />;
    }
    if (t.includes("sim")) {
      return <Cpu size={16} color="var(--status-warning)" />;
    }
    return <Database size={16} color="var(--accent-primary)" />;
  };

  const renderConnectionBadge = (status, enabled) => {
    if (enabled === false) {
      return <span className="badge badge-error">DISABLED</span>;
    }
    const s = (status || "UNKNOWN").toUpperCase();
    if (s === "ACTIVE") return <span className="badge badge-success">ACTIVE</span>;
    if (s === "IDLE") return <span className="badge badge-neutral">IDLE</span>;
    if (s === "DEGRADED") return <span className="badge badge-warning">DEGRADED</span>;
    if (s === "OFFLINE") return <span className="badge badge-neutral">OFFLINE</span>;
    return <span className="badge badge-neutral">{s}</span>;
  };

  if (isLoading) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading configured log sources...
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-secondary)" }}>
        No log sources configured yet. Add a log source or upload a file to begin.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-caption)", textAlign: "left" }}>
        <thead>
          <tr style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
            <th style={{ padding: "var(--space-2) var(--space-3)" }}>Source Name</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "160px" }}>Service Slug</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "110px" }}>Type</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "100px" }}>Health</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "160px" }}>Last Ingested</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "180px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((src) => (
            <tr
              key={src.id}
              style={{
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {getSourceIcon(src.source_type)}
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{src.name}</div>
                    {src.description && (
                      <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)" }}>{src.description}</div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--accent-primary)" }}>
                {src.service_name || "—"}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                <span className="format-pill">{src.source_type?.toUpperCase() || "FILE"}</span>
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                {renderConnectionBadge(src.connection_status, src.ingestion_enabled)}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                {src.last_ingested_at ? new Date(src.last_ingested_at).toLocaleString() : "Never"}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", textAlign: "right" }}>
                <div style={{ display: "inline-flex", gap: "4px" }}>
                  {onViewGuide && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onViewGuide(src)}
                      title="Integration Guide & Code Snippets"
                      style={{ gap: "4px" }}
                    >
                      <Code size={13} />
                    </button>
                  )}
                  {onManageTokens && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onManageTokens(src)}
                      title="Manage Ingestion Tokens"
                      style={{ gap: "4px" }}
                    >
                      <Key size={13} />
                    </button>
                  )}
                  {onEditSource && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onEditSource(src)}
                      title="Edit Source"
                    >
                      <Edit size={13} />
                    </button>
                  )}
                  {onUploadForSource && (
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => onUploadForSource(src)}
                      title="Upload Log File"
                    >
                      <UploadCloud size={13} /> Upload
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
