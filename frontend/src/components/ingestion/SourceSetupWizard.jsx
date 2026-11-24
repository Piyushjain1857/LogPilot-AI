import React, { useState } from "react";
import { UploadCloud, Radio, Server, Cpu, X, ArrowRight, Check } from "lucide-react";
import { logSourceService } from "../../services/logSourceService";
import { ingestionTokenService } from "../../services/ingestionTokenService";

const SOURCE_TYPES = [
  {
    id: "FILE_UPLOAD",
    title: "Log File Upload",
    desc: "Ingest static .log, .txt, .csv, or .jsonl files with drag-and-drop validation.",
    icon: UploadCloud,
    badge: "Phase 3 Ingestion",
  },
  {
    id: "REST_API",
    title: "REST / HTTP API",
    desc: "Direct JSON log ingestion via POST /api/v1/ingest/logs or batch endpoint.",
    icon: Radio,
    badge: "Phase 5 Real-Time",
  },
  {
    id: "COLLECTION_AGENT",
    title: "Python Collection Agent",
    desc: "Lightweight agent tailing local log files with checkpoint recovery and rotation handling.",
    icon: Server,
    badge: "Phase 5 Standalone",
  },
  {
    id: "SIMULATOR",
    title: "Synthetic Simulator",
    desc: "Live multi-service scenario simulation for load testing and demo walkthroughs.",
    icon: Cpu,
    badge: "Phase 5 Demo Mode",
  },
];

export default function SourceSetupWizard({
  isOpen,
  onClose,
  onSourceCreated,
  onTokenGenerated,
}) {
  const [selectedType, setSelectedType] = useState("REST_API");
  const [name, setName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [generateInitialToken, setGenerateInitialToken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !serviceName.trim()) {
      setError("Source name and service slug are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create log source
      const createdSource = await logSourceService.createSource({
        name: name.trim(),
        service_name: serviceName.trim().toLowerCase(),
        source_type: selectedType,
        description: description.trim() || undefined,
        configuration_json: JSON.stringify({ environment }),
      });

      // 2. If streaming type and token requested, generate token immediately
      if (selectedType !== "FILE_UPLOAD" && generateInitialToken) {
        try {
          const tokenData = await ingestionTokenService.createToken(createdSource.id, {
            name: `${name.trim()} Ingest Token`,
            expiresInDays: 90,
          });
          if (onTokenGenerated) {
            onTokenGenerated(tokenData, createdSource.name);
          }
        } catch (tokenErr) {
          console.warn("Failed to create initial token automatically:", tokenErr);
        }
      }

      if (onSourceCreated) {
        onSourceCreated(createdSource);
      }
      onClose();
    } catch (err) {
      setError(err.details || err.message || "Failed to create log source.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "680px",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-xl)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={onClose}
          style={{ position: "absolute", right: "16px", top: "16px" }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
            Configure New Log Source
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Select an ingestion pipeline architecture and assign metadata.
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid var(--status-error)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              fontSize: "12px",
              color: "var(--status-error)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Source Type Selector Grid */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              1. Choose Ingestion Pipeline Type *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
              {SOURCE_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    style={{
                      border: `1px solid ${isSelected ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                      backgroundColor: isSelected ? "var(--bg-elevated)" : "var(--bg-card)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "var(--space-3)",
                      transition: "border-color var(--transition-fast)",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: isSelected ? "var(--accent-primary-alpha)" : "var(--bg-primary)",
                        color: isSelected ? "var(--accent-primary)" : "var(--text-muted)",
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                          {type.title}
                        </span>
                        {isSelected && <Check size={14} color="var(--accent-primary)" />}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                        {type.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              2. Source Information
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Source Display Name *
                </label>
                <input
                  type="text"
                  required
                  className="input input-sm"
                  placeholder="e.g. Stripe Webhook Gateway"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Microservice Slug (Tag) *
                </label>
                <input
                  type="text"
                  required
                  className="input input-sm"
                  placeholder="e.g. payment-service"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Environment
                </label>
                <select
                  className="input input-sm"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                  <option value="canary">Canary</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="e.g. Cluster node in us-east-1"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {selectedType !== "FILE_UPLOAD" && (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  marginTop: "var(--space-1)",
                }}
              >
                <input
                  type="checkbox"
                  checked={generateInitialToken}
                  onChange={(e) => setGenerateInitialToken(e.target.checked)}
                  style={{ accentColor: "var(--accent-primary)" }}
                />
                Automatically generate an initial Ingestion Bearer Token
              </label>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting} style={{ gap: "6px" }}>
              {isSubmitting ? "Creating..." : "Create Log Source"} <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
