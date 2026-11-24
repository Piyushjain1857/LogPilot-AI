import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, RotateCcw, AlertCircle } from "lucide-react";

export default function IngestionSummary({
  batchData,
  onExploreLogs,
  onUploadAnother,
  onViewErrors,
}) {
  if (!batchData) return null;

  const isSuccess = batchData.status === "COMPLETED";
  const isPartial = batchData.status === "PARTIAL_SUCCESS";
  const isFailed = batchData.status === "FAILED";

  return (
    <div className="progress-container" style={{ borderLeft: `4px solid ${isSuccess ? "var(--status-success)" : isPartial ? "var(--status-warning)" : "var(--status-error)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        {isSuccess && <CheckCircle2 size={28} color="var(--status-success)" />}
        {isPartial && <AlertTriangle size={28} color="var(--status-warning)" />}
        {isFailed && <XCircle size={28} color="var(--status-error)" />}
        <div>
          <h3 style={{ fontSize: "var(--text-card-title)", fontWeight: 700, color: "var(--text-primary)" }}>
            {isSuccess && "Log File Ingested Successfully"}
            {isPartial && "Ingestion Finished with Warnings / Skipped Records"}
            {isFailed && "Ingestion Failed"}
          </h3>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginTop: "2px" }}>
            File: <strong>{batchData.original_filename}</strong> ({batchData.file_format}) • Size: {(batchData.file_size_bytes / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>

      <div className="progress-metrics-grid">
        <div className="metric-box">
          <div className="metric-box-label">Successful Records</div>
          <div className="metric-box-val" style={{ color: "var(--status-success)" }}>
            {batchData.successful_records?.toLocaleString() ?? 0}
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-box-label">Failed / Skipped</div>
          <div className="metric-box-val" style={{ color: batchData.failed_records > 0 ? "var(--status-error)" : "var(--text-primary)" }}>
            {(batchData.failed_records + (batchData.skipped_records || 0)).toLocaleString()}
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-box-label">Secrets Redacted</div>
          <div className="metric-box-val" style={{ color: "var(--status-warning)" }}>
            {batchData.redacted_records?.toLocaleString() ?? 0}
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-box-label">Processing Time</div>
          <div className="metric-box-val" style={{ fontSize: "var(--text-body)" }}>
            {batchData.duration_ms ? `${(batchData.duration_ms / 1000).toFixed(2)}s` : "< 1s"}
          </div>
        </div>
      </div>

      {batchData.error_summary && (
        <div style={{ padding: "var(--space-3)", backgroundColor: "rgba(239, 68, 68, 0.08)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "var(--text-caption)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "var(--status-error)", marginBottom: "4px" }}>
            <AlertCircle size={14} /> Ingestion Summary Notes:
          </div>
          <div style={{ color: "var(--text-primary)" }}>{batchData.error_summary}</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-2)" }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onUploadAnother}
        >
          <RotateCcw size={14} /> Upload Another File
        </button>

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {batchData.failed_records > 0 && onViewErrors && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onViewErrors}
            >
              View {batchData.failed_records} Ingestion Errors
            </button>
          )}

          {onExploreLogs && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onExploreLogs}
            >
              Explore Ingested Logs <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
