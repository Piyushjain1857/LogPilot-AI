import React, { useRef, useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";
import useFileValidation from "../../hooks/useFileValidation";

export default function FileDropzone({
  onFilesSelected,
  maxFiles = 5,
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { validateFiles, validationErrors, supportedExtensions } = useFileValidation();

  const handleFiles = (incomingFileList) => {
    if (disabled || !incomingFileList || incomingFileList.length === 0) return;

    const fileArray = Array.from(incomingFileList).slice(0, maxFiles);
    const { validFiles } = validateFiles(fileArray);

    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleBrowseClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        className={`dropzone ${isDragOver ? "dropzone-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        aria-label="Upload log files"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".log,.txt,.csv,.json,.jsonl,.ndjson"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="dropzone-icon">
          <UploadCloud size={24} />
        </div>
        <div>
          <h4 className="dropzone-title">Drop your log files here, or browse</h4>
          <p className="dropzone-subtitle">
            Supported formats: Plain text .log / .txt, Structured CSV, JSON objects/arrays, and JSON Lines (.jsonl / .ndjson). Up to {maxFiles} files, max 25 MB per file.
          </p>
        </div>
        <div className="dropzone-formats">
          {supportedExtensions.map((ext) => (
            <span key={ext} className="format-pill">{ext}</span>
          ))}
        </div>
      </div>

      {validationErrors && validationErrors.length > 0 && (
        <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {validationErrors.map((err, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "var(--radius-sm)",
                color: "var(--status-error)",
                fontSize: "var(--text-caption)",
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
