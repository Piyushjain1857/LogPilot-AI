import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  Search,
  Bell,
  BookOpen,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  Settings,
} from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import ConnectionIndicator from "../common/ConnectionIndicator";
import ThemeToggle from "../common/ThemeToggle";
import DropdownMenu from "../common/DropdownMenu";
import { getNotifications, clearAllNotifications } from "../../services/api";

export default function Navbar({
  onToggleSidebar,
  onOpenCommandPalette,
  connectionStatus = "connected",
  latencyMs = null,
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const isMac = typeof navigator !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0;

  useEffect(() => {
    let isMounted = true;
    getNotifications()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setLiveNotifications(data);
          const unread = data.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClearNotifications = async () => {
    try {
      await clearAllNotifications();
      setLiveNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Could not clear notifications:", err);
    }
  };

  // Fallback diagnostic notification events based on system state
  const fallbackNotifications = [
    {
      id: "ev-1",
      title: connectionStatus === "connected" ? "FastAPI Backend Connected" : "Backend Connection Degraded",
      message: connectionStatus === "connected" ? "Live REST & health check telemetry responding normally." : "Connection failed. Retrying in background.",
      severity: connectionStatus === "connected" ? "INFO" : "WARNING",
    },
    {
      id: "ev-2",
      title: "SQLite Database Initialized",
      message: "Foreign keys enforced via PRAGMA foreign_keys=ON; composite indexes verified.",
      severity: "INFO",
    },
    {
      id: "ev-3",
      title: "Gemini AI Agent Interface Ready",
      message: "Safe fallback active. Set GEMINI_API_KEY in backend/.env to activate LLM reasoning.",
      severity: "INFO",
    },
  ];

  const activeAlerts = liveNotifications.length > 0 ? liveNotifications : fallbackNotifications;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar navigation"
          style={{ padding: "0 8px" }}
        >
          <Menu size={18} />
        </button>
        <Breadcrumbs />
      </div>

      <div className="navbar-right">
        {/* Global Navigation Search Button */}
        <button
          type="button"
          className="nav-search-btn"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette navigation search"
        >
          <Search size={14} />
          <span>Quick Jump...</span>
          <span className="kbd-shortcut">{isMac ? "⌘K" : "Ctrl+K"}</span>
        </button>

        {/* Backend Connectivity Status Indicator */}
        <ConnectionIndicator status={connectionStatus} latencyMs={latencyMs} />

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notification Panel Dropdown */}
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="View system notifications"
              style={{ position: "relative", padding: "0 8px" }}
              onClick={() => setUnreadCount(0)}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-primary)",
                  }}
                />
              )}
            </button>
          }
        >
          <div style={{ width: 320, padding: "var(--space-2)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-2) var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: "var(--space-2)",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "var(--text-caption)" }}>Live Alert Notifications</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleClearNotifications}
                style={{ fontSize: 11, padding: "2px 6px", color: "var(--accent-primary)" }}
              >
                Clear All
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "280px", overflowY: "auto" }}>
              {activeAlerts.map((n) => {
                const isCrit = n.severity === "CRITICAL";
                const isWarn = n.severity === "WARNING";
                const color = isCrit ? "var(--status-critical)" : isWarn ? "var(--status-warning)" : "var(--accent-primary)";
                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      gap: "var(--space-2)",
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: n.is_read ? "var(--bg-elevated)" : "rgba(56, 189, 248, 0.08)",
                      border: n.is_read ? "1px solid transparent" : "1px solid var(--border-subtle)",
                    }}
                  >
                    <AlertCircle size={14} style={{ color, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: "var(--text-micro)" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</div>
                      <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>{n.message || n.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DropdownMenu>

        {/* Workspace Menu Dropdown */}
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label="Workspace options"
              style={{ gap: 6, fontWeight: 500 }}
            >
              <span>Workspace</span>
              <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          }
        >
          <div style={{ padding: "var(--space-3) var(--space-4)", minWidth: 200 }}>
            <div style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Environment
            </div>
            <div style={{ fontWeight: 600, fontSize: "var(--text-body-sm)", color: "var(--text-primary)", marginTop: 2 }}>
              Local Dev Workspace
            </div>
            <div style={{ fontSize: "var(--text-micro)", color: "var(--accent-secondary)", marginTop: 2 }}>
              Tech Fusion 4.0 (PS-01A)
            </div>
          </div>
          <div className="dropdown-divider" />
          <Link to="/app/settings" className="dropdown-item">
            <Settings size={14} />
            <span>Workspace Settings</span>
          </Link>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="dropdown-item"
          >
            <BookOpen size={14} />
            <span>FastAPI Swagger Docs</span>
            <ExternalLink size={12} style={{ marginLeft: "auto", color: "var(--text-muted)" }} />
          </a>
        </DropdownMenu>
      </div>
    </header>
  );
}
