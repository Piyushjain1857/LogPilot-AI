# LogPilot AI — Design System & UI Architecture Specification

**Product:** LogPilot AI ("Detect. Diagnose. Resolve.")  
**Domain:** Enterprise AIOps & Autonomous Debugging  
**Design Inspiration:** Datadog, Grafana, Linear, Better Stack  
**Phase:** Phase 2 — Premium AIOps UI, Design System & Application Shell  

---

## 1. Design Philosophy

LogPilot AI is engineered for Site Reliability Engineers (SREs), DevOps architects, and platform operators who demand high information density, low visual fatigue, and immediate actionable clarity during production incident triage.

### Core Tenets

1. **Developer-First Ergonomics:** Every millisecond counts during an outage. Navigation is instant, keyboard shortcuts (`Cmd+K`, `Escape`) are ubiquitous, and technical details (Trace IDs, timestamps, stack traces) are copyable with single-click clipboard integration.
2. **High Information Density with Balanced Breathing Room:** Avoid giant empty whitespace cards or cartoonish illustrations. We use compact, readable tabular layouts, subtle borders, and precise font scales inspired by Datadog and Linear.
3. **Restrained Visual Aesthetics:** Strictly no excessive glassmorphism, rainbow neon glows, or nonfunctional gradients. Contrast is maximized and color is reserved strictly for semantic observability signals (e.g. error spikes, critical alerts, service degradation).
4. **Accessible by Default:** All text meets or exceeds WCAG 2.1 AA contrast requirements across both dark and light themes. Focus rings are visible and keyboard navigation is fully supported.
5. **Truth in Telemetry:** All indicators, graphs, and metric cards display live data from backend SQLite models or clear zero-state guidance. No fabricated synthetic mock rates are shown as live monitoring.

---

## 2. Complete Color Palette & Theme Tokens

The design system implements a native dual-theme architecture using CSS Custom Properties (`[data-theme="dark"]` and `[data-theme="light"]`). A lightweight, synchronous inline script in `index.html` evaluates `localStorage` and `prefers-color-scheme` before DOM rendering to prevent flashing.

### 2.1 Dark Theme Tokens (Default)

| CSS Custom Property | Value | Role / Semantic Usage |
|---|---|---|
| `--bg-app` | `#090E19` | Root viewport and outer canvas |
| `--bg-sidebar` | `#0D1422` | Navigation sidebar background |
| `--bg-header` | `#111827` | Sticky navigation bar background |
| `--bg-surface` | `#151E2E` | Base card and panel surface |
| `--bg-elevated` | `#1B2638` | Hover states, modals, code blocks, dropdowns |
| `--bg-input` | `#0E1626` | Input fields, search bars, selects |
| `--text-primary` | `#F1F5F9` | Primary headings, KPI figures, active labels |
| `--text-secondary` | `#A8B4C7` | Body copy, descriptions, secondary metrics |
| `--text-muted` | `#8492A6` | Timestamps, metadata keys, placeholders |
| `--border-subtle` | `#1E293B` | Dividers, card borders, subtle grid lines |
| `--border-strong` | `#263449` | Active input borders, highlighted card strokes |
| `--accent-primary` | `#3B82F6` | Primary brand blue (actions, active tab, links) |
| `--accent-secondary`| `#14B8A6` | Secondary teal (services, highlights) |

### 2.2 Light Theme Tokens

| CSS Custom Property | Value | Role / Semantic Usage |
|---|---|---|
| `--bg-app` | `#F8FAFC` | Root viewport and outer canvas |
| `--bg-sidebar` | `#FFFFFF` | Navigation sidebar background |
| `--bg-header` | `#FFFFFF` | Sticky navigation bar background |
| `--bg-surface` | `#FFFFFF` | Base card and panel surface |
| `--bg-elevated` | `#F1F5F9` | Hover states, secondary panels |
| `--bg-input` | `#FFFFFF` | Input fields and selects |
| `--text-primary` | `#0F172A` | Primary headings, KPI figures |
| `--text-secondary` | `#475569` | Body copy, descriptions |
| `--text-muted` | `#64748B` | Timestamps, metadata keys |
| `--border-subtle` | `#E2E8F0` | Dividers, subtle borders |
| `--border-strong` | `#CBD5E1` | Active inputs, focused elements |
| `--accent-primary` | `#2563EB` | Primary brand blue |
| `--accent-secondary`| `#0D9488` | Secondary teal |

### 2.3 Semantic Observability Colors

| Severity / State | Token | Hex Color | Usage |
|---|---|---|---|
| **CRITICAL** | `--severity-critical` | `#A855F7` | Outages, service down, P0 incidents |
| **ERROR** | `--severity-error` | `#EF4444` | Unhandled exceptions, 5xx responses |
| **WARNING** | `--severity-warning` | `#F59E0B` | Degradation, rate limits, 4xx bursts |
| **INFO** | `--severity-info` | `#3B82F6` | Standard application lifecycle events |
| **DEBUG** | `--severity-debug` | `#8492A6` | Trace diagnostics, verbose runtime |
| **SUCCESS** | `--status-success` | `#10B981` | Healthy services, resolved incidents |
| **NEUTRAL** | `--text-muted` | `#8492A6` | Inactive, unknown, or standby state |

---

## 3. Typography System

The typography scale balances scanning velocity with technical legibility:

- **General Interface Font:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Technical & Log Monospace Font:** `JetBrains Mono, "Fira Code", Menlo, Consolas, monospace`

### Typography Hierarchy Scale

| Role | Font Size | Line Height | Weight | Letter Spacing | CSS Variable |
|---|---|---|---|---|---|
| **Display Title** | 32px | 1.2 | 700 | -0.02em | `--text-display` |
| **Page Heading** | 24px | 1.3 | 700 | -0.015em | `--text-page-title` |
| **Section Heading**| 18px | 1.4 | 600 | -0.01em | `--text-section` |
| **Card Heading** | 15px | 1.4 | 600 | 0.0em | `--text-card-title` |
| **Standard Body** | 14px | 1.5 | 400 | 0.0em | `--text-body` |
| **Body Small** | 13px | 1.5 | 400 / 500 | 0.0em | `--text-body-sm` |
| **Caption / Labels**| 12px | 1.4 | 500 | 0.01em | `--text-caption` |
| **Micro / Tags** | 11px | 1.3 | 600 | 0.02em | `--text-micro` |
| **Log Console** | 12.5px | 1.5 | 400 | 0.0em | Monospace (`.code-font`) |

### Tabular Numerals
All timestamps, KPI numbers, and latency figures use `.tabular-nums` (`font-variant-numeric: tabular-nums;`) to eliminate horizontal jitter during live telemetry polling.

---

## 4. Spacing, Sizing & Grid Layout System

### Base 4px Spacing Scale

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px
- `--space-16`: 64px

### Core Layout Dimensions

- **Expanded Sidebar Width:** 248px (`--sidebar-width`)
- **Collapsed Sidebar Width:** 72px (`--sidebar-collapsed-width`)
- **Header Height:** 64px (`--header-height`)
- **Main Viewport Padding:** 24px–32px
- **Card Internal Padding:** 20px (12px in compact density mode)
- **Standard Border Radius:** 8px (`--radius-md`) for cards, 6px (`--radius-sm`) for buttons, 12px (`--radius-lg`) for modals.

---

## 5. Component Library Catalog

All components are written in native React 18 with regular CSS.

| Component | Path | Description & Capabilities |
|---|---|---|
| **ThemeToggle** | `src/components/common/ThemeToggle.jsx` | Toggles between Dark, Light, and System modes with accessible tooltip. |
| **StatusBadge** | `src/components/common/StatusBadge.jsx` | Pulse indicator and semantic color text for health (healthy, warning, degraded, offline). |
| **ConnectionIndicator**| `src/components/common/ConnectionIndicator.jsx` | Live backend connectivity pill displaying status and round-trip HTTP ping latency. |
| **SectionHeader** | `src/components/common/SectionHeader.jsx` | Sub-page section banner with title, description, and action slot. |
| **ChartCard** | `src/components/common/ChartCard.jsx` | Wrapper for Recharts visualizations with header controls, date picker, loading skeleton, and empty states. |
| **CopyButton** | `src/components/common/CopyButton.jsx` | One-click clipboard copy button with transient checkmark confirmation animation. |
| **CodeBlock** | `src/components/common/CodeBlock.jsx` | Formatted monospace code container with language tag and copy action. |
| **SearchInput** | `src/components/common/SearchInput.jsx` | Debounced text filter with leading search icon and instant clear button. |
| **DateRangeSelector**| `src/components/common/DateRangeSelector.jsx` | Quick-select time window filter (15m, 1h, 6h, 24h, 7d). |
| **Tabs** | `src/components/common/Tabs.jsx` | Accessible horizontal tab navigator with active blue underline indicator. |
| **DropdownMenu** | `src/components/common/DropdownMenu.jsx` | Triggerable dropdown menu with outside-click dismissal and keyboard navigation. |
| **Drawer** | `src/components/common/Drawer.jsx` | Off-canvas side drawer with backdrop overlay for responsive mobile navigation. |
| **CommandPalette** | `src/components/common/CommandPalette.jsx` | Global `Cmd+K` / `Ctrl+K` modal search bar for instant route navigation and fuzzy filtering. |
| **ConfirmDialog** | `src/components/common/ConfirmDialog.jsx` | Modal confirmation prompt for destructive or state-changing actions. |
| **Timeline** | `src/components/common/Timeline.jsx` | Vertical chronological event stream with connected node circles and metadata. |
| **ProgressIndicator**| `src/components/common/ProgressIndicator.jsx` | Linear progress bar for ingestion runs and diagnostic task completion. |
| **DataTable** | `src/components/common/DataTable.jsx` | Sortable tabular data layout with pagination, hover rows, and empty state. |
| **LogRow** | `src/components/logs/LogRow.jsx` | Virtualized log row with severity badge, service tag, truncated trace ID, copy action, and expandable metadata drawer. |
| **LogTable** | `src/components/logs/LogTable.jsx` | Dense monospace log viewer table with sticky header and row selection. |

---

## 6. Accessibility & Keyboard Navigation (WCAG 2.1 AA)

1. **Keyboard Shortcuts:**
   - `Cmd+K` or `Ctrl+K`: Opens the Command Palette from anywhere in the application.
   - `Escape`: Closes open modals, drawers, dropdowns, and the Command Palette.
   - `ArrowUp` / `ArrowDown`: Navigates through list items in the Command Palette and dropdowns.
   - `Enter`: Activates the selected Command Palette item.
   - `Tab` / `Shift+Tab`: Natural logical focus progression across interactive controls.
2. **Focus Visibility:**
   - Standard `--focus-ring: 0 0 0 2px rgba(59, 130, 246, 0.4)` applied across all interactive buttons, inputs, and links.
3. **ARIA Semantics:**
   - Modals and drawers include `role="dialog"`, `aria-modal="true"`.
   - Error banners include `role="alert"`.
   - Tooltips include `role="tooltip"`.
   - Collapsible buttons include `aria-expanded` and `aria-label`.

---

## 7. Performance & Motion Standards

- Transitions use standard `0.15s cubic-bezier(0.4, 0, 0.2, 1)` easing for snappy, deterministic micro-interactions.
- Chart loading states use CSS skeleton pulse animations (`@keyframes pulse`) rather than jarring full-page loaders.
- Responsive container resizing is observed via standard `ResizeObserver` without layout thrashing.
- Redux / heavyweight state managers are omitted in favor of lightweight React Context (`ThemeContext`, `WorkspaceContext`), eliminating unnecessary re-renders.
