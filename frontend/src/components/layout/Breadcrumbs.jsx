import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const ROUTE_LABELS = {
  app: "Overview",
  "live-logs": "Live Logs",
  "log-sources": "Log Sources",
  "log-explorer": "Log Explorer",
  anomalies: "Anomaly Detection",
  incidents: "Incidents",
  "root-cause": "Root Cause Analysis",
  troubleshooter: "AI Troubleshooter",
  remediation: "Remediation Playbooks",
  reports: "Reports",
  settings: "Settings",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  if (pathnames.length === 0) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/" className="breadcrumbs-item">
        LogPilot AI
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[segment] || segment;

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight size={14} className="breadcrumbs-separator" />
            {isLast ? (
              <span className="breadcrumbs-item active" aria-current="page">
                {label}
              </span>
            ) : (
              <Link to={routeTo} className="breadcrumbs-item">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
