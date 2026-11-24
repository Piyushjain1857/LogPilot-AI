import React from "react";
import { Play, Pause, RotateCcw, ArrowDown } from "lucide-react";

export default function StreamToolbar({
  isPaused,
  pendingCount,
  onPause,
  onResume,
  onClear,
  autoScroll,
  onToggleAutoScroll,
  onJumpToLatest,
  showJumpButton,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "var(--space-3)",
      }}
    >
      {/* Left controls: Pause/Resume + Buffered count */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {isPaused ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onResume}
            style={{ gap: "6px" }}
          >
            <Play size={14} /> Resume Stream
            {pendingCount > 0 && (
              <span
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                +{pendingCount}
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onPause}
            style={{ gap: "6px" }}
          >
            <Pause size={14} /> Pause Stream
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClear}
          title="Clear visible logs from browser buffer (does not delete from database)"
          style={{ gap: "6px" }}
        >
          <RotateCcw size={14} /> Clear View
        </button>
      </div>

      {/* Right controls: Auto-scroll toggle and Jump to Latest */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        {showJumpButton && (
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={onJumpToLatest}
            style={{ gap: "4px", backgroundColor: "var(--accent-primary-alpha)", borderColor: "var(--accent-primary)" }}
          >
            <ArrowDown size={12} color="var(--accent-primary)" /> Jump to Latest
          </button>
        )}

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "var(--text-caption)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => onToggleAutoScroll(e.target.checked)}
            style={{ cursor: "pointer", accentColor: "var(--accent-primary)" }}
          />
          Auto-Scroll
        </label>
      </div>
    </div>
  );
}
