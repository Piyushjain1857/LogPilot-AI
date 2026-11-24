import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import { Settings, Check, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    sidebarCollapsed,
    displayDensity,
    timezone,
    autoRefreshEnabled,
    autoRefreshInterval,
    updateWorkspaceSettings,
  } = useWorkspace();

  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const showSavedNotification = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Platform Settings"
        description="Configure theme, sidebar state, display density, and auto-refresh intervals."
        badge={<Badge variant="default" icon={Settings}>Workspace Config</Badge>}
        actions={
          savedSuccess && (
            <Badge variant="success" icon={Check}>
              Preferences Synchronized
            </Badge>
          )
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {/* Appearance & Themes */}
        <Card title="Appearance & Themes">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <label style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Interface Theme
              </label>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${theme === "dark" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setTheme("dark");
                    updateWorkspaceSettings({ theme: "dark" });
                    showSavedNotification();
                  }}
                >
                  <Moon size={14} /> Dark Theme
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${theme === "light" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setTheme("light");
                    updateWorkspaceSettings({ theme: "light" });
                    showSavedNotification();
                  }}
                >
                  <Sun size={14} /> Light Theme
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${theme === "system" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setTheme("system");
                    updateWorkspaceSettings({ theme: "system" });
                    showSavedNotification();
                  }}
                >
                  <Monitor size={14} /> System Preference
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Display Density
              </label>
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
                  Compact (High Information Density)
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Sidebar Initial State
              </label>
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
        </Card>

        {/* Telemetry & Auto-Refresh */}
        <Card title="Telemetry & Auto-Refresh">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <label style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Automatic Dashboard Polling
              </label>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
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

            {autoRefreshEnabled && (
              <div>
                <label style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                  Refresh Interval
                </label>
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
            )}

            <div>
              <label style={{ fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Timezone Preference
              </label>
              <select
                className="input-field"
                style={{ maxWidth: 300 }}
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
        </Card>

        {/* Application Information */}
        <Card title="Application Information">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-3)", fontSize: 13 }}>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Project: </span>
              <strong>LogPilot AI</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Version: </span>
              <span className="code-font">v0.1.0</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Track: </span>
              <span>Enterprise & Industry (PS-01A)</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Hackathon: </span>
              <span>Tech Fusion 4.0 — Codestorm</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
