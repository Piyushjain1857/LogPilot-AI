import React from "react";
import { RefreshCw } from "lucide-react";

export default function StreamingConnectionBadge({ status, onReconnect }) {
  if (status === "CONNECTED") {
    return (
      <div
        className="badge badge-success"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          fontWeight: 600,
          fontSize: "12px",
        }}
      >
        <span
          className="pulse-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: "var(--status-success)",
          }}
        />
        <span>LIVE</span>
      </div>
    );
  }

  if (status === "CONNECTING" || status === "RECONNECTING") {
    return (
      <div
        className="badge badge-warning"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          fontWeight: 600,
          fontSize: "12px",
        }}
      >
        <RefreshCw size={12} className="spinning" />
        <span>{status === "RECONNECTING" ? "Reconnecting..." : "Connecting..."}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
      <div
        className="badge badge-neutral"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          fontWeight: 500,
          fontSize: "12px",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: "var(--text-muted)",
          }}
        />
        <span>Offline</span>
      </div>
      {onReconnect && (
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={onReconnect}
          style={{ gap: "4px" }}
        >
          <RefreshCw size={11} /> Reconnect
        </button>
      )}
    </div>
  );
}
