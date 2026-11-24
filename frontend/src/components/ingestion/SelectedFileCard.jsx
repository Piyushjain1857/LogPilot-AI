import React from "react";
import { FileText, Trash2, CheckCircle2 } from "lucide-react";

export default function SelectedFileCard({
  file,
  onRemove,
  format,
  isValid = true,
}) {
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const detectedExt = file.name.split(".").pop().toUpperCase();

  return (
    <div className="selected-file-card">
      <div className="selected-file-info">
        <FileText size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="selected-file-name" title={file.name}>
            {file.name}
          </div>
          <div className="selected-file-meta">
            <span className="format-pill">{format || detectedExt}</span>
            <span>•</span>
            <span className="tabular-nums">{formatBytes(file.size)}</span>
            {isValid && (
              <>
                <span>•</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", color: "var(--status-success)" }}>
                  <CheckCircle2 size={12} /> Valid
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onRemove(file)}
          title="Remove file"
          aria-label={`Remove file ${file.name}`}
        >
          <Trash2 size={15} color="var(--text-muted)" />
        </button>
      )}
    </div>
  );
}
