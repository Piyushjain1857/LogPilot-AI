import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Radio,
  Server,
  Search,
  Activity,
  AlertTriangle,
  GitBranch,
  Bot,
  ShieldCheck,
  FileText,
  Settings,
  Terminal,
} from "lucide-react";

const NAV_ITEMS = [
  { section: "OBSERVABILITY" },
  { path: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { path: "/app/live-logs", label: "Live Logs", icon: Radio },
  { path: "/app/log-sources", label: "Log Sources", icon: Server },
  { path: "/app/log-explorer", label: "Log Explorer", icon: Search },
  { section: "INTELLIGENCE & AI" },
  { path: "/app/anomalies", label: "Anomaly Detection", icon: Activity },
  { path: "/app/incidents", label: "Incidents", icon: AlertTriangle },
  { path: "/app/root-cause", label: "Root Cause Analysis", icon: GitBranch },
  { path: "/app/troubleshooter", label: "AI Troubleshooter", icon: Bot },
  { section: "AUTOMATION & SYSTEM" },
  { path: "/app/remediation", label: "Remediation Playbooks", icon: ShieldCheck },
  { path: "/app/reports", label: "Reports", icon: FileText },
  { path: "/app/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ isOpen }) {
  if (!isOpen) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Terminal size={16} />
          </div>
          <span>LogPilot AI</span>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, index) => {
          if (item.section) {
            return (
              <div key={index} className="sidebar-section-title">
                {item.section}
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          <div>LogPilot AI v0.1.0</div>
          <div style={{ marginTop: 2 }}>Tech Fusion 4.0 — PS-01A</div>
        </div>
      </div>
    </aside>
  );
}
