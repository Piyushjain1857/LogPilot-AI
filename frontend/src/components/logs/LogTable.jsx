import React from "react";
import LogRow from "./LogRow";
import SkeletonLoader from "../common/SkeletonLoader";
import EmptyState from "../common/EmptyState";
import { Terminal } from "lucide-react";

export default function LogTable({
  logs = [],
  loading = false,
  emptyTitle = "No log records found",
  emptyDescription = "No logs match the selected filters or time window.",
  className = "",
}) {
  if (loading) {
    return (
      <div className={`log-table-container ${className}`}>
        <div style={{ padding: "var(--space-4)" }}>
          <SkeletonLoader height="32px" style={{ marginBottom: "var(--space-2)" }} />
          <SkeletonLoader height="28px" style={{ marginBottom: "var(--space-2)" }} />
          <SkeletonLoader height="28px" style={{ marginBottom: "var(--space-2)" }} />
          <SkeletonLoader height="28px" />
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={Terminal}
      />
    );
  }

  return (
    <div className={`log-table-container ${className}`}>
      <table className="log-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}><span className="sr-only">Expand</span></th>
            <th style={{ width: 180 }}>Timestamp</th>
            <th style={{ width: 90 }}>Severity</th>
            <th style={{ width: 140 }}>Service</th>
            <th>Message</th>
            <th style={{ width: 130 }}>Trace ID</th>
            <th style={{ width: 44, textAlign: "right" }}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <LogRow key={log.id || idx} log={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
