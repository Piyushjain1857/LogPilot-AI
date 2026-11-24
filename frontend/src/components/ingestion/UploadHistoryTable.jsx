import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Ban, Loader2, Eye, AlertOctagon } from "lucide-react";

export default function UploadHistoryTable({
  batches = [],
  isLoading = false,
  onViewLogs,
  onViewErrors,
  onCancelBatch,
}) {
  const renderStatus = (status) => {
    switch (status) {
      case "COMPLETED":
        return <span className="badge badge-success"><CheckCircle2 size={12} /> Completed</span>;
      case "PARTIAL_SUCCESS":
        return <span className="badge badge-warning"><AlertTriangle size={12} /> Partial</span>;
      case "FAILED":
        return <span className="badge badge-error"><XCircle size={12} /> Failed</span>;
      case "CANCELLED":
        return <span className="badge badge-neutral"><Ban size={12} /> Cancelled</span>;
      case "PROCESSING":
        return <span className="badge badge-info"><Loader2 size={12} className="spin" /> Processing</span>;
      default:
        return <span className="badge badge-neutral"><Loader2 size={12} className="spin" /> Pending</span>;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-8)" }}>
        <Loader2 className="spin" size={24} color="var(--accent-primary)" />
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-secondary)" }}>
        No upload batches recorded yet. Upload a log file to start ingesting telemetry.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-caption)", textAlign: "left" }}>
        <thead>
          <tr style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
            <th style={{ padding: "var(--space-2) var(--space-3)" }}>File Name</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "70px" }}>Format</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "80px" }}>Size</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "110px" }}>Status</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "100px" }}>Ingested</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "90px" }}>Errors</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "90px" }}>Redacted</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "150px" }}>Created</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "140px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr
              key={batch.id}
              style={{
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <td style={{ padding: "var(--space-2) var(--space-3)", fontWeight: 500, color: "var(--text-primary)" }}>
                {batch.original_filename}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                <span className="format-pill">{batch.file_format}</span>
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontVariantNumeric: "tabular-nums" }}>
                {formatSize(batch.file_size_bytes)}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                {renderStatus(batch.status)}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--status-success)" }}>
                {batch.successful_records?.toLocaleString() ?? 0}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontVariantNumeric: "tabular-nums", color: batch.failed_records > 0 ? "var(--status-error)" : "var(--text-muted)" }}>
                {batch.failed_records ?? 0}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontVariantNumeric: "tabular-nums", color: batch.redacted_records > 0 ? "var(--status-warning)" : "var(--text-muted)" }}>
                {batch.redacted_records ?? 0}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                {batch.created_at ? new Date(batch.created_at).toLocaleString() : "—"}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", textAlign: "right" }}>
                <div style={{ display: "inline-flex", gap: "4px" }}>
                  {batch.status === "PROCESSING" && onCancelBatch && (
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => onCancelBatch(batch.id)}
                      title="Cancel Ingestion"
                    >
                      Cancel
                    </button>
                  )}
                  {batch.failed_records > 0 && onViewErrors && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onViewErrors(batch)}
                      title="View Errors"
                    >
                      <AlertOctagon size={13} color="var(--status-error)" />
                    </button>
                  )}
                  {batch.successful_records > 0 && onViewLogs && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => onViewLogs(batch)}
                      title="Explore Logs"
                    >
                      <Eye size={13} />
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
