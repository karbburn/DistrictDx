"use client";

// Home page showing the full-bleed India choropleth map.
// Features a collapsible left control rail and right-side district drill-down slide-over.

import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "@/components/TopBar";
import ChoroplethMap from "@/components/ChoroplethMap";
import DistrictDrilldown from "@/components/DistrictDrilldown";
import {
  loadDistrictData,
  loadGeoData,
  getDistrictByLgd,
  getStateList,
} from "@/lib/data";
import type {
  DistrictData,
  IndexType,
  TimeHorizon,
  GeoDistrictProperties,
} from "@/lib/data";
import type { FeatureCollection, Geometry } from "geojson";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  // ── Data State ──────────────────────────────────────────────────────────────
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [geoData, setGeoData] = useState<FeatureCollection<
    Geometry,
    GeoDistrictProperties
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(
    null
  );

  // ── Filter State ────────────────────────────────────────────────────────────
  const [indexType, setIndexType] = useState<IndexType>("overall");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("current");
  const [stateFilter, setStateFilter] = useState("all");

  // ── Track initial load for stagger animation ────────────────────────────────
  const isInitialLoadRef = useRef(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // After first render, disable stagger for future filter changes
  useEffect(() => {
    if (!loading && isInitialLoadRef.current) {
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
        setIsInitialLoad(false);
      }, 2000); // Wait for stagger animation to complete
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // ── Load Data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([loadDistrictData(), loadGeoData()])
      .then(([data, geo]) => {
        setDistrictData(data);
        setGeoData(geo);
        setStates(getStateList(data));
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      });
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDistrictClick = useCallback(
    (lgdCode: number) => {
      const district = getDistrictByLgd(districtData, lgdCode);
      if (district) {
        setSelectedDistrict(district);
      }
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
        {/* ── Left Rail Control Panel ──────────────────────────────────── */}
        <aside
          className={`flex flex-col border-r border-hairline bg-surface transition-all duration-200 flex-shrink-0 ${
            isSidebarCollapsed ? "w-12" : "w-72"
          }`}
          role="region"
          aria-label="Map controls"
        >
          {/* Collapse Toggle */}
          <div className="flex h-10 items-center justify-end border-b border-hairline px-2">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={
                isSidebarCollapsed ? "Expand controls" : "Collapse controls"
              }
              aria-expanded={!isSidebarCollapsed}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
            >
              {isSidebarCollapsed ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronLeft size={14} />
              )}
            </button>
          </div>

          {/* Controls */}
          {!isSidebarCollapsed && (
            <div className="flex flex-col gap-5 p-4 overflow-y-auto flex-1">
              {/* Index Type Selector */}
              <fieldset className="flex flex-col gap-2">
                <legend className="font-data text-[10px] uppercase tracking-wider text-muted">
                  Index Type
                </legend>
                <div className="flex flex-col gap-1">
                  {(["overall", "chronic", "acute"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setIndexType(type)}
                      className={`w-full text-left px-3 py-2 rounded font-data text-xs transition-colors border min-h-[44px] ${
                        indexType === type
                          ? "bg-saffron/10 border-saffron/40 text-saffron"
                          : "border-transparent text-secondary hover:text-primary hover:bg-void"
                      }`}
                      aria-pressed={indexType === type}
                    >
                      MAI_{type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Time Horizon Toggle */}
              <fieldset className="flex flex-col gap-2">
                <legend className="font-data text-[10px] uppercase tracking-wider text-muted">
                  Temporal Horizon
                </legend>
                <div className="grid grid-cols-2 gap-1 bg-void p-1 rounded border border-hairline">
                  {(["current", "future"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeHorizon(t)}
                      className={`py-2 rounded font-data text-[11px] text-center transition-colors min-h-[44px] ${
                        timeHorizon === t
                          ? "bg-surface-raised text-primary"
                          : "text-secondary hover:text-primary"
                      }`}
                      aria-pressed={timeHorizon === t}
                    >
                      {t === "current" ? "Current" : "Future"}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* State Filter */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="state-filter"
                  className="font-data text-[10px] uppercase tracking-wider text-muted"
                >
                  State Filter
                </label>
                <select
                  id="state-filter"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full bg-void border border-hairline rounded px-3 py-2 text-xs text-primary font-data focus:outline-none focus:border-saffron min-h-[44px]"
                >
                  <option value="all">All States ({districtData.length})</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Filter Summary */}
              <div className="border-t border-hairline pt-3 flex flex-col gap-1">
                <span className="font-data text-[10px] text-muted uppercase tracking-wider">
                  Active View
                </span>
                <span className="font-data text-xs text-saffron">
                  MAI_{indexType.charAt(0).toUpperCase() + indexType.slice(1)} ·{" "}
                  {timeHorizon === "current" ? "Current" : "Future (β=0.3)"}
                </span>
                <span className="font-data text-[10px] text-muted">
                  {stateFilter === "all"
                    ? `${districtData.length} districts`
                    : `${districtData.filter((d) => d.state_name === stateFilter).length} districts in ${stateFilter}`}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          {!isSidebarCollapsed && (
            <div className="p-3 border-t border-hairline font-data text-[10px] text-muted flex-shrink-0">
              <div>DistrictDx v1.0</div>
              <div>785 LGD districts · Census + NFHS data</div>
            </div>
          )}
        </aside>

        {/* ── Map Area ─────────────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden bg-void">
          {geoData && (
            <ChoroplethMap
              geoData={geoData}
              districtData={districtData}
              indexType={indexType}
              timeHorizon={timeHorizon}
              stateFilter={stateFilter}
              onDistrictClick={handleDistrictClick}
              selectedDistrictCode={
                selectedDistrict?.lgd_district_code ?? null
              }
              isInitialLoad={isInitialLoad}
            />
          )}
        </main>

        {/* ── Right Slide-Over Drill-Down ───────────────────────────── */}
        {selectedDistrict && (
          <DistrictDrilldown
            district={selectedDistrict}
            indexType={indexType}
            timeHorizon={timeHorizon}
            onClose={handleCloseDrilldown}
          />
        )}
      </div>
    </div>
  );
}
