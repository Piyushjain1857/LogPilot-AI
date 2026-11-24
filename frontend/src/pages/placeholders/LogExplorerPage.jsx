import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function LogExplorerPage() {
  return (
    <FeaturePlaceholder
      title="Log Explorer"
      phase="Phase 2"
      description="Advanced query engine and multi-facet log search across historical SQLite records."
      plannedFeatures={[
        "Time-range picker with relative presets (15m, 1h, 24h, 7d)",
        "Faceted filtering by service name, severity, trace ID, and host",
        "Full-text fuzzy keyword and exact-match search",
        "Column selector and raw JSON metadata inspector",
      ]}
    />
  );
}
