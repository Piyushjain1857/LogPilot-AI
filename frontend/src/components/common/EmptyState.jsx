import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "No data found",
  description = "No records match the current criteria or telemetry has not yet been ingested.",
  icon: Icon = Inbox,
  action = null,
  className = "",
}) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">
        <Icon size={44} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
