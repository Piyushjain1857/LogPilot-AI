import React from "react";

export default function Card({
  title,
  headerAction,
  children,
  footer,
  elevated = false,
  className = "",
  ...props
}) {
  return (
    <div
      className={`card ${elevated ? "card-elevated" : ""} ${className}`}
      {...props}
    >
      {(title || headerAction) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
