import React from "react";

const RANGES = [
  { id: "1h", label: "1H" },
  { id: "6h", label: "6H" },
  { id: "12h", label: "12H" },
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
];

export default function DateRangeSelector({ selected = "24h", onChange, className = "" }) {
  return (
    <div className={`date-range-selector ${className}`} role="group" aria-label="Time range selector">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`date-range-btn ${selected === r.id ? "active" : ""}`}
          onClick={() => onChange(r.id)}
          aria-pressed={selected === r.id}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
