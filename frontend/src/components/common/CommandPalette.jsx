import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Radio,
  Server,
  FileSearch,
  Activity,
  AlertTriangle,
  GitBranch,
  Bot,
  ShieldCheck,
  FileText,
  Settings,
  Layers,
} from "lucide-react";

const NAV_ITEMS = [
  { group: "MONITORING", path: "/app", title: "Overview Dashboard", icon: LayoutDashboard },
  { group: "MONITORING", path: "/app/live-logs", title: "Live Logs Stream", icon: Radio },
  { group: "MONITORING", path: "/app/log-explorer", title: "Log Explorer & Search", icon: FileSearch },
  { group: "MONITORING", path: "/app/log-sources", title: "Log Sources & Intake", icon: Server },
  { group: "INTELLIGENCE", path: "/app/clusters", title: "Log Clusters & Patterns", icon: Layers },
  { group: "INTELLIGENCE", path: "/app/anomalies", title: "Anomaly Detection", icon: Activity },
  { group: "INTELLIGENCE", path: "/app/incidents", title: "Incident Management", icon: AlertTriangle },
  { group: "INTELLIGENCE", path: "/app/root-cause", title: "Root Cause Analysis", icon: GitBranch },
  { group: "INTELLIGENCE", path: "/app/troubleshooter", title: "AI Troubleshooter Agent", icon: Bot },
  { group: "OPERATIONS", path: "/app/remediation", title: "Remediation Playbooks", icon: ShieldCheck },
  { group: "OPERATIONS", path: "/app/reports", title: "Audit & Incident Reports", icon: FileText },
  { group: "WORKSPACE", path: "/app/settings", title: "Settings & Preferences", icon: Settings },
];

export default function CommandPalette({ isOpen, onClose, onOpen }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const allItems = useMemo(() => {
    const matchingNav = NAV_ITEMS.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.group.toLowerCase().includes(query.toLowerCase())
    );

    const items = [...matchingNav];
    if (query.trim()) {
      items.push({
        group: "LOG QUERY",
        path: `/app/log-explorer?q=${encodeURIComponent(query.trim())}`,
        title: `Search logs for "${query.trim()}"`,
        icon: Search,
      });
    }
    return items;
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else if (onOpen) {
          onOpen();
        }
        return;
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(allItems.length - 1, 0) : prev - 1
        );
      } else if (e.key === "Enter" && allItems[selectedIndex]) {
        e.preventDefault();
        navigate(allItems[selectedIndex].path);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, allItems, selectedIndex, navigate, onClose, onOpen]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-search">
          <Search size={18} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search pages, navigation routes, settings, runbooks... (ESC to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>

        <div className="command-palette-list">
          {allItems.length === 0 ? (
            <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-body-sm)" }}>
              No matching pages found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            allItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.path}
                  className={`command-palette-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <Icon size={16} style={{ color: isSelected ? "var(--accent-primary)" : "var(--text-muted)" }} />
                    <span>{item.title}</span>
                  </div>
                  <span className="command-palette-shortcut">{item.group}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
