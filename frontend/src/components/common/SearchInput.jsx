import React from "react";
import { Search, X } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  onClear = null,
  shortcut = null,
  className = "",
  ...props
}) {
  return (
    <div className={`search-input-wrapper ${className}`}>
      <span className="search-input-icon">
        <Search size={14} />
      </span>
      <input
        type="text"
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            if (onClear) onClear();
          }}
          className="btn btn-ghost btn-xs"
          style={{ position: "absolute", right: 6, color: "var(--text-muted)" }}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      ) : shortcut ? (
        <span
          className="kbd-shortcut"
          style={{ position: "absolute", right: 8, pointerEvents: "none" }}
        >
          {shortcut}
        </span>
      ) : null}
    </div>
  );
}
