import React, { useState } from "react";
import Modal from "../common/Modal";
import { logSourceService } from "../../services/logSourceService";
import { AlertCircle } from "lucide-react";

export default function LogSourceModal({
  isOpen,
  onClose,
  onSuccess,
  existingSource = null,
}) {
  const [name, setName] = useState(existingSource?.name || "");
  const [serviceName, setServiceName] = useState(existingSource?.service_name || "");
  const [sourceType, setSourceType] = useState(existingSource?.source_type || "file");
  const [description, setDescription] = useState(existingSource?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Source name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        service_name: serviceName.trim() || name.trim().toLowerCase().replace(/\s+/g, "-"),
        source_type: sourceType,
        description: description.trim(),
      };

      let result;
      if (existingSource) {
        result = await logSourceService.updateSource(existingSource.id, payload);
      } else {
        result = await logSourceService.createSource(payload);
      }

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.details || err.message || "Failed to save log source.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingSource ? "Edit Log Source" : "Create New Log Source"}
      maxWidth="480px"
      actions={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : existingSource ? "Update Source" : "Create Source"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "var(--radius-sm)", color: "var(--status-error)", fontSize: "var(--text-caption)" }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
            Source Name *
          </label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production Payment Gateway"
            required
            style={{ width: "100%", height: "36px", padding: "0 var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
            Service Identifier (Slug)
          </label>
          <input
            type="text"
            className="input-field"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="e.g. payment-service"
            style={{ width: "100%", height: "36px", padding: "0 var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
            Source Type
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            style={{ width: "100%", height: "36px", padding: "0 var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" }}
          >
            <option value="file">File Upload (.log, .txt, .csv, .json, .jsonl)</option>
            <option value="api">HTTP Ingestion API</option>
            <option value="agent">Autonomous Syslog Agent</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional purpose or architecture notes..."
            rows={3}
            style={{ width: "100%", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "var(--text-caption)" }}
          />
        </div>
      </form>
    </Modal>
  );
}
