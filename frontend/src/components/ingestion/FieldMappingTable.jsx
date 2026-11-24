import React from "react";

const TARGET_FIELDS = [
  { key: "timestamp", label: "Timestamp", required: false, description: "Log event occurrence time" },
  { key: "severity", label: "Severity / Level", required: false, description: "INFO, WARN, ERROR, CRITICAL, DEBUG" },
  { key: "service_name", label: "Service Name", required: false, description: "Microservice or application identifier" },
  { key: "message", label: "Message / Body", required: true, description: "Log text or payload content" },
  { key: "trace_id", label: "Trace ID", required: false, description: "Distributed tracing identifier" },
  { key: "span_id", label: "Span ID", required: false, description: "Trace span identifier" },
];

export default function FieldMappingTable({
  availableColumns = [],
  mappings = {},
  onChangeMapping,
  sampleRecord = {},
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="field-mapping-table">
        <thead>
          <tr>
            <th>Target Field</th>
            <th>Required</th>
            <th>Source Column in File</th>
            <th>Sample Value</th>
          </tr>
        </thead>
        <tbody>
          {TARGET_FIELDS.map((field) => {
            const currentSource = mappings[field.key] || "";
            const sampleVal = sampleRecord[currentSource] ?? "—";

            return (
              <tr key={field.key}>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{field.label}</div>
                  <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)" }}>
                    {field.description}
                  </div>
                </td>
                <td>
                  {field.required ? (
                    <span className="badge badge-error" style={{ fontSize: "10px" }}>Required</span>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: "10px" }}>Optional</span>
                  )}
                </td>
                <td style={{ minWidth: "180px" }}>
                  <select
                    className="field-mapping-select"
                    value={currentSource}
                    onChange={(e) => onChangeMapping(field.key, e.target.value)}
                    aria-label={`Map source column for ${field.label}`}
                  >
                    <option value="">-- Do Not Map --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span className="code-font" style={{ color: "var(--text-secondary)", fontSize: "var(--text-caption)" }}>
                    {typeof sampleVal === "object" ? JSON.stringify(sampleVal) : String(sampleVal)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
