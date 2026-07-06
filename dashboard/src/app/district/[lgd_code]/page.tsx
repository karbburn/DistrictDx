"use client";

// Loads the home page map with the specified district's slide-over pre-opened
// to provide URL shareability.

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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

export default function DistrictPage({
  params,
}: {
  params: Promise<{ lgd_code: string }>;
}) {
  const { lgd_code } = use(params);
  const lgdCode = parseInt(lgd_code, 10);
  const router = useRouter();

  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [geoData, setGeoData] = useState<FeatureCollection<
    Geometry,
    GeoDistrictProperties
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);

  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictData | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [indexType, setIndexType] = useState<IndexType>("overall");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("current");
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    Promise.all([loadDistrictData(), loadGeoData()])
      .then(([data, geo]) => {
        setDistrictData(data);
        setGeoData(geo);
        setStates(getStateList(data));

        // Pre-open the drill-down for the specified district
        const district = getDistrictByLgd(data, lgdCode);
        if (district) {
          setSelectedDistrict(district);
          // Auto-filter to the district's state for context
          setStateFilter(district.state_name);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      });
  }, [lgdCode]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-saffron animate-pulse" />
          <span className="font-data text-xs text-muted tracking-wider">
            Loading district data…
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

  if (!selectedDistrict) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <span className="font-display text-xl text-primary">
            District Not Found
          </span>
          <span className="font-data text-xs text-muted">
            LGD code {lgdCode} not found in the dataset.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-void text-primary font-sans">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Collapsed sidebar */}
        <aside
          className={`flex flex-col border-r border-hairline bg-surface transition-all duration-200 flex-shrink-0 ${
            isSidebarCollapsed ? "w-12" : "w-72"
          }`}
        >
          <div className="flex h-10 items-center justify-end border-b border-hairline px-2">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={
                isSidebarCollapsed ? "Expand controls" : "Collapse controls"
              }
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
            >
              {isSidebarCollapsed ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronLeft size={14} />
              )}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col gap-5 p-4 overflow-y-auto flex-1">
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
            </div>
          )}
        </aside>

        {/* Map */}
        <main className="flex-1 relative overflow-hidden bg-void">
          {geoData && (
            <ChoroplethMap
              geoData={geoData}
              districtData={districtData}
              indexType={indexType}
              timeHorizon={timeHorizon}
              stateFilter={stateFilter}
              onDistrictClick={(code) => {
                const d = getDistrictByLgd(districtData, code);
                if (d) setSelectedDistrict(d);
              }}
              selectedDistrictCode={selectedDistrict.lgd_district_code}
              isInitialLoad={false}
            />
          )}
        </main>

        {/* Pre-opened drill-down */}
        <DistrictDrilldown
          district={selectedDistrict}
          indexType={indexType}
          timeHorizon={timeHorizon}
          onClose={() => router.push("/")}
        />
      </div>
    </div>
  );
}
