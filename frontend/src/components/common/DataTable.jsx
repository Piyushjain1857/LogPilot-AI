import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";
import EmptyState from "./EmptyState";
import SkeletonLoader from "./SkeletonLoader";

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are currently no rows to display in this table.",
  page = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange = null,
  keyField = "id",
  className = "",
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (loading) {
    return (
      <div className={`data-table-container ${className}`}>
        <div style={{ padding: "var(--space-4)" }}>
          <SkeletonLoader height="36px" style={{ marginBottom: "var(--space-3)" }} />
          <SkeletonLoader height="24px" style={{ marginBottom: "var(--space-2)" }} />
          <SkeletonLoader height="24px" style={{ marginBottom: "var(--space-2)" }} />
          <SkeletonLoader height="24px" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className={`data-table-container ${className}`}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row[keyField] || idx}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {onPageChange && totalPages > 1 && (
        <div className="pagination">
          <div>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, totalItems)} of {totalItems} items
          </div>
          <div className="pagination-controls">
            <Button
              variant="outline"
              size="xs"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              icon={ChevronLeft}
            >
              Prev
            </Button>
            <span className="tabular-nums" style={{ fontSize: "var(--text-caption)" }}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              icon={ChevronRight}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
