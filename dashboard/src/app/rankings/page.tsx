"use client";

// Renders a dense, sortable/filterable table showing rankings of all districts.
// Uses native virtualized rendering (only visible rows in DOM).

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import TopBar from "@/components/TopBar";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import QuadrantBadge from "@/components/QuadrantBadge";
import {
  loadDistrictData,
  getStateList,
  getMAIValue,
  getDemandValue,
  getRealizabilityValue,
  getQuadrant,
} from "@/lib/data";
import type { DistrictData, IndexType, TimeHorizon } from "@/lib/data";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import Link from "next/link";

type SortField =
  | "rank"
  | "district_name"
  | "state_name"
  | "mai"
  | "demand"
  | "realizability"
  | "confidence_score";
type SortDir = "asc" | "desc";

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDir }) {
  if (currentField !== field)
    return <ArrowUpDown size={12} className="text-muted" />;
  return direction === "asc" ? (
    <ArrowUp size={12} className="text-saffron" />
  ) : (
    <ArrowDown size={12} className="text-saffron" />
  );
}

const ROW_HEIGHT = 40;
const OVERSCAN = 5;

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RankingsPage() {
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);

  // Filters
  const [indexType, setIndexType] = useState<IndexType>("overall");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("current");
  const [stateFilter, setStateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("mai");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Virtualization
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

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

  // Measure container
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const height = node.getBoundingClientRect().height;
      setContainerHeight(Math.max(400, height));
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  // Filter + sort data
  const processedData = useMemo(() => {
    let filtered = districtData;

    if (stateFilter !== "all") {
      filtered = filtered.filter((d) => d.state_name === stateFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.district_name.toLowerCase().includes(q) ||
          d.state_name.toLowerCase().includes(q) ||
          d.lgd_district_code.toString().includes(q)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case "district_name":
          aVal = a.district_name;
          bVal = b.district_name;
          break;
        case "state_name":
          aVal = a.state_name;
          bVal = b.state_name;
          break;
        case "mai":
          aVal = getMAIValue(a, indexType, timeHorizon);
          bVal = getMAIValue(b, indexType, timeHorizon);
          break;
        case "demand":
          aVal = getDemandValue(a, indexType, timeHorizon);
          bVal = getDemandValue(b, indexType, timeHorizon);
          break;
        case "realizability":
          aVal = getRealizabilityValue(a, indexType, timeHorizon);
          bVal = getRealizabilityValue(b, indexType, timeHorizon);
          break;
        case "confidence_score":
          aVal = a.confidence_score;
          bVal = b.confidence_score;
          break;
        default:
          aVal = getMAIValue(a, indexType, timeHorizon);
          bVal = getMAIValue(b, indexType, timeHorizon);
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [districtData, stateFilter, searchQuery, sortField, sortDir, indexType, timeHorizon]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("desc");
      return field;
    });
  }, []);

  const maxMAI = useMemo(() => {
    if (processedData.length === 0) return 1;
    return Math.max(
      ...processedData.map((d) => getMAIValue(d, indexType, timeHorizon))
    );
  }, [processedData, indexType, timeHorizon]);

  // Virtualization math
  const totalHeight = processedData.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    processedData.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  );
  const visibleRows = processedData.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-saffron animate-pulse" />
          <span className="font-data text-xs text-muted">Loading…</span>
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

      {/* Filter Bar */}
      <div className="flex items-center gap-3 border-b border-hairline bg-surface px-6 py-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-1 bg-void rounded border border-hairline p-0.5">
          {(["overall", "chronic", "acute"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setIndexType(type)}
              className={`px-3 py-1.5 rounded font-data text-[11px] transition-colors min-h-[44px] ${
                indexType === type
                  ? "bg-surface-raised text-saffron"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-void rounded border border-hairline p-0.5">
          {(["current", "future"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeHorizon(t)}
              className={`px-3 py-1.5 rounded font-data text-[11px] transition-colors min-h-[44px] ${
                timeHorizon === t
                  ? "bg-surface-raised text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {t === "current" ? "Current" : "Future"}
            </button>
          ))}
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="bg-void border border-hairline rounded px-3 py-2 text-xs text-primary font-data focus:outline-none focus:border-saffron min-h-[44px]"
          aria-label="Filter by state"
        >
          <option value="all">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 bg-void border border-hairline rounded px-3 min-h-[44px] flex-1 max-w-xs">
          <Search size={14} className="text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search district…"
            className="bg-transparent text-xs text-primary font-data focus:outline-none w-full py-2"
            aria-label="Search districts"
          />
        </div>

        <span className="font-data text-[11px] text-muted ml-auto flex-shrink-0">
          {processedData.length} districts
        </span>
      </div>

      {/* Virtualized Table */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex flex-col">
        {/* Sticky Header */}
        <div className="flex items-center bg-surface border-b border-hairline flex-shrink-0">
          <div className="w-14 px-3 py-2">
            <button onClick={() => handleSort("rank")} className="flex items-center gap-1" aria-label="Sort by rank">
              <span className="font-data text-[10px] text-muted uppercase tracking-wider">#</span>
              <SortIcon field="rank" currentField={sortField} direction={sortDir} />
            </button>
          </div>
          <div className="flex-1 px-3 py-2">
            <button onClick={() => handleSort("district_name")} className="flex items-center gap-1" aria-label="Sort by district name">
              <span className="font-data text-[10px] text-muted uppercase tracking-wider">District</span>
              <SortIcon field="district_name" currentField={sortField} direction={sortDir} />
            </button>
          </div>
          <div className="w-36 px-3 py-2">
            <button onClick={() => handleSort("state_name")} className="flex items-center gap-1" aria-label="Sort by state">
              <span className="font-data text-[10px] text-muted uppercase tracking-wider">State</span>
              <SortIcon field="state_name" currentField={sortField} direction={sortDir} />
            </button>
          </div>
          <div className="w-56 px-3 py-2">
            <button onClick={() => handleSort("mai")} className="flex items-center gap-1 justify-end w-full" aria-label="Sort by MAI score">
              <span className="font-data text-[10px] text-muted uppercase tracking-wider">MAI Score</span>
              <SortIcon field="mai" currentField={sortField} direction={sortDir} />
            </button>
          </div>
          <div className="w-28 px-3 py-2">
            <button onClick={() => handleSort("demand")} className="flex items-center gap-1 justify-end w-full" aria-label="Sort by demand">
              <span className="font-data text-[10px] text-muted uppercase tracking-wider">Demand</span>
              <SortIcon field="demand" currentField={sortField} direction={sortDir} />
            </button>
          </div>
          <div className="w-28 px-3 py-2">
            <button onClick={() => handleSort("realizability")} className="flex items-center gap-1 justify-end w-full" aria-label="Sort by realizability">
              <span className="font-data text-[10px] text-muted uppercase tracking-wider">Realiz.</span>
              <SortIcon field="realizability" currentField={sortField} direction={sortDir} />
            </button>
          </div>
          <div className="w-28 px-3 py-2">
            <span className="font-data text-[10px] text-muted uppercase tracking-wider">Quadrant</span>
          </div>
          <div className="w-28 px-3 py-2">
            <button onClick={() => handleSort("confidence_score")} className="flex items-center gap-1" aria-label="Sort by confidence">
              <span className="font-data text-[10px] text-muted uppercase tracking-wider">Confidence</span>
              <SortIcon field="confidence_score" currentField={sortField} direction={sortDir} />
            </button>
          </div>
        </div>

        {/* Scrollable Rows */}
        {processedData.length > 0 ? (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto"
          >
            <div style={{ height: totalHeight, position: "relative" }}>
              {visibleRows.map((district, i) => {
                const absoluteIndex = startIndex + i;
                const mai = getMAIValue(district, indexType, timeHorizon);
                const demand = getDemandValue(district, indexType, timeHorizon);
                const realizability = getRealizabilityValue(district, indexType, timeHorizon);
                const quadrant = getQuadrant(district, indexType, timeHorizon);
                const barWidth = maxMAI > 0 ? (mai / maxMAI) * 100 : 0;

                return (
                  <div
                    key={district.lgd_district_code}
                    className="flex items-center border-b border-hairline/50 hover:bg-surface-raised/50 transition-colors absolute w-full"
                    style={{ top: absoluteIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    <div className="w-14 px-3 font-data text-xs text-muted">{absoluteIndex + 1}</div>
                    <div className="flex-1 min-w-0 px-3">
                      <Link
                        href={`/district/${district.lgd_district_code}`}
                        className="font-data text-xs text-primary hover:text-saffron transition-colors truncate block"
                      >
                        {district.district_name}
                      </Link>
                    </div>
                    <div className="w-36 px-3 font-data text-xs text-secondary truncate">
                      {district.state_name}
                    </div>
                    <div className="w-56 px-3 flex items-center gap-2 justify-end">
                      <div className="w-20 h-2 bg-void rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: "var(--accent-saffron)",
                          }}
                        />
                      </div>
                      <span className="font-data text-xs text-primary w-14 text-right">
                        {mai.toFixed(4)}
                      </span>
                    </div>
                    <div className="w-28 px-3 text-right font-data text-xs text-demand">
                      {demand.toFixed(4)}
                    </div>
                    <div className="w-28 px-3 text-right font-data text-xs text-realizability">
                      {realizability.toFixed(4)}
                    </div>
                    <div className="w-28 px-3">
                      <QuadrantBadge quadrant={quadrant} size="sm" />
                    </div>
                    <div className="w-28 px-3">
                      <ConfidenceBadge score={district.confidence_score} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <span className="font-data text-sm text-muted">
              No districts match your filters.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
