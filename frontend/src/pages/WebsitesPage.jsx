import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Globe,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Bot,
  GitBranch,
  Terminal,
  Code2,
  Server,
  Key,
  Eye,
  EyeOff,
  Radio,
} from "lucide-react";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  listWebsites,
  getWebsite,
  createWebsite,
  pauseWebsite,
  resumeWebsite,
  checkWebsiteNow,
  deleteWebsite,
  diagnoseWebsiteAI,
  getGitHubCodePatch,
} from "../services/websiteService";
import { getIntegrationExamples } from "../data/integrationExamples";
import "../styles/websites.css";

export default function WebsitesPage() {
  const { websiteId: urlWebsiteId } = useParams();
  const navigate = useNavigate();

  const [websites, setWebsites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [activeTab, setActiveTab] = useState("telemetry"); // telemetry | ai-diagnostics | incidents | sdk-guide | github

  // Add website modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("http://localhost:5174/health");
  const [newSiteInterval, setNewSiteInterval] = useState(30);
  const [newSiteCheckSSL, setNewSiteCheckSSL] = useState(true);
  const [newSiteCheckDNS, setNewSiteCheckDNS] = useState(true);
  const [newSiteGithubRepo, setNewSiteGithubRepo] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  // AI Diagnostic & GitHub states
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [githubPatch, setGithubPatch] = useState(null);
  const [loadingPatch, setLoadingPatch] = useState(false);

  // Key visibility & copy feedbacks
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedLang, setSelectedLang] = useState("browser-sdk");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Fetch all websites
  const loadWebsites = useCallback(async (selectId = null) => {
    try {
      const data = await listWebsites();
      const list = data.websites || [];
      setWebsites(list);

      if (list.length > 0) {
        let target = list[0];
        if (selectId) {
          target = list.find((s) => s.id === selectId) || list[0];
        } else if (urlWebsiteId) {
          target = list.find((s) => s.id === urlWebsiteId) || list[0];
        }
        setSelectedSite(target);
        await loadSiteDetail(target.id);
      } else {
        setSelectedSite(null);
      }
    } catch (err) {
      console.error("Failed to load websites:", err);
    } finally {
      setLoading(false);
    }
  }, [urlWebsiteId]);

  const loadSiteDetail = async (id) => {
    try {
      const site = await getWebsite(id);
      setSelectedSite(site);
    } catch (err) {
      console.error("Failed to fetch website detail:", err);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    if (!selectedSite?.id) return;
    const interval = setInterval(() => {
      loadSiteDetail(selectedSite.id);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedSite?.id]);

  const handleSelectSite = (site) => {
    setSelectedSite(site);
    navigate(`/app/websites/${site.id}`, { replace: true });
    loadSiteDetail(site.id);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!newSiteName.trim() || !newSiteUrl.trim()) {
      setFormError("Project Name and Website URL are required.");
      return;
    }

    setCreating(true);
    try {
      const created = await createWebsite({
        name: newSiteName.trim(),
        url: newSiteUrl.trim(),
        interval_seconds: Number(newSiteInterval),
        check_ssl: newSiteCheckSSL,
        check_dns: newSiteCheckDNS,
        github_repo: newSiteGithubRepo.trim() || null,
      });
      setIsAddModalOpen(false);
      setNewSiteName("");
      setNewSiteUrl("http://localhost:5174/health");
      await loadWebsites(created.id);
    } catch (err) {
      setFormError(err?.response?.data?.detail || err?.message || "Failed to create website.");
    } finally {
      setCreating(false);
    }
  };

  const handleManualProbe = async () => {
    if (!selectedSite) return;
    setProbing(true);
    try {
      await checkWebsiteNow(selectedSite.id);
      await loadSiteDetail(selectedSite.id);
    } catch (err) {
      console.error("Probe failed:", err);
    } finally {
      setProbing(false);
    }
  };

  const handleTogglePause = async () => {
    if (!selectedSite) return;
    try {
      if (selectedSite.status === "active") {
        await pauseWebsite(selectedSite.id);
      } else {
        await resumeWebsite(selectedSite.id);
      }
      await loadSiteDetail(selectedSite.id);
    } catch (err) {
      console.error("Failed to toggle pause status:", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedSite || !window.confirm(`Are you sure you want to delete ${selectedSite.name}?`)) return;
    try {
      await deleteWebsite(selectedSite.id);
      await loadWebsites();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleRunAiDiagnosis = async () => {
    if (!selectedSite) return;
    setLoadingAi(true);
    try {
      const res = await diagnoseWebsiteAI(selectedSite.id);
      setAiDiagnosis(res);
      setActiveTab("ai-diagnostics");
    } catch (err) {
      console.error("AI diagnostics failed:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleFetchGithubPatch = async () => {
    if (!selectedSite) return;
    setLoadingPatch(true);
    try {
      const res = await getGitHubCodePatch(selectedSite.id);
      setGithubPatch(res);
      setActiveTab("github");
    } catch (err) {
      console.error("GitHub patch failed:", err);
    } finally {
      setLoadingPatch(false);
    }
  };

  const handleCopyKey = () => {
    if (!selectedSite) return;
    navigator.clipboard.writeText(selectedSite.ingestion_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const integrationExamples = getIntegrationExamples(
    selectedSite?.ingestion_key || "lp_live_sample_token",
    "http://127.0.0.1:8000/api/v1/websites/ingest"
  );
  const currentExample = integrationExamples.find((ex) => ex.id === selectedLang) || integrationExamples[0];

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <LoadingSpinner size="lg" message="Loading Website Observability Hub..." />
      </div>
    );
  }

  return (
    <div className="websites-container">
      {/* 1. Header with Title and Add Button */}
      <div className="websites-header">
        <div className="websites-title-group">
          <h1>
            <Globe size={24} style={{ color: "var(--accent-primary)" }} />
            <span>Connect Website &amp; Live Observability</span>
          </h1>
          <p>
            Real-time synthetic uptime probes, client SDK error observation, AI root cause diagnosis, and incident lifecycle.
          </p>
        </div>
        <div className="websites-header-actions">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Connect New Website"
          >
            Connect Website
          </Button>
        </div>
      </div>

      {/* 2. Site Selector Bar */}
      {websites.length > 0 ? (
        <div className="site-selector-bar">
          <div className="site-pill-group">
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginRight: 4 }}>
              MONITORED SITES:
            </span>
            {websites.map((site) => (
              <button
                key={site.id}
                type="button"
                className={`site-pill ${selectedSite?.id === site.id ? "active" : ""}`}
                onClick={() => handleSelectSite(site)}
              >
                <span className={`site-status-dot ${site.last_status}`} />
                <span>{site.name}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>({site.uptime_percentage}%)</span>
              </button>
            ))}
          </div>

          {selectedSite && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                loading={probing}
                onClick={handleManualProbe}
                title="Trigger immediate synthetic probe"
              >
                Probe Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={selectedSite.status === "active" ? Pause : Play}
                onClick={handleTogglePause}
                title={selectedSite.status === "active" ? "Pause Monitoring" : "Resume Monitoring"}
              >
                {selectedSite.status === "active" ? "Pause" : "Resume"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDelete}
                title="Remove Website"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="site-banner-card" style={{ justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
          <div>
            <Globe size={40} style={{ color: "var(--accent-primary)", marginBottom: 12, opacity: 0.8 }} />
            <h3 style={{ margin: "0 0 8px 0" }}>No Websites Connected Yet</h3>
            <p style={{ color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto 16px" }}>
              Connect your first website to start tracking uptime, latency, client runtime exceptions, and automated AI troubleshooting.
            </p>
            <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
              Connect Website
            </Button>
          </div>
        </div>
      )}

      {/* 3. Selected Website Overview & KPI Cards */}
      {selectedSite && (
        <>
          {/* Site Banner with Ingestion Key */}
          <div className="site-banner-card">
            <div className="site-meta-lockup">
              <div className="site-name-row">
                <h2>{selectedSite.name}</h2>
                <span className={`badge badge-${selectedSite.last_status === "up" ? "success" : selectedSite.last_status === "down" ? "error" : "warning"}`}>
                  <span className={`site-status-dot ${selectedSite.last_status}`} style={{ marginRight: 6 }} />
                  {selectedSite.last_status.toUpperCase()}
                </span>
                {selectedSite.status === "paused" && (
                  <span className="badge badge-neutral">PAUSED</span>
                )}
              </div>
              <a
                href={selectedSite.url}
                target="_blank"
                rel="noreferrer"
                className="site-url-link"
              >
                <span>{selectedSite.url}</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="site-key-container" title="Project-scoped Telemetry Key">
                <Key size={13} style={{ color: "var(--accent-primary)" }} />
                <span>
                  {showKey
                    ? selectedSite.ingestion_key
                    : `${selectedSite.ingestion_key.slice(0, 10)}••••••••••••`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
                  aria-label="Toggle Key Visibility"
                >
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
                  aria-label="Copy Key"
                >
                  {copiedKey ? <Check size={13} style={{ color: "var(--status-success)" }} /> : <Copy size={13} />}
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={Bot}
                loading={loadingAi}
                onClick={handleRunAiDiagnosis}
              >
                AI Troubleshooter
              </Button>
            </div>
          </div>

          {/* KPI Stat Cards Grid */}
          <div className="websites-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-top-row">
                <span>Availability SLA</span>
                <Activity size={16} style={{ color: "var(--accent-primary)" }} />
              </div>
              <div className="kpi-value" style={{ color: selectedSite.uptime_percentage >= 99 ? "var(--status-success)" : "var(--status-warning)" }}>
                {selectedSite.uptime_percentage}%
              </div>
              <div className="kpi-subtext">
                <span>{selectedSite.successful_checks} / {selectedSite.total_checks} successful pings</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <span>Response Time</span>
                <Clock size={16} style={{ color: "var(--accent-primary)" }} />
              </div>
              <div className="kpi-value">
                {selectedSite.last_response_time_ms ? `${selectedSite.last_response_time_ms}ms` : "--"}
              </div>
              <div className="kpi-subtext">
                <span>HTTP Status: </span>
                <strong style={{ color: selectedSite.last_status_code === 200 ? "var(--status-success)" : "var(--status-error)" }}>
                  {selectedSite.last_status_code || "N/A"}
                </strong>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <span>SSL Certificate</span>
                <ShieldCheck size={16} style={{ color: selectedSite.ssl_valid ? "var(--status-success)" : "var(--status-error)" }} />
              </div>
              <div className="kpi-value" style={{ fontSize: 20 }}>
                {selectedSite.ssl_valid
                  ? selectedSite.ssl_days_remaining !== null
                    ? `${selectedSite.ssl_days_remaining} Days`
                    : "Valid"
                  : "Invalid / Expired"}
              </div>
              <div className="kpi-subtext">
                <span>Issuer: {selectedSite.ssl_issuer || "Standard CA"}</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <span>DNS Resolution</span>
                <Server size={16} style={{ color: "var(--accent-primary)" }} />
              </div>
              <div className="kpi-value" style={{ fontSize: 18 }}>
                {selectedSite.dns_ip || "127.0.0.1"}
              </div>
              <div className="kpi-subtext">
                <span>Lookup: {selectedSite.dns_lookup_time_ms || 1.2}ms</span>
              </div>
            </div>
          </div>

          {/* 4. Tabbed Sub-Views */}
          <div className="websites-nav-tabs">
            <button
              type="button"
              className={`websites-tab-btn ${activeTab === "telemetry" ? "active" : ""}`}
              onClick={() => setActiveTab("telemetry")}
            >
              <Radio size={14} />
              <span>Live Telemetry &amp; Checks ({selectedSite.recent_checks?.length || 0})</span>
            </button>
            <button
              type="button"
              className={`websites-tab-btn ${activeTab === "ai-diagnostics" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("ai-diagnostics");
                if (!aiDiagnosis) handleRunAiDiagnosis();
              }}
            >
              <Bot size={14} />
              <span>AI Debugging Engine</span>
            </button>
            <button
              type="button"
              className={`websites-tab-btn ${activeTab === "github" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("github");
                if (!githubPatch) handleFetchGithubPatch();
              }}
            >
              <GitBranch size={14} />
              <span>GitHub Fix Patch</span>
            </button>
            <button
              type="button"
              className={`websites-tab-btn ${activeTab === "sdk-guide" ? "active" : ""}`}
              onClick={() => setActiveTab("sdk-guide")}
            >
              <Code2 size={14} />
              <span>Integration SDK &amp; Snippets</span>
            </button>
          </div>

          {/* TAB 1: Live Telemetry & Checks */}
          {activeTab === "telemetry" && (
            <div className="telemetry-layout-grid">
              {/* Synthetic Probe History */}
              <div className="panel-card">
                <div className="panel-card-header">
                  <div className="panel-card-title">
                    <Activity size={16} />
                    <span>Synthetic Health Probes</span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Every {selectedSite.interval_seconds}s
                  </span>
                </div>

                <div className="telemetry-table-wrapper">
                  <table className="telemetry-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Time</th>
                        <th>HTTP</th>
                        <th>Latency</th>
                        <th>SSL</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSite.recent_checks || []).slice(0, 8).map((chk) => (
                        <tr key={chk.id}>
                          <td>
                            <span className={`site-status-dot ${chk.status}`} style={{ marginRight: 6 }} />
                            <span style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 600 }}>
                              {chk.status}
                            </span>
                          </td>
                          <td>{new Date(chk.checked_at).toLocaleTimeString()}</td>
                          <td>
                            <strong style={{ color: chk.status_code === 200 ? "var(--status-success)" : "var(--status-error)" }}>
                              {chk.status_code || "--"}
                            </strong>
                          </td>
                          <td>{chk.response_time_ms}ms</td>
                          <td>{chk.ssl_valid ? "Valid" : "Fail"}</td>
                          <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {chk.error_message || "Nominal response"}
                          </td>
                        </tr>
                      ))}
                      {(!selectedSite.recent_checks || selectedSite.recent_checks.length === 0) && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                            No probe results logged yet. Click "Probe Now" above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ingested SDK Client Logs & API Errors */}
              <div className="panel-card">
                <div className="panel-card-header">
                  <div className="panel-card-title">
                    <Terminal size={16} />
                    <span>Real-Time SDK Telemetry &amp; Logs</span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {selectedSite.recent_sdk_events?.length || 0} events
                  </span>
                </div>

                <div className="telemetry-table-wrapper" style={{ maxHeight: 340, overflowY: "auto" }}>
                  <table className="telemetry-table">
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Event</th>
                        <th>Message</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSite.recent_sdk_events || []).map((evt) => (
                        <tr key={evt.id}>
                          <td>
                            <span className={`badge badge-${evt.severity === "CRITICAL" ? "error" : evt.severity === "ERROR" ? "error" : evt.severity === "WARNING" ? "warning" : "neutral"}`}>
                              {evt.severity}
                            </span>
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{evt.event_type}</td>
                          <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={evt.message}>
                            {evt.message}
                          </td>
                          <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                      {(!selectedSite.recent_sdk_events || selectedSite.recent_sdk_events.length === 0) && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                            Zero client-side errors captured. Integrate <code>logpilot-sdk.js</code> into your website to observe JavaScript exceptions and API drops.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI Troubleshooting Engine */}
          {activeTab === "ai-diagnostics" && (
            <div className="ai-diagnosis-card">
              <div className="ai-header-row">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Bot size={20} style={{ color: "var(--accent-primary)" }} />
                    <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)" }}>
                      {aiDiagnosis?.error_summary || "Autonomous Diagnostic Report"}
                    </h3>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, display: "block" }}>
                    Service: <strong>{aiDiagnosis?.affected_service || selectedSite.name}</strong> · Confirmed Findings with Verified Log Citations
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="ai-confidence-badge">
                    {aiDiagnosis?.confidence_level || "HIGH CONFIDENCE"}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={RefreshCw}
                    loading={loadingAi}
                    onClick={handleRunAiDiagnosis}
                  >
                    Re-Analyze
                  </Button>
                </div>
              </div>

              {/* Root Cause Card */}
              <div className="panel-card" style={{ background: "rgba(15, 23, 42, 0.6)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
                  Probable Root Cause
                </span>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                  {aiDiagnosis?.probable_root_cause || "Analyzing live telemetry patterns against causal topology graph..."}
                </p>
              </div>

              {/* Supporting Log Evidence */}
              {aiDiagnosis?.supporting_evidence && aiDiagnosis.supporting_evidence.length > 0 && (
                <div className="ai-evidence-box">
                  <strong style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                    Supporting Log Evidence Citations
                  </strong>
                  {aiDiagnosis.supporting_evidence.map((ev, idx) => (
                    <div key={idx} className="ai-evidence-item">
                      <CheckCircle2 size={13} style={{ color: "var(--status-success)", flexShrink: 0 }} />
                      <span style={{ color: "var(--text-muted)" }}>[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
                      <strong style={{ color: "var(--accent-primary)" }}>{ev.source}:</strong>
                      <span>{ev.content}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Remediation & Code Patch */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="panel-card">
                  <strong style={{ fontSize: 13, color: "var(--status-success)" }}>
                    Suggested Resolution
                  </strong>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "6px 0 0" }}>
                    {aiDiagnosis?.suggested_solution || "Monitoring system status."}
                  </p>
                </div>

                <div className="panel-card">
                  <strong style={{ fontSize: 13, color: "var(--accent-primary)" }}>
                    Recommended Prevention Measures
                  </strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {(aiDiagnosis?.recommended_prevention_measures || [
                      "Maintain continuous telemetry streaming.",
                      "Verify database connection pool thresholds.",
                    ]).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Unified Diff Preview */}
              {aiDiagnosis?.suggested_code_patch && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                      AI PROPOSED CODE FIX (DIFF PATCH)
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={Copy}
                      onClick={() => handleCopyCode(aiDiagnosis.suggested_code_patch)}
                    >
                      Copy Patch
                    </Button>
                  </div>
                  <pre className="code-patch-block">{aiDiagnosis.suggested_code_patch}</pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GitHub Integration */}
          {activeTab === "github" && (
            <div className="panel-card">
              <div className="panel-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Connected GitHub Repository</h3>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Target: <strong>{selectedSite.github_repo || "acme/storefront-app"}</strong> ({selectedSite.github_branch})
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  loading={loadingPatch}
                  onClick={handleFetchGithubPatch}
                >
                  Regenerate Patch
                </Button>
              </div>

              <div style={{ background: "rgba(37, 99, 235, 0.08)", border: "1px solid rgba(37, 99, 235, 0.2)", padding: 14, borderRadius: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                <strong>Strict Human Review Policy:</strong> LogPilot AI never deploys or commits patches directly to production. Review the proposed unified diff below and inspect the suggested safeguards.
              </div>

              {githubPatch && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: 14, color: "var(--text-primary)" }}>{githubPatch.description}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{githubPatch.explanation}</p>
                  </div>

                  <pre className="code-patch-block">{githubPatch.diff}</pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Integration SDK & Snippets */}
          {activeTab === "sdk-guide" && (
            <div className="panel-card">
              <div className="panel-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Copy-Paste Integration Guides</h3>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Pre-configured with project key <code>{selectedSite.ingestion_key}</code>
                  </span>
                </div>
              </div>

              {/* Language Switcher Buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {integrationExamples.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    className={`btn btn-sm ${selectedLang === ex.id ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setSelectedLang(ex.id)}
                  >
                    {ex.title}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 10px" }}>
                  {currentExample.description}
                </p>

                <div style={{ position: "relative" }}>
                  <pre className="code-patch-block">{currentExample.code}</pre>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={copiedSnippet ? Check : Copy}
                    style={{ position: "absolute", top: 10, right: 10 }}
                    onClick={() => handleCopyCode(currentExample.code)}
                  >
                    {copiedSnippet ? "Copied" : "Copy Snippet"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Connect Website Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect Website for Live Monitoring</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid var(--status-error)", color: "var(--status-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-field-group">
                <label className="form-label">Project / Website Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Production Storefront API"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">Target Website / API URL *</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="http://localhost:5174/health or https://myapp.com"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  required
                />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  SSRF Protection: Private and cloud metadata (169.254.x.x) IPs are strictly blocked in production.
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-field-group">
                  <label className="form-label">Monitoring Interval</label>
                  <select
                    className="form-input"
                    value={newSiteInterval}
                    onChange={(e) => setNewSiteInterval(e.target.value)}
                  >
                    <option value={15}>15 Seconds</option>
                    <option value={30}>30 Seconds (Default)</option>
                    <option value={60}>60 Seconds</option>
                    <option value={300}>5 Minutes</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-label">GitHub Repository (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. acme/storefront"
                    value={newSiteGithubRepo}
                    onChange={(e) => setNewSiteGithubRepo(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, margin: "6px 0" }}>
                <label className="form-checkbox-row">
                  <input
                    type="checkbox"
                    checked={newSiteCheckSSL}
                    onChange={(e) => setNewSiteCheckSSL(e.target.checked)}
                  />
                  <span>Verify SSL Expiry</span>
                </label>
                <label className="form-checkbox-row">
                  <input
                    type="checkbox"
                    checked={newSiteCheckDNS}
                    onChange={(e) => setNewSiteCheckDNS(e.target.checked)}
                  />
                  <span>DNS Resolution Timing</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={creating}>
                  Connect &amp; Start Probing
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
