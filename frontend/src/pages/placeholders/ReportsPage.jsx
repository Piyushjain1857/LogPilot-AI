import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function ReportsPage() {
  return (
    <FeaturePlaceholder
      title="Incident & Audit Reports"
      phase="Phase 4"
      description="Executive post-mortem summaries, SLA impact metrics, and compliance audit exports."
      plannedFeatures={[
        "Automated post-mortem Markdown and PDF export",
        "Mean Time to Detect (MTTD) & Mean Time to Resolve (MTTR) trends",
        "Sensitive data redaction compliance verification logs",
        "Service reliability grading scorecard",
      ]}
    />
  );
}
