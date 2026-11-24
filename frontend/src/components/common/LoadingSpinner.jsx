import React from "react";

export default function LoadingSpinner({ size = "md", className = "" }) {
  return (
    <span
      className={`spinner spinner-${size} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
