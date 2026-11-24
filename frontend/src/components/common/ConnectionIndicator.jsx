import React from "react";
import Tooltip from "./Tooltip";

export default function ConnectionIndicator({ status = "connecting", latencyMs = null }) {
  // States: connecting, connected, disconnected, reconnecting, degraded
  const getDotClass = () => {
    switch (status) {
      case "connected":
        return "connection-dot-connected";
      case "disconnected":
        return "connection-dot-disconnected";
      case "reconnecting":
      case "connecting":
        return "connection-dot-connecting";
      case "degraded":
        return "connection-dot-degraded";
      default:
        return "connection-dot-connecting";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "connected":
        return latencyMs ? `Connected (${latencyMs}ms)` : "Connected";
      case "disconnected":
        return "Disconnected";
      case "reconnecting":
        return "Reconnecting...";
      case "degraded":
        return "Degraded";
      case "connecting":
      default:
        return "Connecting...";
    }
  };

  const tooltipText =
    status === "connected"
      ? `FastAPI backend active (${latencyMs || "<5"}ms latency)`
      : `Backend status: ${status}. Check server logs.`;

  return (
    <Tooltip text={tooltipText}>
      <div className="connection-indicator">
        <span className={`connection-dot ${getDotClass()}`} />
        <span>{getLabel()}</span>
      </div>
    </Tooltip>
  );
}
