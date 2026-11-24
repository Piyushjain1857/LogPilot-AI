import React, { useState, useEffect, useRef } from "react";
import { Search, X, HelpCircle, Bookmark, History } from "lucide-react";

export default function AdvancedSearchBar({
  value,
  onChange,
  onSearch,
  suggestions = [],
  onOpenSaved,
  onOpenHistory,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);
  const containerRef = useRef(null);

  // Close suggestions when clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowSyntaxHelp(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (val) => {
    // Append or replace
    const trimmed = (value || "").trim();
    if (!trimmed) {
      onChange(val);
    } else {
      onChange(`${trimmed} ${val}`);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setIsOpen(false);
      onSearch();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setShowSyntaxHelp(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "4px 8px",
          gap: "var(--space-2)",
          transition: "border-color var(--transition-fast)",
        }}
      >
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder='Filter logs: service:auth AND severity:ERROR OR "timeout" ...'
          style={{
            flex: 1,
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontFamily: "var(--font-mono)",
          }}
        />

        {value && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => setShowSyntaxHelp((prev) => !prev)}
          title="Query Syntax Guide"
        >
          <HelpCircle size={15} color="var(--accent-primary)" />
        </button>

        {onOpenSaved && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onOpenSaved}
            title="Saved Searches"
          >
            <Bookmark size={15} />
          </button>
        )}

        {onOpenHistory && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onOpenHistory}
            title="Recent Search History"
          >
            <History size={15} />
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setIsOpen(false);
            onSearch();
          }}
        >
          Search
        </button>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 100,
            maxHeight: "260px",
            overflowY: "auto",
            padding: "var(--space-2) 0",
          }}
        >
          <div
            style={{
              padding: "4px 12px",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Suggested Filters & Operators
          </div>
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectSuggestion(s.value)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                transition: "background-color var(--transition-fast)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <div>
                <strong style={{ color: "var(--accent-primary)" }}>{s.value}</strong>
                <span style={{ color: "var(--text-secondary)", marginLeft: "8px" }}>
                  {s.label}
                </span>
              </div>
              {s.example && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  e.g. {s.example}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Syntax Guide Popover */}
      {showSyntaxHelp && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: "360px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 110,
            padding: "var(--space-4)",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              Query Syntax Reference
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setShowSyntaxHelp(false)}
            >
              <X size={12} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text-secondary)" }}>
            <div>
              <code className="format-pill">service:auth-service</code> - match service
            </div>
            <div>
              <code className="format-pill">severity:ERROR</code> - match severity level
            </div>
            <div>
              <code className="format-pill">trace_id:trace-001</code> - filter by trace ID
            </div>
            <div>
              <code className="format-pill">&quot;database timeout&quot;</code> - exact phrase
            </div>
            <div>
              <code className="format-pill">AND</code>, <code className="format-pill">OR</code>, <code className="format-pill">NOT</code> - logical operators
            </div>
            <div style={{ marginTop: "6px", borderTop: "1px solid var(--border-subtle)", paddingTop: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Example:</span>
              <pre style={{ margin: "2px 0 0", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent-primary)" }}>
                service:payment AND severity:ERROR AND NOT &quot;cache miss&quot;
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
