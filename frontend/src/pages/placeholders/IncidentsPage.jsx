import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function IncidentsPage() {
  return (
    <FeaturePlaceholder
      title="Incident Management"
      phase="Phase 3"
      description="Automated error grouping into consolidated incidents with lifecycle state tracking and triage."
      plannedFeatures={[
        "Incident state management (Active, Investigating, Mitigated, Resolved, Closed)",
        "Severity escalation matrix based on blast radius",
        "Associated log entries timeline linking directly to trace IDs",
        "Assigned engineer tags and manual incident creation",
      ]}
    />
  );
}
