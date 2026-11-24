import React from "react";

export default function Tabs({ tabs = [], activeTab, onChange, className = "" }) {
  return (
    <div className={`tabs-container ${className}`} role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-btn ${isActive ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={14} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="badge badge-default" style={{ fontSize: 10, padding: "1px 5px" }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
