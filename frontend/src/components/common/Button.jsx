import React from "react";
import { useNavigate } from "react-router-dom";
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
  to,
  ...props
}) {
  let navigate;
  try {
    navigate = useNavigate();
  } catch {
    // Fallback if rendered outside Router context in edge unit tests
    navigate = null;
  }

  const handleClick = (e) => {
    if (disabled || loading) return;
    if (onClick) onClick(e);
    if (to && !e.defaultPrevented) {
      if (navigate) {
        navigate(to);
      } else if (typeof window !== "undefined") {
        window.location.href = to;
      }
    }
  };

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
      onClick={handleClick}
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
