import React, { useState } from "react";
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Clock,
  Server,
  Layers,
  ArrowRight,
  Database,
  Box,
  Zap,
  HardDrive,
  Network,
  RefreshCw,
} from "lucide-react";

const CATEGORIES = [
  { id: "ALL", label: "All Categories", icon: Layers },
  { id: "DATABASE", label: "Database", icon: Database },
  { id: "CONTAINER", label: "Container / K8s", icon: Box },
  { id: "CIRCUIT_BREAKER", label: "Circuit Breaker", icon: Zap },
  { id: "CACHE", label: "Cache", icon: RefreshCw },
  { id: "NETWORK", label: "Network & Ingress", icon: Network },
  { id: "STORAGE", label: "Storage & Disk", icon: HardDrive },
];

export default function PlaybookLibrary({ playbooks = [], onSelectPlaybook, loading = false }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");

  const filteredPlaybooks = playbooks.filter((pb) => {
    if (selectedCategory !== "ALL" && pb.category !== selectedCategory) return false;
    if (selectedRisk !== "ALL" && pb.risk_level !== selectedRisk) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (pb.title || "").toLowerCase().includes(q);
      const matchDesc = (pb.description || "").toLowerCase().includes(q);
      const matchNumber = (pb.playbook_number || "").toLowerCase().includes(q);
      const matchService = (pb.target_service || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchNumber && !matchService) return false;
    }
    return true;
  });

  const getRiskBadge = (level) => {
    switch (level) {
      case "SAFE":
        return (
          <span className="badge badge-success" style={{ gap: 4 }}>
            <ShieldCheck size={12} /> Safe
          </span>
        );
      case "CAUTION":
        return (
          <span className="badge badge-warning" style={{ gap: 4 }}>
            <AlertTriangle size={12} /> Caution
          </span>
        );
      case "CRITICAL_DESTRUCTIVE":
        return (
          <span className="badge badge-critical" style={{ gap: 4 }}>
            <Flame size={12} /> Critical / Destructive
          </span>
        );
      default:
        return <span className="badge badge-neutral">{level}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Controls Bar: Search & Filters */}
      <div
        className="card"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search runbooks by symptom, service, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px", width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
            Risk Tier:
          </label>
          <select
            className="input"
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "13px" }}
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="SAFE">Safe (Non-Destructive)</option>
            <option value="CAUTION">Caution (Service Impact)</option>
            <option value="CRITICAL_DESTRUCTIVE">Critical / Destructive</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "4px" }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`btn btn-sm ${isActive ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Playbook Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
          Loading playbook library...
        </div>
      ) : filteredPlaybooks.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "var(--space-8)",
            color: "var(--text-muted)",
          }}
        >
          No remediation runbooks found matching the selected criteria.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {filteredPlaybooks.map((pb) => {
            const stepsCount = Array.isArray(pb.steps) ? pb.steps.length : 0;
            return (
              <div
                key={pb.id || pb.playbook_number}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "var(--space-5)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    <span
                      className="code-font"
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--accent-primary)",
                      }}
                    >
                      {pb.playbook_number || "PB-CUSTOM"}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "11px" }}>
                      {pb.category}
                    </span>
                  </div>

                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "var(--space-2)",
                      lineHeight: 1.4,
                    }}
                  >
                    {pb.title}
                  </h4>

                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {pb.description}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--space-2)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {getRiskBadge(pb.risk_level)}
                    <span
                      className="badge badge-neutral"
                      style={{ gap: 4, fontSize: "11px" }}
                    >
                      <Clock size={11} /> {pb.estimated_downtime}
                    </span>
                    <span
                      className="badge badge-neutral"
                      style={{ gap: 4, fontSize: "11px" }}
                    >
                      <Server size={11} /> {pb.target_service}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "var(--space-3)",
                    marginTop: "auto",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {stepsCount} operational step{stepsCount === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectPlaybook(pb)}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    Open Runbook <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
