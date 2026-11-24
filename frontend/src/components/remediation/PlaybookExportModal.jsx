import React, { useState, useEffect } from "react";
import { Copy, Check, Download, X, FileCode } from "lucide-react";
import { remediationService } from "../../services/remediationService";

export default function PlaybookExportModal({ playbook, isOpen, onClose }) {
  const [format, setFormat] = useState("yaml");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !playbook) return;
    let isMounted = true;
    setLoading(true);

    remediationService
      .exportPlaybook(playbook.id || playbook.playbook_number, format)
      .then((data) => {
        if (isMounted) setContent(typeof data === "string" ? data : JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        if (isMounted) setContent(`# Failed to export playbook:\n# ${err.message}`);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, playbook, format]);

  if (!isOpen || !playbook) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === "shell" ? "sh" : "yaml";
    const filename = `runbook-${playbook.slug || playbook.playbook_number || "playbook"}.${ext}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
        zIndex: 9999,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-surface)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <FileCode size={20} color="var(--accent-primary)" />
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                Export Runbook Automation
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {playbook.playbook_number} — {playbook.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            padding: "var(--space-3) var(--space-5)",
            borderBottom: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${format === "yaml" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFormat("yaml")}
          >
            Kubernetes YAML
          </button>
          <button
            type="button"
            className={`btn btn-sm ${format === "ansible" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFormat("ansible")}
          >
            Ansible Playbook
          </button>
          <button
            type="button"
            className={`btn btn-sm ${format === "shell" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFormat("shell")}
          >
            Bash Runbook Script
          </button>
        </div>

        {/* Content Preview */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-4) var(--space-5)",
            backgroundColor: "#0D1117",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "13px",
            color: "#E6EDF3",
            lineHeight: 1.6,
            minHeight: "260px",
          }}
        >
          {loading ? (
            <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
              Generating automation manifest...
            </div>
          ) : (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {content}
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Format: {format.toUpperCase()}
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopy}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy Code"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Download size={14} /> Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
