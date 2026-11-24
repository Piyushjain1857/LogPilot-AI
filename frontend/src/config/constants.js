export const APP_NAME = "LogPilot AI";
export const APP_TAGLINE = "Detect. Diagnose. Resolve.";
export const HACKATHON_TRACK = "Tech Fusion 4.0 — Enterprise & Industry (PS-01A)";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://127.0.0.1:8000";

export const SEVERITY_LEVELS = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
};

export const SEVERITY_COLORS = {
  DEBUG: "var(--severity-debug)",
  INFO: "var(--severity-info)",
  WARNING: "var(--severity-warning)",
  ERROR: "var(--severity-error)",
  CRITICAL: "var(--severity-critical)",
};
