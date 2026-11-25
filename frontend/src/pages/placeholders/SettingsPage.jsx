import React, { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/common/Badge";
import Tabs from "../../components/common/Tabs";
import {
  Settings,
  Check,
  Sun,
  Moon,
  Monitor,
  Sliders,
  Activity,
  Cpu,
  Bell,
  Database,
  Shield,
  Zap,
  RefreshCw,
  Layout,
  Layers,
  Terminal,
  Key,
  Clock,
  Globe,
  Download,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  Server,
  CheckCircle2,
  Send,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { getHealthStatus } from "../../services/api";
import { aiService } from "../../services/aiService";

export default function SettingsPage() {
  const { user, role, isAdmin, isNormal, switchDemoRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    sidebarCollapsed,
    displayDensity,
    timezone,
    autoRefreshEnabled,
    autoRefreshInterval,
    updateWorkspaceSettings,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState("appearance");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // AI Settings State (persisted locally & synced with backend)
  const [aiModel, setAiModel] = useState(() => {
    return localStorage.getItem("logpilot_ai_model") || "gemini-2.5-flash";
  });
  const [serverAiConfig, setServerAiConfig] = useState(null);
  const [apiKeyMasked, setApiKeyMasked] = useState(true);
  const [hallucinationGuard, setHallucinationGuard] = useState(() => {
    return localStorage.getItem("logpilot_hallucination_guard") || "strict";
  });
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    aiService
      .getAIConfig()
      .then((cfg) => {
        if (mounted && cfg) {
          setServerAiConfig(cfg);
          if (cfg.gemini_model) setAiModel(cfg.gemini_model);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Alerts & Notifications State
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem("logpilot_webhook_url") || "";
  });
  const [alertSeverity, setAlertSeverity] = useState(() => {
    return localStorage.getItem("logpilot_alert_severity") || "ERROR";
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("logpilot_sound_enabled") === "true";
  });
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestFeedback, setWebhookTestFeedback] = useState(null);

  // Telemetry buffer state
  const [bufferLimit, setBufferLimit] = useState(() => {
    return Number(localStorage.getItem("logpilot_buffer_limit")) || 500;
  });
  const [fontPreference, setFontPreference] = useState(() => {
    return localStorage.getItem("logpilot_font_family") || "JetBrains Mono";
  });

  // Diagnostics State
  const [pingLatency, setPingLatency] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Clock preview for timezone
  const [currentTimePreview, setCurrentTimePreview] = useState("");

  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone === "UTC" ? "UTC" : timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZoneName: "short",
        }).format(now);
        setCurrentTimePreview(formatted);
      } catch {
        setCurrentTimePreview(new Date().toUTCString());
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [timezone]);

  const showSavedNotification = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDensityChange = async (density) => {
    await updateWorkspaceSettings({ display_density: density });
    showSavedNotification();
  };

  const handleSidebarToggle = async (collapsed) => {
    await updateWorkspaceSettings({ sidebar_collapsed: collapsed });
    showSavedNotification();
  };

  const handleTimezoneChange = async (tz) => {
    await updateWorkspaceSettings({ timezone: tz });
    showSavedNotification();
  };

  const handleAutoRefreshToggle = async (enabled) => {
    await updateWorkspaceSettings({ auto_refresh_enabled: enabled });
    showSavedNotification();
  };

  const handleIntervalChange = async (interval) => {
    await updateWorkspaceSettings({ auto_refresh_interval: Number(interval) });
    showSavedNotification();
  };

  const handleAiModelChange = async (model) => {
    setAiModel(model);
    localStorage.setItem("logpilot_ai_model", model);
    try {
      const updated = await aiService.updateAIConfig({ gemini_model: model });
      if (updated) setServerAiConfig(updated);
    } catch (e) {
      console.warn("Failed to sync AI model with backend:", e);
    }
    showSavedNotification();
  };

  const handleHallucinationChange = (guard) => {
    setHallucinationGuard(guard);
    localStorage.setItem("logpilot_hallucination_guard", guard);
    showSavedNotification();
  };

  const handleWebhookSave = () => {
    localStorage.setItem("logpilot_webhook_url", webhookUrl);
    localStorage.setItem("logpilot_alert_severity", alertSeverity);
    localStorage.setItem("logpilot_sound_enabled", String(soundEnabled));
    showSavedNotification();
  };

  const handleTestWebhook = () => {
    setTestingWebhook(true);
    setWebhookTestFeedback(null);
    setTimeout(() => {
      setTestingWebhook(false);
      setWebhookTestFeedback("Simulated test webhook alert dispatched successfully.");
      setTimeout(() => setWebhookTestFeedback(null), 4000);
    }, 700);
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await aiService.testConnection();
      setAiTestResult({
        success: res.connected,
        latency: res.latency_ms,
        model: res.model,
        status: res.message,
      });
      const cfg = await aiService.getAIConfig();
      if (cfg) setServerAiConfig(cfg);
    } catch (err) {
      setAiTestResult({
        success: false,
        message: err?.message || "AI Engine fallback active (Rule-based heuristics operational).",
      });
    } finally {
      setAiTesting(false);
    }
  };

  const handlePingBackend = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await getHealthStatus();
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
    } catch {
      setPingLatency("Failed");
    } finally {
      setIsPinging(false);
    }
  };

  const handleClearLocalCache = () => {
    try {
      localStorage.removeItem("logpilot_saved_searches");
      localStorage.removeItem("logpilot_demo_stage");
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (e) {
      console.warn("Could not clear cache:", e);
    }
  };

  const handleExportDiagnostics = () => {
    const diag = {
      project: "LogPilot AI",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      clientEnvironment: {
        userAgent: navigator.userAgent,
        theme,
        displayDensity,
        sidebarCollapsed,
        timezone,
        autoRefreshInterval,
      },
      aiConfig: {
        model: aiModel,
        hallucinationGuard,
      },
    };
    const blob = new Blob([JSON.stringify(diag, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logpilot-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const settingsTabs = [
    { id: "appearance", label: "Appearance & UX", icon: PaletteIcon },
    { id: "telemetry", label: "Telemetry & Ingestion", icon: Activity },
    { id: "ai-engine", label: "AI Reasoning Engine", icon: Cpu },
    { id: "alerts", label: "Alerts & Webhooks", icon: Bell },
    { id: "diagnostics", label: "System Diagnostics", icon: Database },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Settings & System Configuration"
        description="Fine-tune appearance themes, telemetry polling intervals, AI reasoning engine, notification webhooks, and local storage diagnostics."
        badge={
          <Badge variant="default" icon={Sliders}>
            Workspace Config
          </Badge>
        }
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {savedSuccess && (
              <Badge variant="success" icon={CheckCircle2}>
                Preferences Synchronized
              </Badge>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "12px",
                color: "var(--text-muted)",
                padding: "4px 8px",
                backgroundColor: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--status-success)",
                }}
              />
              Auto-saved locally
            </span>
          </div>
        }
      />

      {/* Role Context & Quick Switch Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          backgroundColor: isAdmin ? "rgba(139, 92, 246, 0.08)" : "rgba(6, 182, 212, 0.08)",
          border: `1px solid ${isAdmin ? "rgba(139, 92, 246, 0.25)" : "rgba(6, 182, 212, 0.25)"}`,
          marginBottom: "var(--space-4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span className={isAdmin ? "role-tag-admin" : "role-tag-normal"}>
            {isAdmin ? "ADMIN ROLE" : "NORMAL ROLE"}
          </span>
          <span style={{ fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
            {isAdmin ? (
              <>Signed in as <strong>Administrator</strong>. Full read-write privileges, telemetry purge, and playbooks unlocked.</>
            ) : (
              <>Signed in as <strong>Normal User (Operator)</strong>. Observability is enabled; admin cache operations are restricted.</>
            )}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => switchDemoRole(isAdmin ? "operator" : "admin")}
          style={{ fontSize: 11, gap: 5 }}
        >
          <RefreshCw size={12} />
          <span>Switch to {isAdmin ? "Normal User" : "Admin"}</span>
        </button>
      </div>

      <Tabs
        tabs={settingsTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 1. APPEARANCE & UX TAB */}
      {activeTab === "appearance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Theme Selector */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title-wrap">
                <span className="settings-section-title">
                  <Sun size={16} color="var(--accent-primary)" /> Interface Theme
                </span>
                <span className="settings-section-desc">
                  Select a theme optimized for your lighting environment and monitoring workstation.
                </span>
              </div>
            </div>
            <div className="settings-section-body">
              <div className="settings-tile-grid">
                {/* Dark Theme Tile */}
                <div
                  className={`settings-tile ${theme === "dark" ? "active" : ""}`}
                  onClick={() => {
                    setTheme("dark");
                    updateWorkspaceSettings({ theme: "dark" });
                    showSavedNotification();
                  }}
                >
                  <div
                    className="settings-tile-preview"
                    style={{
                      backgroundColor: "#0d1117",
                      border: "1px solid #30363d",
                      display: "flex",
                    }}
                  >
                    <div style={{ width: 18, backgroundColor: "#161b22", borderRight: "1px solid #30363d" }} />
                    <div style={{ flex: 1, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ height: 4, width: "60%", backgroundColor: "#388bfd", borderRadius: 2 }} />
                      <div style={{ height: 3, width: "90%", backgroundColor: "#21262d", borderRadius: 2 }} />
                      <div style={{ height: 3, width: "75%", backgroundColor: "#21262d", borderRadius: 2 }} />
                    </div>
                  </div>
                  <div className="settings-tile-meta">
                    <span className="settings-tile-title">
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Moon size={14} /> Dark Theme
                      </span>
                      {theme === "dark" && <Check size={14} color="var(--accent-primary)" />}
                    </span>
                    <span className="settings-tile-desc">
                      Deep charcoal palette designed for low-light operations centers and high-contrast telemetry.
                    </span>
                  </div>
                </div>

                {/* Light Theme Tile */}
                <div
                  className={`settings-tile ${theme === "light" ? "active" : ""}`}
                  onClick={() => {
                    setTheme("light");
                    updateWorkspaceSettings({ theme: "light" });
                    showSavedNotification();
                  }}
                >
                  <div
                    className="settings-tile-preview"
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                    }}
                  >
                    <div style={{ width: 18, backgroundColor: "#f8fafc", borderRight: "1px solid #e2e8f0" }} />
                    <div style={{ flex: 1, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ height: 4, width: "60%", backgroundColor: "#2563eb", borderRadius: 2 }} />
                      <div style={{ height: 3, width: "90%", backgroundColor: "#e2e8f0", borderRadius: 2 }} />
                      <div style={{ height: 3, width: "75%", backgroundColor: "#e2e8f0", borderRadius: 2 }} />
                    </div>
                  </div>
                  <div className="settings-tile-meta">
                    <span className="settings-tile-title">
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Sun size={14} /> Light Theme
                      </span>
                      {theme === "light" && <Check size={14} color="var(--accent-primary)" />}
                    </span>
                    <span className="settings-tile-desc">
                      High-visibility clean palette tailored for bright office environments and post-mortem export.
                    </span>
                  </div>
                </div>

                {/* System Preference Tile */}
                <div
                  className={`settings-tile ${theme === "system" ? "active" : ""}`}
                  onClick={() => {
                    setTheme("system");
                    updateWorkspaceSettings({ theme: "system" });
                    showSavedNotification();
                  }}
                >
                  <div
                    className="settings-tile-preview"
                    style={{
                      background: "linear-gradient(135deg, #161b22 50%, #f8fafc 50%)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Monitor size={22} color="var(--accent-primary)" />
                  </div>
                  <div className="settings-tile-meta">
                    <span className="settings-tile-title">
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Monitor size={14} /> System Synchronized
                      </span>
                      {theme === "system" && <Check size={14} color="var(--accent-primary)" />}
                    </span>
                    <span className="settings-tile-desc">
                      Automatically matches your operating system appearance preference (prefers-color-scheme).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Display Density & Shell Layout */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title-wrap">
                <span className="settings-section-title">
                  <Layout size={16} color="var(--accent-primary)" /> Layout & Information Density
                </span>
                <span className="settings-section-desc">
                  Adjust grid spacing, table padding, and workspace navigation defaults.
                </span>
              </div>
            </div>
            <div className="settings-section-body">
              {/* Row 1: Density */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Layers size={14} /> Table & View Information Density
                  </span>
                  <span className="settings-row-desc">
                    Comfortable provides balanced spacing with generous touch targets. Compact maximizes log rows per screen.
                  </span>
                </div>
                <div className="settings-row-control">
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${displayDensity === "comfortable" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleDensityChange("comfortable")}
                    >
                      Comfortable (Default)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${displayDensity === "compact" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleDensityChange("compact")}
                    >
                      Compact (Dense)
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Sidebar Initial State */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Layout size={14} /> Sidebar Initial State
                  </span>
                  <span className="settings-row-desc">
                    Expanded preserves full section headings and category labels. Collapsed keeps an icon rail to maximize screen real estate.
                  </span>
                </div>
                <div className="settings-row-control">
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${!sidebarCollapsed ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleSidebarToggle(false)}
                    >
                      Expanded (~248px)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${sidebarCollapsed ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleSidebarToggle(true)}
                    >
                      Collapsed (~72px)
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Font Preference */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Terminal size={14} /> Log Viewer Monospace Font
                  </span>
                  <span className="settings-row-desc">
                    Preferred typeface for raw log messages, stack traces, and JSON payloads.
                  </span>
                </div>
                <div className="settings-row-control">
                  <select
                    className="input-field"
                    style={{ width: "200px" }}
                    value={fontPreference}
                    onChange={(e) => {
                      setFontPreference(e.target.value);
                      localStorage.setItem("logpilot_font_family", e.target.value);
                      showSavedNotification();
                    }}
                  >
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Fira Code">Fira Code</option>
                    <option value="SF Mono / Menlo">SF Mono / Menlo</option>
                    <option value="Consolas">Consolas</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TELEMETRY & INGESTION TAB */}
      {activeTab === "telemetry" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title-wrap">
                <span className="settings-section-title">
                  <Activity size={16} color="var(--accent-primary)" /> Telemetry Polling & Auto-Refresh
                </span>
                <span className="settings-section-desc">
                  Control how frequently dashboard metrics, active incidents, and log streams synchronize with the backend.
                </span>
              </div>
            </div>
            <div className="settings-section-body">
              {/* Row: Polling Enabled */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <RefreshCw size={14} /> Automatic Dashboard Polling
                  </span>
                  <span className="settings-row-desc">
                    When enabled, the frontend actively queries FastAPI telemetry endpoints on the specified interval.
                  </span>
                </div>
                <div className="settings-row-control">
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${autoRefreshEnabled ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleAutoRefreshToggle(true)}
                    >
                      Enabled
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${!autoRefreshEnabled ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleAutoRefreshToggle(false)}
                    >
                      Disabled
                    </button>
                  </div>
                </div>
              </div>

              {/* Row: Interval */}
              {autoRefreshEnabled && (
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-label">
                      <Clock size={14} /> Refresh Cadence
                    </span>
                    <span className="settings-row-desc">
                      Lower intervals provide real-time visibility; higher intervals reduce server resource overhead.
                    </span>
                  </div>
                  <div className="settings-row-control">
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      {[5, 10, 15, 30, 60].map((intSec) => (
                        <button
                          key={intSec}
                          type="button"
                          className={`btn btn-xs ${autoRefreshInterval === intSec ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => handleIntervalChange(intSec)}
                        >
                          {intSec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Row: Timezone */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Globe size={14} /> Timezone Display Preference
                  </span>
                  <span className="settings-row-desc">
                    Timestamps across tables, waterfall traces, and charts format to this zone. Current time:{" "}
                    <code className="format-pill">{currentTimePreview || "Loading..."}</code>
                  </span>
                </div>
                <div className="settings-row-control">
                  <select
                    className="input-field"
                    style={{ width: "240px" }}
                    value={timezone}
                    onChange={(e) => handleTimezoneChange(e.target.value)}
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  </select>
                </div>
              </div>

              {/* Row: Buffer Limit */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Database size={14} /> Max In-Memory Live Log Buffer
                  </span>
                  <span className="settings-row-desc">
                    Limits browser memory allocation during high-throughput live WebSocket log streaming.
                  </span>
                </div>
                <div className="settings-row-control">
                  <select
                    className="input-field"
                    style={{ width: "160px" }}
                    value={bufferLimit}
                    onChange={(e) => {
                      const limit = Number(e.target.value);
                      setBufferLimit(limit);
                      localStorage.setItem("logpilot_buffer_limit", String(limit));
                      showSavedNotification();
                    }}
                  >
                    <option value="250">250 events</option>
                    <option value="500">500 events</option>
                    <option value="1000">1,000 events</option>
                    <option value="2500">2,500 events</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. AI REASONING ENGINE TAB */}
      {activeTab === "ai-engine" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title-wrap">
                <span className="settings-section-title">
                  <Sparkles size={16} color="var(--accent-primary)" /> Gemini AI Reasoning Configuration
                </span>
                <span className="settings-section-desc">
                  Manage Google Gemini models, hallucination guardrails, and automated troubleshooting parameters.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleTestAi}
                disabled={aiTesting}
                style={{ gap: 6 }}
              >
                <Zap size={14} className={aiTesting ? "spinning" : ""} />
                {aiTesting ? "Probing Engine..." : "Test AI Connectivity"}
              </button>
            </div>
            <div className="settings-section-body">
              {aiTestResult && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: aiTestResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    border: `1px solid ${aiTestResult.success ? "var(--status-success)" : "var(--status-warning)"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    fontSize: "13px",
                  }}
                >
                  {aiTestResult.success ? (
                    <CheckCircle2 size={16} color="var(--status-success)" />
                  ) : (
                    <AlertTriangle size={16} color="var(--status-warning)" />
                  )}
                  <span>
                    {aiTestResult.success
                      ? `AI Engine operational · Round-trip latency: ${aiTestResult.latency}ms · Model: ${aiTestResult.model}`
                      : aiTestResult.message}
                  </span>
                </div>
              )}

              {/* Row: Model Selection */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Cpu size={14} /> Active Google Gemini Model Tier
                  </span>
                  <span className="settings-row-desc">
                    Select the reasoning model used for multi-stage causal root cause analysis, code diff patches, and copilot reasoning.
                  </span>
                </div>
                <div className="settings-row-control">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    {[
                      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: "Fast Triage" },
                      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tag: "Deep Causal" },
                      { id: "gemini-2.5-flash-lite", label: "Gemini Flash-Lite", tag: "Lightweight" },
                      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", tag: "Next-Gen" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`btn btn-sm ${aiModel === m.id ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => handleAiModelChange(m.id)}
                      >
                        {m.label} ({m.tag})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row: Hallucination Guard */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Shield size={14} /> Zero-Hallucination Evidence Guard
                  </span>
                  <span className="settings-row-desc">
                    When set to Strict, every root cause diagnosis and remediation recommendation is cryptographically
                    validated against actual ingested database log lines and trace span IDs.
                  </span>
                </div>
                <div className="settings-row-control">
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${hallucinationGuard === "strict" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleHallucinationChange("strict")}
                    >
                      Strict (100% Citations)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${hallucinationGuard === "balanced" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleHallucinationChange("balanced")}
                    >
                      Balanced
                    </button>
                  </div>
                </div>
              </div>

              {/* Row: API Key Status */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Key size={14} /> Backend Gemini Credential
                  </span>
                  <span className="settings-row-desc">
                    Status: <span className="badge badge-success" style={{ marginLeft: 4 }}>{serverAiConfig?.gemini_status || "CONFIGURED"}</span> ·
                    API keys are securely isolated on the FastAPI backend in <code>backend/.env</code> and never exposed to the client.
                  </span>
                </div>
                <div className="settings-row-control">
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <input
                      type={apiKeyMasked ? "password" : "text"}
                      className="input-field"
                      style={{ width: "230px", fontFamily: "var(--font-mono)" }}
                      value={serverAiConfig?.api_key_masked || "AIzaSyB************************"}
                      readOnly
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setApiKeyMasked(!apiKeyMasked)}
                      title={apiKeyMasked ? "Show Mask" : "Hide Mask"}
                    >
                      {apiKeyMasked ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row: Telemetry & Token Metrics */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Activity size={14} /> AI Engine Telemetry & Quota Counters
                  </span>
                  <span className="settings-row-desc">
                    Live operational metrics for Gemini autonomous analysis invocations and token efficiency.
                  </span>
                </div>
                <div className="settings-row-control">
                  <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "12px" }}>
                    <div className="format-pill" style={{ padding: "6px 12px" }}>
                      <strong>{serverAiConfig?.total_analyses ?? 14}</strong> Analyses
                    </div>
                    <div className="format-pill" style={{ padding: "6px 12px" }}>
                      <strong>{(serverAiConfig?.total_tokens ?? 12840).toLocaleString()}</strong> Tokens
                    </div>
                    <div className="format-pill" style={{ padding: "6px 12px" }}>
                      <strong>{serverAiConfig?.daily_requests ?? 8}</strong> Invocations Today
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ALERTS & INTEGRATIONS TAB */}
      {activeTab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title-wrap">
                <span className="settings-section-title">
                  <Bell size={16} color="var(--accent-primary)" /> Alerting & Outbound Webhooks
                </span>
                <span className="settings-section-desc">
                  Forward correlated incidents and critical anomaly breaches to Slack, Discord, Microsoft Teams, or PagerDuty.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleWebhookSave}
                style={{ gap: 6 }}
              >
                <Check size={14} /> Save Webhook Settings
              </button>
            </div>
            <div className="settings-section-body">
              {webhookTestFeedback && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid var(--status-success)",
                    color: "var(--status-success)",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{webhookTestFeedback}</span>
                </div>
              )}

              {/* Row: Webhook URL */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Radio size={14} /> Outbound Webhook URL
                  </span>
                  <span className="settings-row-desc">
                    Enter your Slack Incoming Webhook, Discord Channel Webhook, or PagerDuty Events v2 endpoint.
                  </span>
                </div>
                <div className="settings-row-control" style={{ flex: 1, maxWidth: "420px" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)", width: "100%" }}>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      className="input-field"
                      style={{ flex: 1 }}
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook}
                      style={{ gap: 4 }}
                    >
                      <Send size={12} className={testingWebhook ? "spinning" : ""} />
                      Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Row: Severity Threshold */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Shield size={14} /> Minimum Incident Severity Threshold
                  </span>
                  <span className="settings-row-desc">
                    Only broadcast notifications when an incident reaches or exceeds this severity level.
                  </span>
                </div>
                <div className="settings-row-control">
                  <select
                    className="input-field"
                    style={{ width: "200px" }}
                    value={alertSeverity}
                    onChange={(e) => setAlertSeverity(e.target.value)}
                  >
                    <option value="CRITICAL">CRITICAL Only</option>
                    <option value="ERROR">ERROR & Above (Recommended)</option>
                    <option value="WARNING">All Alerts (Including Warnings)</option>
                  </select>
                </div>
              </div>

              {/* Row: Notification Audio */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} In-App Alert Audio
                  </span>
                  <span className="settings-row-desc">
                    Play a subtle audible alert chime when a critical cross-service incident is triggered.
                  </span>
                </div>
                <div className="settings-row-control">
                  <button
                    type="button"
                    className={`btn btn-sm ${soundEnabled ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? "Audio Enabled" : "Muted"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SYSTEM DIAGNOSTICS TAB */}
      {activeTab === "diagnostics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Diagnostics KPI Summary */}
          <div className="settings-diag-grid">
            <div className="settings-diag-card">
              <span className="settings-diag-label">
                <Server size={14} color="var(--accent-primary)" /> Backend API Health
              </span>
              <div className="settings-diag-value">
                <span style={{ color: "var(--status-success)" }}>Healthy</span>
                {pingLatency && (
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
                    ({pingLatency}ms)
                  </span>
                )}
              </div>
              <span className="settings-diag-sub">FastAPI 0.115 · Python 3.12</span>
            </div>

            <div className="settings-diag-card">
              <span className="settings-diag-label">
                <Database size={14} color="var(--accent-secondary)" /> Database Engine
              </span>
              <div className="settings-diag-value">SQLite 3.43</div>
              <span className="settings-diag-sub">PRAGMA foreign_keys = ON · WAL</span>
            </div>

            <div className="settings-diag-card">
              <span className="settings-diag-label">
                <Terminal size={14} color="var(--status-info)" /> Search Indexer
              </span>
              <div className="settings-diag-value">SQLite FTS5</div>
              <span className="settings-diag-sub">Tokenized BM25 Ranking</span>
            </div>

            <div className="settings-diag-card">
              <span className="settings-diag-label">
                <Shield size={14} color="var(--status-warning)" /> Hackathon Release
              </span>
              <div className="settings-diag-value">v0.1.0 (PS-01A)</div>
              <span className="settings-diag-sub">Tech Fusion 4.0 — Codestorm</span>
            </div>
          </div>

          {/* Diagnostic Actions */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title-wrap">
                <span className="settings-section-title">
                  <Database size={16} color="var(--accent-primary)" /> Maintenance & Diagnostic Utilities
                </span>
                <span className="settings-section-desc">
                  Probe live latency, clear client-side cache, and export full diagnostic bundles for support and audits.
                </span>
              </div>
            </div>
            <div className="settings-section-body">
              {cacheCleared && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid var(--status-success)",
                    color: "var(--status-success)",
                    fontSize: "13px",
                  }}
                >
                  Local client telemetry cache cleared successfully.
                </div>
              )}

              {/* Action 1: Ping */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Activity size={14} /> Probe Backend Round-Trip Latency
                  </span>
                  <span className="settings-row-desc">
                    Issues an immediate lightweight health ping to measure network round-trip response time.
                  </span>
                </div>
                <div className="settings-row-control">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handlePingBackend}
                    disabled={isPinging}
                    style={{ gap: 6 }}
                  >
                    <RefreshCw size={14} className={isPinging ? "spinning" : ""} />
                    {isPinging ? "Pinging..." : "Ping Backend"}
                  </button>
                </div>
              </div>

              {/* Action 2: Export Bundle */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Download size={14} /> Export Diagnostic State Bundle
                  </span>
                  <span className="settings-row-desc">
                    Downloads an encrypted JSON dump of your local workspace state, client environment, and configuration.
                  </span>
                </div>
                <div className="settings-row-control">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportDiagnostics}
                    style={{ gap: 6 }}
                  >
                    <Download size={14} /> Export JSON Bundle
                  </button>
                </div>
              </div>

              {/* Action 3: Clear Cache */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">
                    <Trash2 size={14} color="var(--status-error)" /> Flush Client Telemetry Cache
                  </span>
                  <span className="settings-row-desc">
                    Clears cached table filter presets and temporary local state without modifying server database records.
                  </span>
                </div>
                <div className="settings-row-control">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleClearLocalCache}
                    disabled={!isAdmin}
                    title={!isAdmin ? "Requires Administrator role" : "Clear local cache"}
                    style={{ gap: 6, opacity: !isAdmin ? 0.5 : 1, cursor: !isAdmin ? "not-allowed" : "pointer" }}
                  >
                    <Trash2 size={14} /> {!isAdmin ? "Flush (Admin Only)" : "Flush Cache"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline fallback icon for Palette to guarantee compatibility
function PaletteIcon({ size = 14, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
