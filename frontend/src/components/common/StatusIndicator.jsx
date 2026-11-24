import React from "react";

export default function StatusIndicator({ status = "active", label = null, className = "" }) {
  const norm = (status || "").toLowerCase();
  let dotClass = "status-dot-connecting";

  if (["active", "online", "healthy", "resolved"].includes(norm)) {
    dotClass = "status-dot-online";
  } else if (["critical", "error", "failed", "offline"].includes(norm)) {
    dotClass = "status-dot-offline";
  } else if (["investigating", "warning", "pending", "paused"].includes(norm)) {
    dotClass = "status-dot-connecting";
  }

  return (
    <div className={`status-indicator ${className}`}>
      <span className={`status-dot ${dotClass}`} />
      <span>{label || status}</span>
    </div>
  );
}
