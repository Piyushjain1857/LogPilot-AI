import React, { useState } from "react";
import { X, Download, ShieldCheck, FileSpreadsheet, FileCode } from "lucide-react";

export default function ExportDialog({
  isOpen,
  onClose,
  onExport,
  totalRecords = 0,
}) {
  const [format, setFormat] = useState("csv");
  const [limit, setLimit] = useState(1000);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsExporting(true);
    try {
      await onExport({ format, limit });
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          padding: "var(--space-6)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Download size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Export Logs</h3>
          </div>
          <button type="button" className="btn btn-ghost btn-xs" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Format Selector */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            Export Format
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <button
              type="button"
              className={`btn ${format === "csv" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFormat("csv")}
              style={{ justifyContent: "center", gap: "var(--space-2)" }}
            >
              <FileSpreadsheet size={16} /> CSV (Spreadsheet)
            </button>
            <button
              type="button"
              className={`btn ${format === "json" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFormat("json")}
              style={{ justifyContent: "center", gap: "var(--space-2)" }}
            >
              <FileCode size={16} /> JSON Document
            </button>
          </div>
        </div>

        {/* Export Row Limit */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            Record Limit (Up to {totalRecords.toLocaleString()} available)
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "13px",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
            }}
          >
            <option value={100}>100 records</option>
            <option value={500}>500 records</option>
            <option value={1000}>1,000 records</option>
            <option value={5000}>5,000 records</option>
            <option value={10000}>10,000 records (maximum)</option>
          </select>
        </div>

        {/* Security Notice */}
        <div
          style={{
            padding: "var(--space-3)",
            backgroundColor: "var(--bg-elevated)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "flex-start",
          }}
        >
          <ShieldCheck size={16} color="var(--status-success)" style={{ marginTop: "2px", flexShrink: 0 }} />
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-secondary)" }}>Formula Injection Defense Active:</strong> All CSV fields starting with <code className="format-pill">=</code>, <code className="format-pill">+</code>, <code className="format-pill">-</code>, or <code className="format-pill">@</code> are sanitized to protect against spreadsheet formula execution. Sensitive credentials remain redacted.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleConfirm}
            disabled={isExporting}
            style={{ gap: "6px" }}
          >
            <Download size={14} />
            {isExporting ? "Generating Export..." : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
