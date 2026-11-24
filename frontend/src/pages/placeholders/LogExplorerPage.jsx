import React, { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import SearchInput from "../../components/common/SearchInput";
import DateRangeSelector from "../../components/common/DateRangeSelector";
import LogTable from "../../components/logs/LogTable";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Search, RefreshCw } from "lucide-react";

export default function LogExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRange, setSelectedRange] = useState("24h");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");

  const sampleLogs = [
    {
      id: "exp-1",
      timestamp: "2026-11-24T10:00:10.512Z",
      severity: "ERROR",
      service_name: "checkout-service",
      message: "HTTP 500 InternalServerError - Unhandled KeyError: 'tax_rate_id' at CheckoutCalculator.py:142",
      raw_message: "2026-11-24T10:00:10.512Z [ERROR] [checkout-service] trace_id=d991-8812-cc55 span_id=s-006 HTTP 500 InternalServerError - Unhandled KeyError: 'tax_rate_id' at CheckoutCalculator.py:142",
      trace_id: "d991-8812-cc55",
      span_id: "s-006",
      metadata_json: JSON.stringify({ exception: "KeyError", file: "CheckoutCalculator.py", line: 142 }),
    },
    {
      id: "exp-2",
      timestamp: "2026-11-24T10:00:11.890Z",
      severity: "CRITICAL",
      service_name: "order-service",
      message: "DatabaseConnectionError: could not connect to PostgreSQL primary host=db-primary.internal port=5432: connection pool exhausted (max=100)",
      raw_message: "2026-11-24T10:00:11.890Z [CRITICAL] [order-service] trace_id=b223-1109-ee74 span_id=s-007 DatabaseConnectionError: could not connect to PostgreSQL primary host=db-primary.internal port=5432: connection pool exhausted (max=100)",
      trace_id: "b223-1109-ee74",
      span_id: "s-007",
      metadata_json: JSON.stringify({ host: "db-primary.internal", port: 5432, pool_max: 100 }),
    },
    {
      id: "exp-3",
      timestamp: "2026-11-24T10:00:12.311Z",
      severity: "ERROR",
      service_name: "inventory-service",
      message: "Database query timeout after 5000ms: SELECT * FROM inventory_locks WHERE sku='SKU-998'",
      raw_message: "2026-11-24T10:00:12.311Z [ERROR] [inventory-service] trace_id=b223-1109-ee74 span_id=s-008 Database query timeout after 5000ms: SELECT * FROM inventory_locks WHERE sku='SKU-998'",
      trace_id: "b223-1109-ee74",
      span_id: "s-008",
      metadata_json: JSON.stringify({ timeout_ms: 5000, sku: "SKU-998" }),
    },
  ];

  const filtered = sampleLogs.filter((l) => {
    if (selectedSeverity !== "ALL" && l.severity !== selectedSeverity) return false;
    if (searchQuery.trim() && !l.message.toLowerCase().includes(searchQuery.toLowerCase()) && !l.service_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Log Explorer"
        description="Query engine and multi-facet log search across historical records."
        badge={<Badge variant="primary" icon={Search}>Historical Records</Badge>}
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <DateRangeSelector selected={selectedRange} onChange={setSelectedRange} />
            <Button variant="secondary" size="sm" icon={RefreshCw}>
              Run Query
            </Button>
          </div>
        }
      />

      {/* Query Filter Bar */}
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search message text, trace IDs, services... (Press / to focus)"
            shortcut="/"
          />

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>Severity:</span>
            {["ALL", "CRITICAL", "ERROR", "WARNING", "INFO"].map((sev) => (
              <button
                key={sev}
                type="button"
                className={`btn btn-xs ${selectedSeverity === sev ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedSeverity(sev)}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <LogTable logs={filtered} />
    </div>
  );
}
