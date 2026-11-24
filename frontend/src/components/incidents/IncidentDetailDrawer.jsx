import React, { useState } from "react";
import SeverityBadge from "../common/SeverityBadge";
import {
  X,
  Clock,
  Send,
  MessageSquare,
  Activity,
  Layers,
  ShieldCheck,
} from "lucide-react";

export default function IncidentDetailDrawer({
  incident,
  loading: _loading,
  onClose,
  onUpdateStatus,
  onAddNote,
}) {
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  if (!incident) return null;

  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value;
    try {
      setStatusUpdating(true);
      await onUpdateStatus(incident.id, nextStatus);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setSubmittingNote(true);
      await onAddNote(incident.id, newNote.trim());
      setNewNote("");
    } finally {
      setSubmittingNote(false);
    }
  };

  const getTimelineIcon = (eventType) => {
    switch (eventType) {
      case "ANOMALY_DETECTED":
        return <Activity size={12} color="var(--severity-error)" />;
      case "CLUSTER_SPIKE":
        return <Layers size={12} color="var(--severity-warning)" />;
      case "STATUS_CHANGED":
        return <ShieldCheck size={12} color="var(--accent-primary)" />;
      case "NOTE_ADDED":
        return <MessageSquare size={12} color="var(--text-secondary)" />;
      default:
        return <Clock size={12} color="var(--text-muted)" />;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(680px, 92vw)",
        backgroundColor: "var(--bg-card)",
        borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.25)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              className="code-font"
              style={{
                fontWeight: 700,
                fontSize: "12px",
                color: "var(--accent-primary)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                padding: "2px 8px",
                borderRadius: "4px",
              }}
            >
              {incident.incident_number || incident.id.substring(0, 8)}
            </span>
            <SeverityBadge severity={incident.severity} />
            <select
              className="form-control"
              value={incident.status}
              disabled={statusUpdating}
              onChange={handleStatusChange}
              style={{
                padding: "2px 8px",
                fontSize: "11px",
                height: "24px",
                width: "auto",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="mitigated">Mitigated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {incident.title}
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onClose}
          style={{ padding: "6px" }}
          aria-label="Close Incident Drawer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Blast Radius & Primary Service */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Blast Radius & Service Impact
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              padding: "12px",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {(incident.affected_services || [incident.primary_service || "system"]).map((svc, idx) => {
              const isPrimary = svc === incident.primary_service;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    backgroundColor: isPrimary ? "rgba(239, 68, 68, 0.15)" : "var(--bg-card)",
                    border: `1px solid ${isPrimary ? "rgba(239, 68, 68, 0.3)" : "var(--border-subtle)"}`,
                    borderRadius: "4px",
                  }}
                >
                  <span
                    className="code-font"
                    style={{
                      fontSize: "12px",
                      fontWeight: isPrimary ? 700 : 500,
                      color: isPrimary ? "var(--severity-error)" : "var(--text-primary)",
                    }}
                  >
                    {svc}
                  </span>
                  {isPrimary && (
                    <span style={{ fontSize: "10px", color: "var(--severity-error)", fontWeight: 700 }}>
                      [ORIGIN]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Root Cause Hypothesis */}
        {incident.root_cause_hypothesis && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Initial Root Cause Hypothesis
            </h3>
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                lineHeight: "1.5",
                color: "var(--text-primary)",
              }}
            >
              {incident.root_cause_hypothesis}
            </div>
          </div>
        )}

        {/* Chronological Incident Timeline */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
              Chronological Incident Timeline
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              {(incident.timeline_events || []).length} events recorded
            </span>
          </div>

          <div style={{ position: "relative", paddingLeft: "20px" }}>
            {/* Vertical timeline line */}
            <div
              style={{
                position: "absolute",
                left: "7px",
                top: "4px",
                bottom: "10px",
                width: "2px",
                backgroundColor: "var(--border-subtle)",
              }}
            />

            {(incident.timeline_events || []).map((ev, idx) => {
              const evDate = new Date(ev.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    marginBottom: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {/* Dot icon */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-20px",
                      top: "2px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-card)",
                      border: "2px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {getTimelineIcon(ev.event_type)}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="code-font" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {evDate}
                    </span>
                    {ev.service && (
                      <span
                        className="code-font"
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--text-secondary)",
                          padding: "1px 5px",
                          borderRadius: "3px",
                        }}
                      >
                        {ev.service}
                      </span>
                    )}
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>
                      {ev.event_type}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.4 }}>
                    {ev.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evidence Logs Drill-down */}
        {incident.sample_logs && incident.sample_logs.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Correlated Forensic Evidence Logs ({incident.sample_logs.length})
            </h3>
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                overflow: "hidden",
              }}
            >
              {incident.sample_logs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  style={{
                    padding: "8px 12px",
                    borderBottom: idx < incident.sample_logs.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <SeverityBadge severity={log.severity} />
                    <span style={{ color: "var(--text-muted)" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>{log.service}</span>
                    {log.trace_id && <span style={{ color: "var(--text-muted)" }}>[{log.trace_id}]</span>}
                  </div>
                  <div style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Operator Note */}
        <div>
          <h3 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Add Operator Note
          </h3>
          <form onSubmit={handleNoteSubmit} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Record diagnostic finding or remediation step..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={submittingNote}
              style={{ flex: 1, fontSize: "12px" }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submittingNote || !newNote.trim()}
              style={{ gap: "4px" }}
            >
              <Send size={12} />
              Post Note
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
