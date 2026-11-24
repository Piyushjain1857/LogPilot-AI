import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PlaybookLibrary from "../../components/remediation/PlaybookLibrary";
import RemediationConsole from "../../components/remediation/RemediationConsole";
import { remediationService } from "../../services/remediationService";
import { ShieldCheck, BookOpen, Terminal, Sparkles } from "lucide-react";

export default function RemediationPage() {
  const [searchParams] = useSearchParams();
  const incidentIdParam = searchParams.get("incident_id");
  const playbookParam = searchParams.get("playbook");

  const [activeTab, setActiveTab] = useState("console"); // 'console' | 'library'
  const [playbooks, setPlaybooks] = useState([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const pbList = await remediationService.getPlaybooks();
        if (!isMounted) return;
        setPlaybooks(pbList);

        // If incident_id in query, fetch recommendations
        if (incidentIdParam) {
          const recs = await remediationService.recommendPlaybooks(incidentIdParam);
          if (isMounted) {
            setRecommendations(recs);
            if (recs.length > 0) {
              setSelectedPlaybook(recs[0].playbook);
              setActiveTab("console");
              return;
            }
          }
        }

        // If playbookParam specified, select it
        if (playbookParam && pbList.length > 0) {
          const found = pbList.find(
            (p) => p.playbook_number === playbookParam || p.id === playbookParam || p.slug === playbookParam
          );
          if (found) {
            setSelectedPlaybook(found);
            return;
          }
        }

        // Default to first playbook (PB-101)
        if (pbList.length > 0) {
          setSelectedPlaybook(pbList[0]);
        }
      } catch (err) {
        console.error("Failed to load playbooks:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [incidentIdParam, playbookParam]);

  const handleSelectPlaybook = (pb) => {
    setSelectedPlaybook(pb);
    setActiveTab("console");
  };

  const handlePlaybookUpdated = (updatedPb) => {
    setSelectedPlaybook(updatedPb);
    setPlaybooks((prev) =>
      prev.map((p) => (p.id === updatedPb.id ? updatedPb : p))
    );
  };

  const handleResetRunbook = async () => {
    if (!selectedPlaybook) return;
    try {
      const refreshed = await remediationService.getPlaybookById(
        selectedPlaybook.id || selectedPlaybook.playbook_number
      );
      handlePlaybookUpdated(refreshed);
    } catch (err) {
      console.warn("Failed to reset runbook:", err);
    }
  };

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Remediation Playbook Studio"
        subtitle="Synthesized mitigation runbooks with human approval gates, non-destructive sandbox simulation, and rollback plans."
        badge={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span className="badge badge-success" style={{ gap: 4 }}>
              <ShieldCheck size={13} /> Guardrails Enforced
            </span>
            <span className="badge badge-warning">Approval Gate Active</span>
          </div>
        }
      />

      {/* Recommended for Incident Banner (if navigated from incident) */}
      {incidentIdParam && recommendations.length > 0 && (
        <div
          className="card"
          style={{
            padding: "var(--space-4) var(--space-5)",
            backgroundColor: "rgba(56, 189, 248, 0.08)",
            border: "1px solid var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                AI Recommended Runbook for Incident:{" "}
                <span className="code-font" style={{ color: "var(--accent-primary)" }}>
                  {incidentIdParam}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Top Match: <strong>{recommendations[0]?.playbook?.title}</strong> (Score:{" "}
                {Math.round((recommendations[0]?.match_score || 0) * 100)}%)
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleSelectPlaybook(recommendations[0]?.playbook)}
          >
            Apply Recommended Runbook
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "var(--space-2)",
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "console" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("console")}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Terminal size={14} /> Active Remediation Console
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "library" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("library")}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <BookOpen size={14} /> Playbook Library ({playbooks.length})
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === "console" ? (
        <RemediationConsole
          playbook={selectedPlaybook}
          onPlaybookUpdated={handlePlaybookUpdated}
          onResetRunbook={handleResetRunbook}
        />
      ) : (
        <PlaybookLibrary
          playbooks={playbooks}
          onSelectPlaybook={handleSelectPlaybook}
          loading={loading}
        />
      )}
    </div>
  );
}
