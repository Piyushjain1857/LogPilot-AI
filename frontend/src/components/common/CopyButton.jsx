import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import Tooltip from "./Tooltip";

export default function CopyButton({ text, label = "Copy", size = "xs", className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy text", err);
    }
  };

  return (
    <Tooltip text={copied ? "Copied!" : label}>
      <button
        type="button"
        className={`btn btn-ghost btn-${size} ${className}`}
        onClick={handleCopy}
        aria-label={label}
        style={{ padding: "0 6px" }}
      >
        {copied ? <Check size={13} style={{ color: "var(--status-success)" }} /> : <Copy size={13} />}
      </button>
    </Tooltip>
  );
}
