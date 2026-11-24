import React from "react";

export default function SeverityBadge({ severity = "INFO", className = "" }) {
  const normalized = (severity || "").toUpperCase();
  const severityClass = {
    DEBUG: "severity-debug",
    INFO: "severity-info",
    WARNING: "severity-warning",
    ERROR: "severity-error",
    CRITICAL: "severity-critical",
  }[normalized] || "severity-info";

  return (
    <span className={`badge ${severityClass} ${className}`}>
      {normalized}
    </span>
  );
}
