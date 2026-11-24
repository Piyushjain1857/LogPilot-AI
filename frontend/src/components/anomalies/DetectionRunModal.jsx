import React, { useState } from "react";
import { X, Play, RefreshCw, CheckCircle2 } from "lucide-react";

export default function DetectionRunModal({
  isOpen,
  onClose,
  onRunDetection,
  services = [],
}) {
  const [timeRange, setTimeRange] = useState("2h");
  const [windowMinutes, setWindowMinutes] = useState(5);
  const [algorithm, setAlgorithm] = useState("ALL");
  const [selectedService, setSelectedService] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);
    setRunResult(null);

    const now = new Date();
    let hours = 2;
    if (timeRange === "30m") hours = 0.5;
    else if (timeRange === "1h") hours = 1;
    else if (timeRange === "6h") hours = 6;
    else if (timeRange === "24h") hours = 24;

    const startTime = new Date(now.getTime() - hours * 3600 * 1000).toISOString();
    const endTime = now.toISOString();

    try {
      const payload = {
        start_time: startTime,
        end_time: endTime,
        window_minutes: Number(windowMinutes),
        algorithm,
        service_name: selectedService || undefined,
      };

      const result = await onRunDetection(payload);
      setRunResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Detection execution failed.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-4)",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "var(--bg-card)",
          padding: 0,
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Play size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
              Execute Anomaly Detection
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={onClose}
            style={{ borderRadius: "50%", width: 28, height: 28, padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && (
            <div
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "var(--severity-error)",
                fontSize: "12px",
              }}
            >
              {error}
            </div>
          )}

          {runResult && (
            <div
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "var(--status-success)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                Detection Completed! Analyzed <strong>{runResult.total_windows_analyzed}</strong> windows, detected{" "}
                <strong>{runResult.anomalies_detected}</strong> anomalies.
              </span>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
              Time Range to Analyze
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: "13px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
            >
              <option value="30m">Last 30 Minutes</option>
              <option value="1h">Last 1 Hour</option>
              <option value="2h">Last 2 Hours</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                Window Size
              </label>
              <select
                value={windowMinutes}
                onChange={(e) => setWindowMinutes(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                }}
              >
                <option value={1}>1 Minute</option>
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={60}>1 Hour</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                Algorithm
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="ALL">All Algorithms (Ensemble)</option>
                <option value="Z_SCORE">Z-Score (Gaussian StdDev)</option>
                <option value="MAD">MAD (Median Absolute Dev)</option>
                <option value="EWMA">EWMA (Drift / Moving Avg)</option>
                <option value="ISOLATION_FOREST">Isolation Forest (Multivariate ML)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
              Target Service (Optional)
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: "13px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">All Services</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              marginTop: "var(--space-2)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-3)",
            }}
          >
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isRunning}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isRunning} style={{ gap: "6px" }}>
              {isRunning ? <RefreshCw size={14} className="spinning" /> : <Play size={14} />}
              {isRunning ? "Running Analysis..." : "Run Detection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
