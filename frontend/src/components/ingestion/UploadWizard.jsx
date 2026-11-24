import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import FileDropzone from "./FileDropzone";
import SelectedFileCard from "./SelectedFileCard";
import FieldMappingTable from "./FieldMappingTable";
import LogPreviewTable from "./LogPreviewTable";
import UploadProgressCard from "./UploadProgressCard";
import IngestionSummary from "./IngestionSummary";
import { uploadService } from "../../services/uploadService";
import { logSourceService } from "../../services/logSourceService";
import useUploadPolling from "../../hooks/useUploadPolling";
import { ArrowLeft, ArrowRight, Upload, AlertCircle, ShieldCheck } from "lucide-react";

export default function UploadWizard({
  isOpen,
  onClose,
  initialSourceId = null,
  onIngestionComplete,
  onExploreLogs,
  onViewErrors,
}) {
  // Wizard steps: 1: Select Files, 2: Configure Source, 3: Preview & Mapping, 4: Confirm & Ingestion
  const [step, setStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState(initialSourceId || "");
  const [defaultServiceName, setDefaultServiceName] = useState("");
  const [isCreatingNewSource, setIsCreatingNewSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");

  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});

  // Ingestion & Polling state
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [uploadStage, setUploadStage] = useState("idle"); // 'idle' | 'uploading' | 'processing' | 'done' | 'failed'
  const [uploadPercent, setUploadPercent] = useState(0);
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  const { batchData, cancelBatch, isCancelling } = useUploadPolling(
    activeBatchId,
    1500
  );

  // Load existing log sources
  useEffect(() => {
    if (!isOpen) return;
    logSourceService
      .listSources()
      .then((data) => {
        setSources(data || []);
        if (data.length > 0 && !selectedSourceId) {
          setSelectedSourceId(data[0].id);
          setDefaultServiceName(data[0].service_name || "unknown-service");
        }
      })
      .catch((err) => {
        console.error("Failed to load log sources:", err);
      });
  }, [isOpen, selectedSourceId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedFiles([]);
      setPreviewData(null);
      setFieldMappings({});
      setUploadStage("idle");
      setUploadPercent(0);
      setActiveBatchId(null);
      setGeneralError(null);
      setConfirmDuplicate(false);
    }
  }, [isOpen]);

  // Synchronize batch status changes
  useEffect(() => {
    if (batchData) {
      if (["COMPLETED", "PARTIAL_SUCCESS"].includes(batchData.status)) {
        setUploadStage("done");
        if (onIngestionComplete) onIngestionComplete(batchData);
      } else if (["FAILED", "CANCELLED"].includes(batchData.status)) {
        setUploadStage("failed");
      } else if (batchData.status === "PROCESSING") {
        setUploadStage("processing");
      }
    }
  }, [batchData, onIngestionComplete]);

  // Load file preview when advancing to Step 3
  const loadPreview = async (file) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const data = await uploadService.previewFile(file, { field_mappings: fieldMappings });
      setPreviewData(data);
      // Pre-fill autodetected mappings if not already set
      if (data.suggested_mappings && Object.keys(fieldMappings).length === 0) {
        setFieldMappings(data.suggested_mappings);
      }
    } catch (err) {
      setPreviewError(err.details || err.message || "Failed to generate log preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (selectedFiles.length === 0) {
        setGeneralError("Please select at least one log file to continue.");
        return;
      }
      setGeneralError(null);
      setStep(2);
    } else if (step === 2) {
      // Create new source if toggled
      if (isCreatingNewSource) {
        if (!newSourceName.trim()) {
          setGeneralError("Please enter a name for the new log source.");
          return;
        }
        try {
          const created = await logSourceService.createSource({
            name: newSourceName.trim(),
            service_name: newSourceName.trim().toLowerCase().replace(/\s+/g, "-"),
            source_type: "file",
          });
          setSources((prev) => [...prev, created]);
          setSelectedSourceId(created.id);
          setDefaultServiceName(created.service_name);
          setIsCreatingNewSource(false);
        } catch (err) {
          setGeneralError(err.details || err.message || "Failed to create source.");
          return;
        }
      } else if (!selectedSourceId) {
        setGeneralError("Please select an active log source.");
        return;
      }
      setGeneralError(null);
      setStep(3);
      if (selectedFiles.length > 0) {
        loadPreview(selectedFiles[0]);
      }
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleStartIngestion = async () => {
    if (selectedFiles.length === 0 || !selectedSourceId) return;

    setUploadStage("uploading");
    setUploadPercent(0);
    setGeneralError(null);

    const primaryFile = selectedFiles[0];
    const formData = new FormData();
    formData.append("file", primaryFile);
    formData.append("source_id", selectedSourceId);
    if (defaultServiceName) {
      formData.append("default_service", defaultServiceName);
    }
    if (Object.keys(fieldMappings).length > 0) {
      formData.append("field_mappings", JSON.stringify(fieldMappings));
    }
    formData.append("confirm_duplicate", confirmDuplicate ? "true" : "false");

    try {
      const result = await uploadService.createUploadBatch(
        formData,
        (percent) => {
          setUploadPercent(percent);
          if (percent >= 100) {
            setUploadStage("processing");
          }
        }
      );
      setActiveBatchId(result.id);
    } catch (err) {
      setUploadStage("failed");
      setGeneralError(err.details || err.message || "Upload request failed.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={uploadStage === "uploading" || uploadStage === "processing" ? () => {} : onClose}
      title="Log File Ingestion Wizard"
      maxWidth="780px"
    >
      <div>
        {/* Step indicator header */}
        <div className="wizard-steps">
          <div className={`wizard-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}>
            <div className="wizard-step-number">{step > 1 ? "✓" : "1"}</div>
            <span>Select Files</span>
          </div>
          <div className="wizard-step-connector" />
          <div className={`wizard-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>
            <div className="wizard-step-number">{step > 2 ? "✓" : "2"}</div>
            <span>Configure Source</span>
          </div>
          <div className="wizard-step-connector" />
          <div className={`wizard-step ${step === 3 ? "active" : step > 3 ? "completed" : ""}`}>
            <div className="wizard-step-number">{step > 3 ? "✓" : "3"}</div>
            <span>Preview & Mapping</span>
          </div>
          <div className="wizard-step-connector" />
          <div className={`wizard-step ${step === 4 ? "active" : ""}`}>
            <div className="wizard-step-number">4</div>
            <span>Confirm & Import</span>
          </div>
        </div>

        <div style={{ padding: "var(--space-5)" }}>
          {generalError && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3)", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "var(--radius-md)", color: "var(--status-error)", fontSize: "var(--text-caption)", marginBottom: "var(--space-4)" }}>
              <AlertCircle size={16} />
              <span>{generalError}</span>
            </div>
          )}

          {/* STEP 1: Select Files */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <FileDropzone
                onFilesSelected={(newFiles) => setSelectedFiles(newFiles)}
                maxFiles={5}
              />
              {selectedFiles.length > 0 && (
                <div className="selected-files-container">
                  <div style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-primary)" }}>
                    Selected File ({selectedFiles.length})
                  </div>
                  {selectedFiles.map((f, i) => (
                    <SelectedFileCard
                      key={i}
                      file={f}
                      onRemove={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Configure Source */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)" }}>
                Assign uploaded telemetry to an existing system source or create a new logical service boundary.
              </div>

              {!isCreatingNewSource ? (
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-caption)", fontWeight: 600, marginBottom: "4px" }}>
                    Select Target Log Source *
                  </label>
                  <select
                    value={selectedSourceId}
                    onChange={(e) => {
                      setSelectedSourceId(e.target.value);
                      const s = sources.find((src) => src.id === e.target.value);
                      if (s) setDefaultServiceName(s.service_name);
                    }}
                    style={{ width: "100%", height: "38px", padding: "0 var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "var(--text-body)" }}
                  >
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.service_name || s.source_type})
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: "var(--space-2)" }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setIsCreatingNewSource(true)}
                    >
                      + Or create a new log source
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "var(--space-4)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-caption)" }}>New Log Source</div>
                  <div>
                    <label style={{ display: "block", fontSize: "var(--text-micro)", color: "var(--text-secondary)", marginBottom: "2px" }}>
                      Source Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Auth Service Cluster"
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      style={{ width: "100%", height: "34px", padding: "0 var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "var(--text-caption)" }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setIsCreatingNewSource(false)}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Cancel, use existing source
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "var(--text-caption)", fontWeight: 600, marginBottom: "4px" }}>
                  Default Service Name Fallback
                </label>
                <input
                  type="text"
                  value={defaultServiceName}
                  onChange={(e) => setDefaultServiceName(e.target.value)}
                  placeholder="e.g. backend-api"
                  style={{ width: "100%", height: "36px", padding: "0 var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
                <span style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)" }}>
                  Used when individual log lines do not contain an explicit service tag or bracketed prefix.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Mapping */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {isLoadingPreview && (
                <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-secondary)" }}>
                  Parsing and redacting log sample...
                </div>
              )}

              {previewError && (
                <div style={{ padding: "var(--space-3)", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-md)", color: "var(--status-error)", fontSize: "var(--text-caption)" }}>
                  {previewError}
                </div>
              )}

              {!isLoadingPreview && previewData && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)" }}>
                      Format: <strong>{previewData.file_format}</strong> • Showing first {previewData.sample_records?.length || 0} extracted records
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "var(--text-micro)", color: "var(--status-success)" }}>
                      <ShieldCheck size={14} /> Secret redaction active
                    </div>
                  </div>

                  {["CSV", "JSON"].includes(previewData.file_format) && (
                    <div>
                      <div style={{ fontSize: "var(--text-caption)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
                        Column Mapping Configuration
                      </div>
                      <FieldMappingTable
                        availableColumns={previewData.detected_columns || []}
                        mappings={fieldMappings}
                        onChangeMapping={(targetKey, srcCol) =>
                          setFieldMappings((prev) => ({ ...prev, [targetKey]: srcCol }))
                        }
                        sampleRecord={previewData.sample_records?.[0] || {}}
                      />
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: "var(--text-caption)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
                      Parsed & Redacted Records Preview
                    </div>
                    <LogPreviewTable
                      records={previewData.sample_records || []}
                      redactionApplied={previewData.redaction_applied}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 4: Confirm & Ingestion */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {uploadStage === "idle" && (
                <>
                  <div style={{ padding: "var(--space-4)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
                    <h4 style={{ fontSize: "var(--text-card-title)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
                      Ready to Ingest Log File
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-caption)" }}>
                      <div>File: <strong>{selectedFiles[0]?.name}</strong> ({(selectedFiles[0]?.size / 1024).toFixed(1)} KB)</div>
                      <div>Target Source: <strong>{sources.find((s) => s.id === selectedSourceId)?.name || "Default"}</strong></div>
                      <div>Default Service: <span className="code-font">{defaultServiceName || "unknown-service"}</span></div>
                    </div>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", fontSize: "var(--text-caption)" }}>
                    <input
                      type="checkbox"
                      checked={confirmDuplicate}
                      onChange={(e) => setConfirmDuplicate(e.target.checked)}
                    />
                    <span>Allow re-ingestion if this exact file (SHA-256) was previously processed</span>
                  </label>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep(3)}>
                      <ArrowLeft size={14} /> Back to Preview
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleStartIngestion}>
                      <Upload size={14} /> Start Ingestion
                    </button>
                  </div>
                </>
              )}

              {(uploadStage === "uploading" || uploadStage === "processing") && (
                <UploadProgressCard
                  stage={uploadStage}
                  uploadPercent={uploadPercent}
                  batchData={batchData}
                  onCancel={cancelBatch}
                  isCancelling={isCancelling}
                />
              )}

              {uploadStage === "done" && (
                <IngestionSummary
                  batchData={batchData}
                  onExploreLogs={() => {
                    onClose();
                    if (onExploreLogs) onExploreLogs(batchData);
                  }}
                  onUploadAnother={() => {
                    setStep(1);
                    setSelectedFiles([]);
                    setUploadStage("idle");
                    setActiveBatchId(null);
                  }}
                  onViewErrors={() => {
                    if (onViewErrors) onViewErrors(batchData);
                  }}
                />
              )}

              {uploadStage === "failed" && (
                <div style={{ padding: "var(--space-4)", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                  <div style={{ fontWeight: 600, color: "var(--status-error)", marginBottom: "var(--space-2)" }}>
                    Ingestion Aborted
                  </div>
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--text-primary)" }}>
                    {generalError || batchData?.error_summary || "Processing failed due to a validation or file integrity error."}
                  </p>
                  <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUploadStage("idle")}>
                      Try Again
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons for steps 1-3 */}
          {step < 4 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
              {step > 1 ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleNext}
                disabled={step === 1 && selectedFiles.length === 0}
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
