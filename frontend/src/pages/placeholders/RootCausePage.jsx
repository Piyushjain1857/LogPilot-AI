import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import CausalGraphFlow from "../../components/rootcause/CausalGraphFlow";
import HypothesisRankingList from "../../components/rootcause/HypothesisRankingList";
import EvidenceDrawer from "../../components/rootcause/EvidenceDrawer";
import { rootCauseService } from "../../services/rootCauseService";
import { incidentService } from "../../services/incidentService";
import {
  GitBranch,
  RefreshCw,
  Zap,
  Flame,
  CheckCircle2,
  Share2,
} from "lucide-react";

export default function RootCausePage() {
  // Incident selection
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [lookbackMinutes, setLookbackMinutes] = useState(60);

  // View mode: 'CAUSAL_GRAPH' vs 'GLOBAL_TOPOLOGY'
  const [viewMode, setViewMode] = useState("CAUSAL_GRAPH");

  // Analysis result
  const [analysisData, setAnalysisData] = useState(null);
  const [topologyData, setTopologyData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedHypothesisForEvidence, setSelectedHypothesisForEvidence] = useState(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Fetch recent incidents for the selector dropdown
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
        console.error("Failed to load incidents for RCA selector:", err);
      }
    };
    fetchIncidents();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch RCA or Topology
  const runAnalysis = useCallback(async (incId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await rootCauseService.analyzeRootCause({
        incidentId: incId || selectedIncidentId || undefined,
        lookbackMinutes,
      });
      setAnalysisData(data);
      if (data.top_root_cause_service) {
        setSelectedNodeId(data.top_root_cause_service);
      }
    } catch (err) {
      console.error("Failed to execute root cause analysis:", err);
      setError("Failed to run root cause analysis. Please verify backend services.");
    } finally {
      setLoading(false);
    }
  }, [selectedIncidentId, lookbackMinutes]);

  const fetchTopology = useCallback(async () => {
    try {
      const topo = await rootCauseService.getTopology();
      setTopologyData(topo);
    } catch (err) {
      console.error("Failed to fetch topology:", err);
    }
  }, []);

  useEffect(() => {
    runAnalysis();
    fetchTopology();
  }, [runAnalysis, fetchTopology]);

  const handleTriggerAnalysis = async () => {
    setAnalyzing(true);
    setFeedback(null);
    try {
      await runAnalysis(selectedIncidentId);
      setFeedback("Root cause analysis refreshed successfully.");
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setAnalyzing(false);
    }
  };

  const currentGraph = viewMode === "GLOBAL_TOPOLOGY" ? topologyData : analysisData?.graph;

  return (
    <div className="page-container">
      <PageHeader
        title="Evidence-Based Root Cause Analysis"
        description="Topological dependency graphs, multi-factor causal ranking, and verified zero-hallucination log citations"
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => runAnalysis()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleTriggerAnalysis}
              disabled={analyzing}
              style={{ gap: "6px" }}
            >
              <Zap size={14} className={analyzing ? "animate-spin" : ""} />
              {analyzing ? "Tracing Root Cause..." : "Run Analysis"}
            </button>
          </div>
        }
      />

      {/* Control bar: Incident selector & Graph View toggle */}
      <div
        className="filter-toolbar"
        style={{ marginBottom: "16px" }}
      >
        {/* Left: Incident selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Incident:
          </span>
          <select
            className="form-control"
            value={selectedIncidentId}
            onChange={(e) => {
              setSelectedIncidentId(e.target.value);
              runAnalysis(e.target.value);
            }}
            style={{ fontSize: "12px", width: "auto", minWidth: "260px" }}
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.incident_number || inc.id.substring(0, 8)} — {inc.title}
              </option>
            ))}
            {incidents.length === 0 && <option value="">No incidents available (analyze recent window)</option>}
          </select>

          <select
            className="form-control"
            value={lookbackMinutes}
            onChange={(e) => setLookbackMinutes(parseInt(e.target.value, 10))}
            style={{ fontSize: "12px", width: "auto" }}
          >
            <option value={15}>Last 15 minutes</option>
            <option value={30}>Last 30 minutes</option>
            <option value={60}>Last 1 hour</option>
            <option value={120}>Last 2 hours</option>
          </select>
        </div>

        {/* Right: Graph View Switcher */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === "CAUSAL_GRAPH" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setViewMode("CAUSAL_GRAPH")}
            style={{ gap: "5px" }}
          >
            <GitBranch size={13} />
            Causal Path Graph
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === "GLOBAL_TOPOLOGY" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setViewMode("GLOBAL_TOPOLOGY")}
            style={{ gap: "5px" }}
          >
            <Share2 size={13} />
            Global Topology
          </button>
        </div>
      </div>

      {/* Success / Error feedback */}
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

      {/* Summary Highlight Card */}
      {analysisData && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
            padding: "16px 20px",
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 6%, var(--bg-card))",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--severity-error)",
              }}
            >
              <Flame size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Identified Root Cause
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                {analysisData.summary}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--accent-primary)" }}>
              {Math.round((analysisData.confidence_score || 0) * 100)}%
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Causal Confidence
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Analysis Workbench */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Interactive React Flow Graph */}
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {viewMode === "CAUSAL_GRAPH" ? "Causal Propagation Flow" : "Global Inferred Topology"}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Click nodes to inspect service evidence
            </span>
          </div>

          <CausalGraphFlow
            graph={currentGraph}
            onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
            height="520px"
          />
        </div>

        {/* Right Column: Ranked Hypotheses */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              Ranked Causal Hypotheses
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Multi-factor scored
            </span>
          </div>

          <HypothesisRankingList
            hypotheses={analysisData?.hypotheses}
            selectedService={selectedNodeId}
            onSelectHypothesis={(h) => setSelectedNodeId(h.service_name)}
            onViewEvidence={(h) => setSelectedHypothesisForEvidence(h)}
          />
        </div>
      </div>

      {/* Evidence Citations Drawer */}
      {selectedHypothesisForEvidence && (
        <EvidenceDrawer
          hypothesis={selectedHypothesisForEvidence}
          onClose={() => setSelectedHypothesisForEvidence(null)}
        />
      )}
    </div>
  );
}
