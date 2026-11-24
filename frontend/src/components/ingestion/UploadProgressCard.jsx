import React from "react";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Ban } from "lucide-react";

export default function UploadProgressCard({
  stage, // 'uploading' | 'processing' | 'done' | 'failed'
  uploadPercent = 0,
  batchData = null,
  onCancel,
  isCancelling = false,
}) {
  const status = batchData?.status || (stage === "uploading" ? "UPLOADING" : "PENDING");
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED", "PARTIAL_SUCCESS"].includes(status);

  // Status badge helper
  const renderStatusBadge = () => {
    switch (status) {
      case "COMPLETED":
        return <span className="badge badge-success" style={{ gap: "4px" }}><CheckCircle2 size={12} /> Completed</span>;
      case "PARTIAL_SUCCESS":
        return <span className="badge badge-warning" style={{ gap: "4px" }}><AlertTriangle size={12} /> Partial Success</span>;
      case "FAILED":
        return <span className="badge badge-error" style={{ gap: "4px" }}><XCircle size={12} /> Failed</span>;
      case "CANCELLED":
        return <span className="badge badge-neutral" style={{ gap: "4px" }}><Ban size={12} /> Cancelled</span>;
      case "PROCESSING":
        return <span className="badge badge-info" style={{ gap: "4px" }}><Loader2 size={12} className="spin" /> Processing</span>;
      default:
        return <span className="badge badge-neutral" style={{ gap: "4px" }}><Loader2 size={12} className="spin" /> Uploading</span>;
    }
  };

  // Determine effective progress percentage
  let progressPct = uploadPercent;
  if (status === "PROCESSING" && batchData?.total_records > 0) {
    progressPct = Math.min(100, Math.round((batchData.processed_records / batchData.total_records) * 100));
  } else if (status === "COMPLETED" || status === "PARTIAL_SUCCESS") {
    progressPct = 100;
  }

  return (
    <div className="progress-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ fontSize: "var(--text-card-title)", fontWeight: 600, color: "var(--text-primary)" }}>
            {stage === "uploading" ? "Uploading Log File to Server..." : "Ingesting & Analyzing Log Records..."}
          </h4>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginTop: "2px" }}>
            {batchData?.original_filename || "Streaming raw log content..."}
          </p>
        </div>
        <div>{renderStatusBadge()}</div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-caption)", marginBottom: "var(--space-2)" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            {stage === "uploading" ? `Network upload: ${uploadPercent}%` : `Parsing & redaction: ${batchData?.processed_records || 0} records`}
          </span>
          <span className="tabular-nums" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {progressPct}%
          </span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {batchData && (
        <div className="progress-metrics-grid">
          <div className="metric-box">
            <div className="metric-box-label">Total Ingested</div>
            <div className="metric-box-val">{batchData.successful_records ?? 0}</div>
          </div>
          <div className="metric-box">
            <div className="metric-box-label">Failed Lines</div>
            <div className="metric-box-val" style={{ color: batchData.failed_records > 0 ? "var(--status-error)" : "var(--text-primary)" }}>
              {batchData.failed_records ?? 0}
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-box-label">Secrets Redacted</div>
            <div className="metric-box-val" style={{ color: "var(--status-warning)" }}>
              {batchData.redacted_records ?? 0}
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-box-label">Duration</div>
            <div className="metric-box-val" style={{ fontSize: "var(--text-body)" }}>
              {batchData.duration_ms ? `${(batchData.duration_ms / 1000).toFixed(2)}s` : "—"}
            </div>
          </div>
        </div>
      )}

      {!isTerminal && onCancel && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel Ingestion"}
          </button>
        </div>
      )}
    </div>
  );
}
