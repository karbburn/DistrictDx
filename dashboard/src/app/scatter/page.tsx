"use client";

// 2×2 Scatter Plot page: Demand × Realizability for all 785 districts.
// Same control rail as the map page; scatter fills the viewport.

import { useState, useEffect, useCallback, useReducer, useMemo } from "react";
import TopBar from "@/components/TopBar";
import ScatterPlot from "@/components/ScatterPlot";
import DistrictDrilldown from "@/components/DistrictDrilldown";
import {
  loadDistrictData,
  getDistrictByLgd,
  getStateList,
} from "@/lib/data";
import type { DistrictData } from "@/lib/data";
import { filterReducer, INITIAL_FILTERS } from "@/lib/filters";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Uses shared filterReducer from @/lib/filters

export default function ScatterPage() {
  // ── Data State ──────────────────────────────────────────────────────────────
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);

  // ── Filter State ────────────────────────────────────────────────────────────
  const [filters, dispatch] = useReducer(filterReducer, INITIAL_FILTERS);

  // ── Load Data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    loadDistrictData()
      .then((data) => {
        setDistrictData(data);
        setStates(getStateList(data));
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      });
  }, []);

  // ── State highlight ─────────────────────────────────────────────────────────
  const highlightedState = useMemo(() => {
    if (filters.stateFilter !== "all") return filters.stateFilter;
    return null;
  }, [filters.stateFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDistrictClick = useCallback(
    (lgdCode: string) => {
      const district = getDistrictByLgd(districtData, lgdCode);
      if (district) setSelectedDistrict(district);
    },
    [districtData]
  );

  const handleCloseDrilldown = useCallback(() => {
    setSelectedDistrict(null);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-saffron animate-pulse" />
          <span className="font-data text-xs text-muted tracking-wider">
            Loading 785 districts…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <span className="font-display text-xl text-primary">Something went wrong</span>
          <span className="font-data text-xs text-muted">{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-saffron/10 border border-saffron/40 text-saffron rounded font-data text-xs hover:bg-saffron/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-void text-primary font-sans">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Rail ──────────────────────────────────────────────────── */}
        <aside
          className={`flex flex-col border-r border-hairline bg-surface transition-all duration-200 flex-shrink-0 ${
            isSidebarCollapsed ? "w-12" : "w-72"
          }`}
          role="region"
          aria-label="Scatter controls"
        >
          <div className="flex h-10 items-center justify-end border-b border-hairline px-2">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={isSidebarCollapsed ? "Expand controls" : "Collapse controls"}
              aria-expanded={!isSidebarCollapsed}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col gap-5 p-4 overflow-y-auto flex-1">
              {/* Index Type */}
              <fieldset className="flex flex-col gap-2">
                <legend className="font-data text-[10px] uppercase tracking-wider text-muted">
                  Index Type
                </legend>
                <div className="flex flex-col gap-1">
                  {(["overall", "chronic", "acute"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => dispatch({ type: "SET_INDEX", indexType: type })}
                      className={`w-full text-left px-3 py-2 rounded font-data text-xs transition-colors border min-h-[44px] ${
                        filters.indexType === type
                          ? "bg-saffron/10 border-saffron/40 text-saffron"
                          : "border-transparent text-secondary hover:text-primary hover:bg-void"
                      }`}
                      aria-pressed={filters.indexType === type}
                    >
                      MAI_{type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Time Horizon */}
              <fieldset className="flex flex-col gap-2">
                <legend className="font-data text-[10px] uppercase tracking-wider text-muted">
                  Temporal Horizon
                </legend>
                <div className="grid grid-cols-2 gap-1 bg-void p-1 rounded border border-hairline">
                  {(["current", "future"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => dispatch({ type: "SET_TIME", timeHorizon: t })}
                      className={`py-2 rounded font-data text-[11px] text-center transition-colors min-h-[44px] ${
                        filters.timeHorizon === t
                          ? "bg-surface-raised text-primary"
                          : "text-secondary hover:text-primary"
                      }`}
                      aria-pressed={filters.timeHorizon === t}
                    >
                      {t === "current" ? "Current" : "Future"}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* State Filter */}
              <div className="flex flex-col gap-2">
                <label htmlFor="scatter-state-filter" className="font-data text-[10px] uppercase tracking-wider text-muted">
                  State Filter
                </label>
                <select
                  id="scatter-state-filter"
                  value={filters.stateFilter}
                  onChange={(e) => dispatch({ type: "SET_STATE", stateFilter: e.target.value })}
                  className="w-full bg-void border border-hairline rounded px-3 py-2 text-xs text-primary font-data focus:outline-none focus:border-saffron min-h-[44px]"
                >
                  <option value="all">All States ({districtData.length})</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Active View Summary */}
              <div className="border-t border-hairline pt-3 flex flex-col gap-1">
                <span className="font-data text-[10px] text-muted uppercase tracking-wider">Active View</span>
                <span className="font-data text-xs text-saffron">
                  MAI_{filters.indexType.charAt(0).toUpperCase() + filters.indexType.slice(1)} · {filters.timeHorizon === "current" ? "Current" : "Future (β=0.3)"}
                </span>
                <span className="font-data text-[10px] text-muted">
                  {filters.stateFilter === "all"
                    ? `${districtData.length} districts`
                    : `${districtData.filter((d) => d.state_name === filters.stateFilter).length} districts in ${filters.stateFilter}`}
                </span>
              </div>
            </div>
          )}

          {!isSidebarCollapsed && (
            <div className="p-3 border-t border-hairline font-data text-[10px] text-muted flex-shrink-0">
              <div>DistrictDx v1.0</div>
              <div>Demand × Realizability scatter</div>
            </div>
          )}
        </aside>

        {/* ── Scatter Area ────────────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden bg-void">
          <ScatterPlot
            districtData={districtData}
            indexType={filters.indexType}
            timeHorizon={filters.timeHorizon}
            highlightedState={highlightedState}
            onDistrictClick={handleDistrictClick}
            selectedDistrictCode={selectedDistrict?.lgd_district_code ?? null}
          />
        </main>

        {/* ── Right Drill-Down ──────────────────────────────────────────── */}
        {selectedDistrict && (
          <DistrictDrilldown
            district={selectedDistrict}
            indexType={filters.indexType}
            timeHorizon={filters.timeHorizon}
            onClose={handleCloseDrilldown}
          />
        )}
      </div>
    </div>
  );
}
