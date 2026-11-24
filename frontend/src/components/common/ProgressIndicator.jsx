import React from "react";

export default function ProgressIndicator({
  value = 0,
  max = 100,
  label = null,
  color = "var(--accent-primary)",
  height = 6,
  className = "",
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={className} style={{ width: "100%" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-micro)", color: "var(--text-muted)", marginBottom: 4 }}>
          <span>{label}</span>
          <span className="tabular-nums">{percentage}%</span>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height,
          backgroundColor: "var(--bg-elevated)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: color,
            transition: "width var(--transition-normal)",
          }}
        />
      </div>
    </div>
  );
}
