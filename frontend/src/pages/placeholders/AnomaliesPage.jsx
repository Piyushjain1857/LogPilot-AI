import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function AnomaliesPage() {
  return (
    <FeaturePlaceholder
      title="Anomaly Detection"
      phase="Phase 2"
      description="Statistical and machine learning anomaly detection flagging sudden error rate bursts and latency shifts."
      plannedFeatures={[
        "Moving-window rolling z-score frequency burst detection",
        "Baseline error volume seasonal expectation bounds",
        "Sudden service silent failure detection (zero-traffic drops)",
        "Anomaly score breakdown with timeline charts",
      ]}
    />
  );
}
