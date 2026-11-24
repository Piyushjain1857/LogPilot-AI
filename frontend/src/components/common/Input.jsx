import React from "react";

export default function Input({
  label,
  helperText,
  errorText,
  icon: Icon = null,
  id,
  className = "",
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper">
        <input
          id={inputId}
          className={`input-field ${errorText ? "input-error" : ""}`}
          {...props}
        />
        {Icon && (
          <span style={{ position: "absolute", right: 12, color: "var(--text-muted)" }}>
            <Icon size={16} />
          </span>
        )}
      </div>
      {errorText ? (
        <span className="input-error-text">{errorText}</span>
      ) : helperText ? (
        <span className="input-helper-text">{helperText}</span>
      ) : null}
    </div>
  );
}
