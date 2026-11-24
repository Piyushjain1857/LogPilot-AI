import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Construction } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";

export default function FeaturePlaceholder({
  title,
  phase = "Phase 2",
  description,
  plannedFeatures = [],
}) {
  return (
    <div>
      <PageHeader
        title={title}
        description={`This subsystem is scheduled for implementation in ${phase}.`}
        badge={<Badge variant="default" icon={Clock}>{phase} Roadmap</Badge>}
        actions={
          <Link to="/app">
            <Button variant="secondary" size="sm" icon={ArrowLeft}>
              Back to Overview
            </Button>
          </Link>
        }
      />

      <Card>
        <div style={{ textAlign: "center", padding: "var(--space-8) var(--space-4)" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--radius-xl)",
              backgroundColor: "rgba(59, 130, 246, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            <Construction size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: "var(--space-2)" }}>
            {title} — Placeholder View
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              maxWidth: 580,
              margin: "0 auto var(--space-6)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>

          {plannedFeatures.length > 0 && (
            <div
              style={{
                maxWidth: 480,
                margin: "0 auto var(--space-6)",
                textAlign: "left",
                backgroundColor: "var(--bg-primary)",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "var(--space-2)",
                }}
              >
                Planned Subsystem Modules:
              </div>
              <ul style={{ listStyle: "inside disc", color: "var(--text-secondary)", fontSize: 13 }}>
                {plannedFeatures.map((f, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link to="/app">
            <Button variant="primary" size="md">
              Return to System Overview
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
