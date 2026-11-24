import React from "react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { FileText, Download } from "lucide-react";

export default function ReportsPage() {
  const reports = [
    {
      id: "RPT-001",
      title: "Post-Mortem: INC-101 PostgreSQL Connection Exhaustion",
      type: "Post-Mortem",
      generated_at: "2026-11-24 10:30 UTC",
      duration: "19 minutes",
      mttd: "14s",
      mttr: "19m",
    },
    {
      id: "RPT-002",
      title: "Weekly Microservice Reliability & Anomaly Audit",
      type: "Audit Summary",
      generated_at: "2026-11-23 23:59 UTC",
      duration: "7 days",
      mttd: "45s",
      mttr: "12m",
    },
  ];

  const columns = [
    { key: "id", label: "Report ID", render: (v) => <span className="code-font">{v}</span> },
    { key: "title", label: "Report Title", render: (v) => <strong>{v}</strong> },
    { key: "type", label: "Category", render: (v) => <Badge variant="default">{v}</Badge> },
    { key: "generated_at", label: "Generated", render: (v) => <span className="code-font" style={{ fontSize: 11 }}>{v}</span> },
    { key: "mttd", label: "MTTD", render: (v) => <span className="tabular-nums">{v}</span> },
    { key: "mttr", label: "MTTR", render: (v) => <span className="tabular-nums">{v}</span> },
    {
      key: "actions",
      label: "Export",
      render: () => (
        <Button variant="outline" size="xs" icon={Download}>
          Export Markdown
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Incident & Audit Reports"
        description="Executive post-mortem summaries, SLA impact metrics, and compliance audit exports."
        badge={<Badge variant="primary" icon={FileText}>Audit Logs</Badge>}
      />

      <DataTable
        columns={columns}
        data={reports}
        totalItems={reports.length}
      />
    </div>
  );
}
