import React from "react";
import Tooltip from "./Tooltip";

export default function ConnectionStatusIndicator({ status = "connecting", latency = null }) {
  // Status: "online" | "offline" | "connecting"
  const getLabel = () => {
    switch (status) {
      case "online":
        return latency ? `Connected (${latency})` : "Backend Online";
      case "offline":
        return "Backend Offline";
      case "connecting":
      default:
        return "Checking Connection...";
    }
  };

  const dotClass =
    status === "online"
      ? "status-dot-online"
      : status === "offline"
      ? "status-dot-offline"
      : "status-dot-connecting";

  return (
    <Tooltip text={status === "online" ? "FastAPI Backend is reachable" : "Backend connection failed"}>
      <div className="status-indicator">
        <span className={`status-dot ${dotClass}`} />
        <span>{getLabel()}</span>
      </div>
    </Tooltip>
  );
}
