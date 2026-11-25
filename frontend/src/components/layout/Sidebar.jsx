import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Radio,
  FileSearch,
  Server,
  Activity,
  AlertTriangle,
  GitBranch,
  Layers,
  Bot,
  ShieldCheck,
  FileText,
  Settings,
  Terminal,
  Play,
  Globe,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Tooltip from "../common/Tooltip";
import ThemeToggle from "../common/ThemeToggle";

const NAVIGATION_GROUPS = [
  {
    title: "MONITORING",
    items: [
      { path: "/app", label: "Overview", icon: LayoutDashboard, end: true },
      { path: "/app/websites", label: "Connect Website", icon: Globe, badge: "LIVE", badgeVariant: "success" },
      { path: "/app/live-logs", label: "Live Logs", icon: Radio, pulse: true },
      { path: "/app/log-explorer", label: "Log Explorer", icon: FileSearch },
      { path: "/app/traces", label: "Trace Explorer", icon: GitBranch },
      { path: "/app/log-sources", label: "Log Sources", icon: Server },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { path: "/app/anomalies", label: "Anomaly Detection", icon: Activity, badge: "3" },
      { path: "/app/clusters", label: "Pattern Clusters", icon: Layers },
      { path: "/app/incidents", label: "Incidents", icon: AlertTriangle, badge: "1", badgeVariant: "error" },
      { path: "/app/root-cause", label: "Root Cause Analysis", icon: GitBranch },
      { path: "/app/troubleshooter", label: "AI Troubleshooter", icon: Bot, badge: "AI", badgeVariant: "success" },
      { path: "/app/copilot", label: "AI Copilot", icon: Sparkles, badge: "GEMINI", badgeVariant: "primary" },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { path: "/app/remediation", label: "Remediation Playbooks", icon: ShieldCheck },
      { path: "/app/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "WORKSPACE",
    items: [
      { path: "/app/demo", label: "7-Stage Live Demo", icon: Play, badge: "DEMO", badgeVariant: "success" },
      { path: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({
  collapsed = false,
  onToggleCollapse = null,
  onNavigate = null,
  connectionStatus = "connected",
}) {
  const isMac = typeof navigator !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-logo" onClick={onNavigate}>
          <div className="sidebar-logo-icon">
            <Terminal size={16} />
          </div>
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>LogPilot AI</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
                Enterprise AIOps
              </span>
            </div>
          )}
        </NavLink>

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            style={{ color: "var(--text-muted)", padding: "0 4px" }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && <div className="sidebar-section-title">{group.title}</div>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const linkNode = (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={`badge ${item.badgeVariant === "error" ? "badge-error" : item.badgeVariant === "success" ? "badge-success" : "badge-neutral"}`}
                          style={{ fontSize: "10px", padding: "1px 6px" }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.pulse && (
                        <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--status-error)" }} />
                      )}
                    </span>
                  )}
                </NavLink>
              );

              return collapsed ? (
                <Tooltip key={item.path} text={item.label}>
                  {linkNode}
                </Tooltip>
              ) : (
                linkNode
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer info & quick toggles */}
      <div className="sidebar-footer">
        {collapsed ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <ThemeToggle />
            {onToggleCollapse && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                style={{ padding: "0 4px" }}
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: connectionStatus === "connected" ? "var(--status-success)" : "var(--status-error)",
                  }}
                />
                <span>{connectionStatus === "connected" ? "Backend Online" : "Backend Offline"}</span>
              </div>
              <ThemeToggle />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
              <span>LogPilot v0.1.0</span>
              <span className="kbd-shortcut">{isMac ? "⌘K" : "Ctrl+K"}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
