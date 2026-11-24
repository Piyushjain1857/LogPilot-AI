import React from "react";
import Badge from "../common/Badge";
import SkeletonLoader from "../common/SkeletonLoader";
import { CheckCircle2, Clock } from "lucide-react";

const CAPABILITY_LABELS = {
  log_file_ingestion: "Log File Ingestion",
  real_time_streaming: "Real-time Log Streaming",
  log_parsing: "Drain3 Log Parsing",
  severity_classification: "Severity Classification",
  anomaly_detection: "Statistical Anomaly Detection",
  log_clustering: "Error Template Clustering",
  incident_management: "Incident Management & Tracking",
  root_cause_correlation: "Cross-Service Root Cause Correlation",
  ai_troubleshooting: "Gemini AI Autonomous Troubleshooter",
  remediation_playbooks: "Remediation Playbook Generation",
  report_generation: "Executive Incident Reports",
};

export default function CapabilitiesGrid({ capabilities = {}, loading = false }) {
  if (loading) {
    return (
      <div className="capabilities-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="capability-card">
            <SkeletonLoader width="140px" height="16px" />
            <SkeletonLoader width="60px" height="20px" borderRadius="10px" />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(capabilities);

  return (
    <div className="capabilities-grid">
      {entries.map(([key, status]) => {
        const isImplemented = status === "implemented";
        const label = CAPABILITY_LABELS[key] || key.replace(/_/g, " ");

        return (
          <div key={key} className="capability-card">
            <span className="capability-name">{label}</span>
            <Badge
              variant={isImplemented ? "success" : "default"}
              icon={isImplemented ? CheckCircle2 : Clock}
            >
              {isImplemented ? "Implemented" : "Planned"}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
