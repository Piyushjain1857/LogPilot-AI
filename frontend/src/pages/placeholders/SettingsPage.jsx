import React from "react";
import FeaturePlaceholder from "./FeaturePlaceholder";

export default function SettingsPage() {
  return (
    <FeaturePlaceholder
      title="Platform Settings"
      phase="Phase 2"
      description="Configure environment variables, API integration endpoints, and retention policies."
      plannedFeatures={[
        "Gemini API key verification and model selector",
        "Data retention and log truncation intervals",
        "Redaction rule manager with custom regex test bench",
        "CORS and webhook security settings",
      ]}
    />
  );
}
