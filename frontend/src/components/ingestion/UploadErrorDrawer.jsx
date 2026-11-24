import React, { useEffect, useState } from "react";
import Drawer from "../common/Drawer";
import { uploadService } from "../../services/uploadService";
import { Loader2 } from "lucide-react";

export default function UploadErrorDrawer({
  isOpen,
  onClose,
  batchId,
  filename,
}) {
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!isOpen || !batchId) return;

    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    uploadService
      .getBatchErrors(batchId)
      .then((data) => {
        if (isMounted) {
          setErrors(data.errors || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFetchError(err.message || "Failed to load batch errors.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, batchId]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Ingestion Errors — ${filename || "Batch"}`}
      width="480px"
    >
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-8)" }}>
            <Loader2 className="spin" size={24} color="var(--accent-primary)" />
          </div>
        )}

        {fetchError && (
          <div style={{ color: "var(--status-error)", fontSize: "var(--text-caption)" }}>
            {fetchError}
          </div>
        )}

        {!isLoading && !fetchError && errors.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "var(--space-6)" }}>
            No granular parsing errors were recorded for this batch.
          </div>
        )}

        {!isLoading && errors.length > 0 && (
          <div className="error-list">
            {errors.map((err, idx) => (
              <div key={idx} className="error-item">
                <div className="error-item-header">
                  <span>Line #{err.line_number ?? "N/A"}</span>
                  <span style={{ fontSize: "11px", textTransform: "uppercase" }}>{err.error_type || "Parse Error"}</span>
                </div>
                <div style={{ marginBottom: "var(--space-2)", color: "var(--text-primary)" }}>
                  {err.reason || err.message || "Malformed record"}
                </div>
                {err.raw_excerpt && (
                  <div className="error-item-raw">
                    {err.raw_excerpt}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
