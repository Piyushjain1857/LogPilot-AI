import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "./Button";

export default function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry = null,
  requestId = null,
  className = "",
}) {
  return (
    <div className={`error-banner ${className}`} role="alert">
      <div className="error-banner-icon">
        <AlertCircle size={18} />
      </div>
      <div className="error-banner-content">
        <div className="error-banner-title">{title}</div>
        {message && <div className="error-banner-text">{message}</div>}
        {requestId && (
          <div className="error-banner-text code-font" style={{ fontSize: 11, marginTop: 4 }}>
            Request ID: {requestId}
          </div>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={RefreshCw}>
          Retry
        </Button>
      )}
    </div>
  );
}
