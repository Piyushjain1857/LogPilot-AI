import React from "react";

export default function SectionHeader({
  title,
  description = null,
  actions = null,
  badge = null,
  className = "",
}) {
  return (
    <div className={`section-header ${className}`}>
      <div>
        <h2 className="section-header-title">
          <span>{title}</span>
          {badge && <span>{badge}</span>}
        </h2>
        {description && <p className="section-header-desc">{description}</p>}
      </div>
      {actions && <div className="section-header-actions">{actions}</div>}
    </div>
  );
}
