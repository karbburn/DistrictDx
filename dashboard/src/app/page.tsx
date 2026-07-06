"use client";

import { useState } from "react";

export default function Home() {
  // ── Layout & UI States ──────────────────────────────────────────────────────
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(true);

  // ── Filter States ──────────────────────────────────────────────────────────
  const [selectedTime, setSelectedTime] = useState<"current" | "future">("current");
  const [selectedIndex, setSelectedIndex] = useState<"overall" | "chronic" | "acute">("overall");
  const [stateFilter, setStateFilter] = useState("all");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-void text-primary font-sans">
      {/* ── Left Rail Control Panel ───────────────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-hairline bg-surface transition-all duration-300 ${
          isSidebarCollapsed ? "w-16" : "w-80"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-hairline px-4">
          {!isSidebarCollapsed && (
            <h1 className="font-display text-xl font-bold tracking-tight text-saffron">
              DistrictDx
            </h1>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isSidebarCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded border border-hairline hover:bg-surface-raised text-secondary hover:text-primary transition-colors font-data text-xs"
          >
            {isSidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        {/* Sidebar Controls */}
        <div className={`flex flex-col gap-6 p-4 overflow-y-auto flex-1 ${isSidebarCollapsed ? "hidden" : "block"}`}>
          {/* Index Selector */}
          <div className="flex flex-col gap-2">
            <span className="font-data text-xs uppercase tracking-wider text-muted">
              Select Index
            </span>
            <div className="flex flex-col gap-1">
              {(["overall", "chronic", "acute"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedIndex(type)}
                  className={`w-full text-left px-3 py-2 rounded font-data text-sm transition-all border ${
                    selectedIndex === type
                      ? "bg-saffron/10 border-saffron text-saffron"
                      : "border-transparent bg-void text-secondary hover:text-primary hover:border-hairline"
                  }`}
                >
                  MAI_{type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selector */}
          <div className="flex flex-col gap-2">
            <span className="font-data text-xs uppercase tracking-wider text-muted">
              Temporal Horizon
            </span>
            <div className="grid grid-cols-2 gap-1 bg-void p-1 rounded border border-hairline">
              <button
                onClick={() => setSelectedTime("current")}
                className={`py-1.5 rounded font-data text-xs text-center transition-all ${
                  selectedTime === "current"
                    ? "bg-surface-raised text-primary"
                    : "text-secondary hover:text-primary"
                }`}
              >
                Current
              </button>
              <button
                onClick={() => setSelectedTime("future")}
                className={`py-1.5 rounded font-data text-xs text-center transition-all ${
                  selectedTime === "future"
                    ? "bg-surface-raised text-primary"
                    : "text-secondary hover:text-primary"
                }`}
              >
                Future (Trend)
              </button>
            </div>
          </div>

          {/* State Filter */}
          <div className="flex flex-col gap-2">
            <span className="font-data text-xs uppercase tracking-wider text-muted">
              State Filter
            </span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full bg-void border border-hairline rounded px-3 py-2 text-sm text-primary font-sans focus:outline-none focus:border-saffron"
            >
              <option value="all">All States</option>
              <option value="maharashtra">Maharashtra</option>
              <option value="gujarat">Gujarat</option>
              <option value="kerala">Kerala</option>
              <option value="telangana">Telangana</option>
            </select>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-hairline font-data text-[10px] text-muted ${isSidebarCollapsed ? "hidden" : "block"}`}>
          <div>Sun Pharma Portfolio Matrix</div>
          <div>Version 1.0.0 (Decadal Trend)</div>
        </div>
      </aside>

      {/* ── Main Map Area ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-void">
        {/* Top Header/Status Bar */}
        <header className="flex h-16 items-center justify-between border-b border-hairline bg-surface px-6 z-10">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-demand animate-pulse" />
            <span className="font-data text-xs tracking-wider text-secondary">
              SYSTEM ONLINE // data loaded successfully
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrilldownOpen(!isDrilldownOpen)}
              aria-expanded={isDrilldownOpen}
              className="px-3 py-1 text-xs font-data border border-hairline rounded hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
            >
              {isDrilldownOpen ? "Hide Details" : "Show Details"}
            </button>
          </div>
        </header>

        {/* Hero Interactive Surface (Grid Fallback/Design Token Validator) */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-8">
          <div className="flex flex-col gap-2 border-b border-hairline pb-4">
            <h2 className="font-display text-4xl font-semibold tracking-tight text-primary">
              Control Room / Research Instrument
            </h2>
            <p className="text-secondary max-w-xl text-sm">
              Verify font families and custom color tokens dynamically rendering on the dashboard scaffold.
            </p>
          </div>

          {/* Design Token Validator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Color Swatches */}
            <div className="border border-hairline bg-surface rounded p-6 flex flex-col gap-4">
              <h3 className="font-display text-lg font-medium text-saffron border-b border-hairline pb-2">
                Aesthetic Color Tokens
              </h3>
              <div className="grid grid-cols-2 gap-3 font-data text-xs">
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-void border border-hairline" />
                  <span>bg-void (#0a0908)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-surface border border-hairline" />
                  <span>bg-surface (#14120f)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-surface-raised border border-hairline" />
                  <span>bg-surface-raised (#1c1915)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-saffron" />
                  <span className="text-saffron">saffron (#f97316)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-demand" />
                  <span className="text-demand">demand (#4ade80)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-realizability" />
                  <span className="text-realizability">realizability (#38bdf8)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-negative" />
                  <span className="text-negative">negative (#f87171)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-void rounded border border-hairline">
                  <div className="h-6 w-6 rounded bg-confidence-low" />
                  <span className="text-confidence-low">confidence-low (#57534e)</span>
                </div>
              </div>
            </div>

            {/* Typography Samples */}
            <div className="border border-hairline bg-surface rounded p-6 flex flex-col gap-4">
              <h3 className="font-display text-lg font-medium text-saffron border-b border-hairline pb-2">
                Typography Families
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <span className="font-data text-[10px] text-muted uppercase tracking-wider">
                    Fraunces (Display Heading)
                  </span>
                  <p className="font-display text-2xl font-bold italic tracking-tight">
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
                <div className="flex flex-col">
                  <span className="font-data text-[10px] text-muted uppercase tracking-wider">
                    IBM Plex Sans (UI Chrome/Body)
                  </span>
                  <p className="font-sans text-sm text-secondary">
                    Pharmaceutical Market Attractiveness Index (MAI) provides analytical clarity for strategic market positioning.
                  </p>
                </div>
                <div className="flex flex-col">
                  <span className="font-data text-[10px] text-muted uppercase tracking-wider">
                    JetBrains Mono (Monospace Data/Metrics)
                  </span>
                  <p className="font-data text-sm text-primary">
                    MAI_Overall = 0.5882 // 785/785 LGD nodes // p_val = 1.0000e+00
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Right-Side Slide-Over Panel (District Drill-Down Placeholder) ─────── */}
      <section
        className={`flex flex-col border-l border-hairline bg-surface transition-all duration-300 ${
          isDrilldownOpen ? "w-96" : "w-0 overflow-hidden border-l-0"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-hairline px-4 flex-shrink-0">
          <h2 className="font-display text-lg font-bold text-saffron">
            District Profile
          </h2>
          <button
            onClick={() => setIsDrilldownOpen(false)}
            aria-label="Close district profile panel"
            className="flex h-8 w-8 items-center justify-center rounded border border-hairline hover:bg-surface-raised text-secondary hover:text-primary transition-colors font-data text-xs"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Header info */}
          <div className="flex flex-col gap-1 border-b border-hairline pb-4">
            <h3 className="font-display text-2xl font-bold tracking-tight">
              Ahmedabad
            </h3>
            <span className="font-data text-xs text-secondary">
              State: Gujarat // LGD: 443
            </span>
          </div>

          {/* Scores breakdown */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-void p-3 rounded border border-hairline">
              <span className="font-sans text-sm text-secondary">MAI Overall</span>
              <span className="font-data text-lg font-bold text-saffron">0.5882</span>
            </div>
            <div className="flex items-center justify-between bg-void p-3 rounded border border-hairline">
              <span className="font-sans text-sm text-secondary">Demand Axis</span>
              <span className="font-data text-lg font-bold text-demand">0.6120</span>
            </div>
            <div className="flex items-center justify-between bg-void p-3 rounded border border-hairline">
              <span className="font-sans text-sm text-secondary">Realizability Axis</span>
              <span className="font-data text-lg font-bold text-realizability">0.5654</span>
            </div>
          </div>

          {/* Quadrant badge */}
          <div className="flex flex-col gap-2 bg-void p-4 rounded border border-hairline items-center text-center">
            <span className="font-data text-[10px] text-muted uppercase tracking-wider">
              Quadrant Status
            </span>
            <span className="font-display text-xl font-semibold text-primary">
              Star Market (Core Priority)
            </span>
            <p className="text-secondary text-xs font-sans max-w-xs mt-1">
              High Demand potential matched with strong infrastructure capability.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
