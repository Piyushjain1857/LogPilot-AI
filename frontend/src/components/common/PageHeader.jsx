import React from "react";

export default function PageHeader({
  title,
  description,
  actions = null,
  badge = null,
  className = "",
}) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header-info">
        <h1 className="page-header-title">
          <span>{title}</span>
          {badge && <span>{badge}</span>}
        </h1>
        {description && <p className="page-header-desc">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
