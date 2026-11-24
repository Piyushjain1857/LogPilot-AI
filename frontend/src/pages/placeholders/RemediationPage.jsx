import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function RemediationPage() {
  return (
    <FeaturePlaceholder
      title="Remediation Playbooks"
      phase="Phase 4"
      description="Actionable mitigation runbooks generated from diagnosed root causes with human-in-the-loop approvals."
      plannedFeatures={[
        "Step-by-step remediation procedures with risk levels (Low, Medium, High)",
        "Human approval gating (Pending, Approved, Rejected)",
        "Strict allowlist operation matching (no arbitrary bash execution)",
        "Post-remediation verification health checks",
      ]}
    />
  );
}
