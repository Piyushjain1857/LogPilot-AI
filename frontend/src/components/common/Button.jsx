import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon: Icon = null,
  onClick,
  type = "button",
  className = "",
  ...props
}) {
  const classNames = [
    "btn",
    `btn-${variant}`,
    `btn-${size}`,
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : Icon ? (
        <Icon size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
