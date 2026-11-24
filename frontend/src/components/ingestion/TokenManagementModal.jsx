import React, { useState, useEffect, useCallback } from "react";
import { Key, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { ingestionTokenService } from "../../services/ingestionTokenService";

export default function TokenManagementModal({
  isOpen,
  onClose,
  source,
  onTokenGenerated,
}) {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // New token form state
  const [isCreating, setIsCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);

  const fetchTokens = useCallback(async () => {
    if (!source) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ingestionTokenService.listTokens(source.id);
      setTokens(data || []);
    } catch (err) {
      setError(err.message || "Failed to load tokens.");
    } finally {
      setIsLoading(false);
    }
  }, [source]);

  useEffect(() => {
    if (isOpen) {
      fetchTokens();
      setIsCreating(false);
      setNewTokenName("");
    }
  }, [isOpen, fetchTokens]);

  if (!isOpen || !source) return null;

  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    try {
      const created = await ingestionTokenService.createToken(source.id, {
        name: newTokenName.trim(),
        expiresInDays: expiresInDays > 0 ? Number(expiresInDays) : null,
      });
      setIsCreating(false);
      setNewTokenName("");
      fetchTokens();
      if (onTokenGenerated) {
        onTokenGenerated(created, source.name);
      }
    } catch (err) {
      setError(err.message || "Failed to create token.");
    }
  };

  const handleRotate = async (token) => {
    if (!window.confirm(`Rotate token '${token.name}'? The old token will be immediately revoked.`)) {
      return;
    }
    try {
      const rotated = await ingestionTokenService.rotateToken(source.id, token.id);
      fetchTokens();
      if (onTokenGenerated) {
        onTokenGenerated(rotated, source.name);
      }
    } catch (err) {
      setError(err.message || "Failed to rotate token.");
    }
  };

  const handleRevoke = async (token) => {
    if (!window.confirm(`Revoke token '${token.name}'? Any pipelines using this token will be rejected.`)) {
      return;
    }
    try {
      await ingestionTokenService.revokeToken(source.id, token.id);
      fetchTokens();
    } catch (err) {
      setError(err.message || "Failed to revoke token.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "680px",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-xl)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={onClose}
          style={{ position: "absolute", right: "16px", top: "16px" }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
            }}
          >
            <Key size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Ingestion Tokens
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Manage authenticated API credentials for <strong style={{ color: "var(--text-primary)" }}>{source.name}</strong> ({source.service_name})
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid var(--status-error)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              fontSize: "12px",
              color: "var(--status-error)",
            }}
          >
            {error}
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Active Credentials ({tokens.filter((t) => t.is_active).length})
          </span>
          {!isCreating && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCreating(true)}
              style={{ gap: "6px" }}
            >
              <Plus size={14} /> Generate Token
            </button>
          )}
        </div>

        {/* Create Token Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateToken}
            style={{
              backgroundColor: "var(--bg-elevated)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
              Create New Ingestion Credential
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "var(--space-3)" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Token Name / Label *
                </label>
                <input
                  type="text"
                  required
                  className="input input-sm"
                  placeholder="e.g. Production FluentBit, CI Pipeline"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  className="input input-sm"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "4px" }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-xs">
                Create & Display
              </button>
            </div>
          </form>
        )}

        {/* Tokens List Table */}
        {isLoading ? (
          <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            Loading credentials...
          </div>
        ) : tokens.length === 0 ? (
          <div
            style={{
              padding: "var(--space-8)",
              textAlign: "center",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            No ingestion tokens generated yet. Click &quot;Generate Token&quot; to create an API credential for this source.
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "11px" }}>
                  <th style={{ padding: "8px 12px" }}>Token Name</th>
                  <th style={{ padding: "8px 12px" }}>Prefix</th>
                  <th style={{ padding: "8px 12px" }}>Created</th>
                  <th style={{ padding: "8px 12px" }}>Last Used</th>
                  <th style={{ padding: "8px 12px" }}>Status</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((tok) => (
                  <tr key={tok.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {tok.name}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span className="code-font" style={{ color: "var(--accent-secondary)" }}>
                        {tok.token_prefix}...
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                      {new Date(tok.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                      {tok.last_used_at ? new Date(tok.last_used_at).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {tok.is_active ? (
                        <span className="badge badge-success" style={{ fontSize: "10px", padding: "1px 6px" }}>
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: "10px", padding: "1px 6px" }}>
                          Revoked
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      {tok.is_active && (
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleRotate(tok)}
                            title="Rotate token (revokes old, issues new)"
                            style={{ gap: "4px" }}
                          >
                            <RefreshCw size={11} /> Rotate
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleRevoke(tok)}
                            title="Revoke token"
                            style={{ color: "var(--status-error)", gap: "4px" }}
                          >
                            <Trash2 size={11} /> Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
          <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
