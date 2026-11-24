import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Tooltip from "./Tooltip";

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const getIcon = () => {
    if (theme === "dark") return <Moon size={16} />;
    if (theme === "light") return <Sun size={16} />;
    return <Monitor size={16} />;
  };

  const getLabel = () => {
    if (theme === "dark") return "Theme: Dark (Click for Light)";
    if (theme === "light") return "Theme: Light (Click for System)";
    return "Theme: System (Click for Dark)";
  };

  return (
    <Tooltip text={getLabel()}>
      <button
        type="button"
        className={`btn btn-ghost btn-sm ${className}`}
        onClick={cycleTheme}
        aria-label={getLabel()}
        style={{ padding: "0 8px" }}
      >
        {getIcon()}
      </button>
    </Tooltip>
  );
}
