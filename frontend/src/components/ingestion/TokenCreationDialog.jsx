import React, { useState } from "react";
import { Key, Copy, Check, AlertTriangle, X } from "lucide-react";

export default function TokenCreationDialog({
  isOpen,
  onClose,
  tokenData,
  sourceName,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !tokenData) return null;

  const handleCopy = () => {
    if (tokenData.token) {
      navigator.clipboard.writeText(tokenData.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        zIndex: 1100,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "540px",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-xl)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
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
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
            }}
          >
            <Key size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Ingestion Token Generated
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Source: <strong style={{ color: "var(--text-primary)" }}>{sourceName || "Log Source"}</strong> ({tokenData.name})
            </p>
          </div>
        </div>

        {/* Important Warning Alert */}
        <div
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            border: "1px solid var(--status-warning)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-4)",
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            fontSize: "12px",
            color: "var(--text-primary)",
          }}
        >
          <AlertTriangle size={18} color="var(--status-warning)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Store this token securely now.</strong> For cybersecurity and privacy protection, this secret token is hashed with SHA-256 and will never be displayed again.
          </div>
        </div>

        {/* Token Box with Copy Button */}
        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Ingestion Bearer Token:
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              marginTop: "4px",
            }}
          >
            <input
              type="text"
              readOnly
              value={tokenData.token || ""}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                flex: 1,
                color: "var(--status-success)",
                fontWeight: 600,
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCopy}
              style={{ gap: "6px", minWidth: "90px" }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Environment Variable Suggestion */}
        <div style={{ fontSize: "11px", color: "var(--text-muted)", backgroundColor: "var(--bg-elevated)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
          <span>Recommended usage in shell or container:</span>
          <pre style={{ margin: "4px 0 0", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            export LOGPILOT_INGESTION_TOKEN=&quot;{tokenData.token}&quot;
          </pre>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
          <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
            Done & Secure Token
          </button>
        </div>
      </div>
    </div>
  );
}
