import React from "react";
import CopyButton from "./CopyButton";

export default function CodeBlock({ code, language = "json", title = null, className = "" }) {
  const codeString = typeof code === "object" ? JSON.stringify(code, null, 2) : String(code || "");

  return (
    <div className={`code-block-container ${className}`}>
      <div className="code-block-header">
        <span>{title || language.toUpperCase()}</span>
        <CopyButton text={codeString} label="Copy snippet" />
      </div>
      <pre className="code-block-pre">
        <code>{codeString}</code>
      </pre>
    </div>
  );
}
