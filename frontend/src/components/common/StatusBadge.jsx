import React from "react";

export default function StatusBadge({ status = "healthy", label = null, className = "" }) {
  const norm = (status || "").toLowerCase();
  const dotClass = `status-badge-dot-${norm}`;

  return (
    <span className={`status-badge ${className}`}>
      <span className={`status-badge-dot ${dotClass}`} />
      <span>{label || status}</span>
    </span>
  );
}
