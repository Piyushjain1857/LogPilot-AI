import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import InvestigationStream from "../../components/troubleshooter/InvestigationStream";
import TroubleshootingReport from "../../components/troubleshooter/TroubleshootingReport";
import DiagnosticChat from "../../components/troubleshooter/DiagnosticChat";
import { troubleshooterService } from "../../services/troubleshooterService";
import { incidentService } from "../../services/incidentService";
import {
  RefreshCw,
  Zap,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Activity,
} from "lucide-react";

export default function TroubleshooterPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [customQuery, setCustomQuery] = useState("");
  const [activeTab, setActiveTab] = useState("REPORT"); // 'REPORT' vs 'CHAT'

  // Investigation result
  const [investigationData, setInvestigationData] = useState(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Fetch recent incidents
  useEffect(() => {
    let mounted = true;
    const fetchIncidents = async () => {
      try {
        const res = await incidentService.listIncidents({ pageSize: 15 });
        if (mounted && res && res.incidents) {
          setIncidents(res.incidents);
          if (res.incidents.length > 0 && !selectedIncidentId) {
            setSelectedIncidentId(res.incidents[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch incidents for troubleshooter:", err);
      }
    };
    fetchIncidents();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run autonomous investigation
  const runInvestigation = useCallback(async (incId, queryText) => {
    setLoading(true);
    setError(null);
    try {
      const data = await troubleshooterService.investigate({
        incidentId: incId || selectedIncidentId || undefined,
        query: queryText || customQuery || undefined,
      });
      setInvestigationData(data);
    } catch (err) {
      console.error("Troubleshooter investigation error:", err);
      setError("Failed to run AI investigation. Please verify backend service connection.");
    } finally {
      setLoading(false);
    }
  }, [selectedIncidentId, customQuery]);

  useEffect(() => {
    runInvestigation();
  }, [runInvestigation]);

  const handleTriggerInvestigation = async () => {
    setInvestigating(true);
    setFeedback(null);
    try {
      await runInvestigation(selectedIncidentId, customQuery);
      setFeedback("Autonomous investigation completed successfully.");
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setInvestigating(false);
    }
  };

  const handleSendChatMessage = async ({ investigationId, incidentId, message, history }) => {
    return troubleshooterService.chat({
      investigationId: investigationId || investigationData?.investigation_id,
      incidentId: incidentId || selectedIncidentId,
      message,
      history,
    });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Gemini AI Troubleshooter & Autonomous Agent"
        description="Autonomous ReAct diagnostic investigation loop, multi-perspective synthesis, and grounded evidence citations"
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => runInvestigation()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleTriggerInvestigation}
              disabled={investigating}
              style={{ gap: "6px" }}
            >
              <Zap size={14} className={investigating ? "animate-spin" : ""} />
              {investigating ? "Investigating..." : "Run AI Investigation"}
            </button>
          </div>
        }
      />

      {/* Control panel: Select Incident or Enter Custom Query */}
      <div
        className="card"
        style={{
          padding: "16px",
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Incident selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 300px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              Target Incident:
            </span>
            <select
              className="form-control"
              value={selectedIncidentId}
              onChange={(e) => {
                setSelectedIncidentId(e.target.value);
                runInvestigation(e.target.value);
              }}
              style={{ fontSize: "12px", flex: 1 }}
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.incident_number || inc.id.substring(0, 8)} — {inc.title}
                </option>
              ))}
              {incidents.length === 0 && <option value="">No incidents available (analyze recent failure window)</option>}
            </select>
          </div>

          {/* Tab switcher: Report vs Interactive Chat */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "REPORT" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveTab("REPORT")}
              style={{ gap: "5px" }}
            >
              <Activity size={13} />
              Diagnostic Report
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "CHAT" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveTab("CHAT")}
              style={{ gap: "5px" }}
            >
              <MessageSquare size={13} />
              Grounded Chat
            </button>
          </div>
        </div>

        {/* Custom prompt/query input */}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Optional custom hypothesis or query (e.g. Investigate HTTP 504 timeouts between payment and Stripe)..."
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            style={{ fontSize: "12px", flex: 1 }}
          />
        </div>
      </div>

      {/* Success / Error Feedback */}
      {feedback && (
        <div
          style={{
            margin: "0 0 16px 0",
            padding: "10px 14px",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--severity-success)",
            fontSize: "13px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            margin: "0 0 16px 0",
            padding: "10px 14px",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "var(--severity-error)",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* ReAct Thought Stream Panel */}
      {investigationData?.thought_steps && (
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Sparkles size={16} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              Autonomous ReAct Diagnostic Thought Stream ({investigationData.thought_steps.length} steps)
            </h3>
          </div>

          <InvestigationStream thoughtSteps={investigationData.thought_steps} />
        </div>
      )}

      {/* Main Tab Area */}
      {activeTab === "REPORT" ? (
        <TroubleshootingReport report={investigationData} />
      ) : (
        <DiagnosticChat
          investigationId={investigationData?.investigation_id}
          incidentId={selectedIncidentId}
          onSendMessage={handleSendChatMessage}
          loading={investigating}
        />
      )}
    </div>
  );
}
