import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function LogSourcesPage() {
  return (
    <FeaturePlaceholder
      title="Log Sources"
      phase="Phase 2"
      description="Configure and manage telemetry ingestion sources across microservices, files, and agents."
      plannedFeatures={[
        "File upload intake (Plain text, JSONL, CSV up to 25MB)",
        "HTTP push endpoint configuration with API tokens",
        "Syslog daemon and Docker container log agent listeners",
        "Active source health checks and ingestion rate meters",
      ]}
    />
  );
}
