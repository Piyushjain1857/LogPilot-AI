import React from "react";
import { Search, X } from "lucide-react";

const SEVERITIES = ["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"];

export default function StreamFilterBar({
  filters,
  onFilterChange,
  matchCount,
  totalCount,
}) {
  const activeSeverities = filters.severities || [];

  const toggleSeverity = (sev) => {
    let next;
    if (activeSeverities.includes(sev)) {
      next = activeSeverities.filter((s) => s !== sev);
    } else {
      next = [...activeSeverities, sev];
    }
    onFilterChange({ severities: next });
  };

  const clearAllFilters = () => {
    onFilterChange({
      severities: [],
      service: "",
      sourceId: "",
      search: "",
    });
  };

  const hasActiveFilters =
    activeSeverities.length > 0 ||
    Boolean(filters.service) ||
    Boolean(filters.search);

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        {/* Severity Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginRight: "4px" }}>
            Severity:
          </span>
          {SEVERITIES.map((sev) => {
            const isSelected = activeSeverities.includes(sev);
            let pillClass = "btn btn-xs ";
            if (isSelected) {
              if (sev === "CRITICAL") pillClass += "btn-primary";
              else if (sev === "ERROR") pillClass += "btn-primary";
              else pillClass += "btn-primary";
            } else {
              pillClass += "btn-secondary";
            }

            return (
              <button
                key={sev}
                type="button"
                className={pillClass}
                onClick={() => toggleSeverity(sev)}
                style={{
                  borderRadius: "var(--radius-full)",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: isSelected ? 700 : 500,
                  opacity: activeSeverities.length === 0 || isSelected ? 1 : 0.6,
                }}
              >
                {sev}
              </button>
            );
          })}
        </div>

        {/* Text Filter Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: "1 1 280px", maxWidth: "420px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="input input-sm"
              placeholder="Filter live logs by message, trace_id, or service..."
              value={filters.search || ""}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              style={{
                paddingLeft: "32px",
                width: "100%",
                fontSize: "12px",
              }}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={clearAllFilters}
              title="Reset all filters"
              style={{ gap: "4px", color: "var(--text-muted)" }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter summary bar */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
        <span>
          Showing <strong style={{ color: "var(--text-primary)" }}>{matchCount}</strong> of{" "}
          <strong>{totalCount}</strong> buffer records
          {hasActiveFilters && " (Filtered view)"}
        </span>
        <span>Display buffer bounded to 2,000 events</span>
      </div>
    </div>
  );
}
