import React, { useState } from "react";
import { X, Play, Trash2, Plus, Bookmark } from "lucide-react";

export default function SavedSearchesModal({
  isOpen,
  onClose,
  savedSearches = [],
  onSelectSearch,
  onSaveCurrentQuery,
  onDeleteSearch,
  currentQuery = "",
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentQuery.trim()) return;
    onSaveCurrentQuery({
      name: newTitle.trim(),
      query: currentQuery.trim(),
      description: newDesc.trim() || undefined,
    });
    setNewTitle("");
    setNewDesc("");
    setIsAdding(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          padding: "var(--space-6)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Bookmark size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Saved Searches</h3>
          </div>
          <button type="button" className="btn btn-ghost btn-xs" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Save Current Query CTA */}
        {currentQuery && !isAdding && (
          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              <span>Save current query: </span>
              <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {currentQuery}
              </strong>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => setIsAdding(true)}
              style={{ gap: "4px" }}
            >
              <Plus size={12} /> Save Query
            </button>
          </div>
        )}

        {isAdding && (
          <form
            onSubmit={handleSave}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
              padding: "var(--space-3)",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <input
              type="text"
              placeholder="Saved search name (e.g. Critical Auth Timeouts)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              style={{
                padding: "6px 10px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-xs">
                Confirm Save
              </button>
            </div>
          </form>
        )}

        {/* List of saved searches */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {savedSearches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)", fontSize: "13px" }}>
              No saved searches yet. Save frequently used filters for quick access.
            </div>
          ) : (
            savedSearches.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3)",
                  backgroundColor: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent-primary)",
                      marginTop: "2px",
                    }}
                  >
                    {s.query}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {s.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      onSelectSearch(s.query);
                      onClose();
                    }}
                    style={{ gap: "4px" }}
                  >
                    <Play size={11} /> Run
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onDeleteSearch(s.id)}
                    title="Delete saved search"
                  >
                    <Trash2 size={13} color="var(--status-error)" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
