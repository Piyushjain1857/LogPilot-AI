import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function RootCausePage() {
  return (
    <FeaturePlaceholder
      title="Root Cause Analysis"
      phase="Phase 3"
      description="Trace correlation and dependency graph analysis highlighting cascading failure origins across microservices."
      plannedFeatures={[
        "Interactive topology failure flow graph using React Flow",
        "Trace ID co-occurrence and latency propagation tree",
        "Probable origin score calculated from dependency depth",
        "Correlated deployment and configuration change events",
      ]}
    />
  );
}
