import React from "react";
import { Sun, MoonStar, SunMoon } from "lucide-react";
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
    if (theme === "dark") return <MoonStar size={16} className="theme-icon-dark" />;
    if (theme === "light") return <Sun size={16} className="theme-icon-light" />;
    return <SunMoon size={16} className="theme-icon-system" />;
  };

  const getLabel = () => {
    if (theme === "dark") return "Theme: Dark Mode (Click for Light)";
    if (theme === "light") return "Theme: Light Mode (Click for System)";
    return "Theme: System Auto (Click for Dark)";
  };

  return (
    <Tooltip text={getLabel()}>
      <button
        type="button"
        className={`theme-toggle-btn btn btn-ghost btn-sm ${className}`}
        onClick={cycleTheme}
        aria-label={getLabel()}
      >
        {getIcon()}
      </button>
    </Tooltip>
  );
}
