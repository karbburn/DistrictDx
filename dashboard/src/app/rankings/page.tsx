"use client";

// ── Rankings Page: Dense Sortable Table ───────────────────────────────────────
// Per DESIGN §4: dense data table, monospace figures, sticky header,
// sortable columns, confidence-flag column always visible (dot + label).
// Per DESIGN §5: horizontal bars, monospace value labels right-aligned,
//   no 3D effects, no drop shadows.
// Per DESIGN §7: touch targets ≥44px on mobile.

import { useState, useEffect, useMemo } from "react";
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

export default function RankingsPage() {
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<string[]>([]);

  // Filters
  const [indexType, setIndexType] = useState<IndexType>("overall");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("current");
  const [stateFilter, setStateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("mai");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    loadDistrictData().then((data) => {
      setDistrictData(data);
      setStates(getStateList(data));
      setLoading(false);
    });
  }, []);

  // Filter + sort data
  const processedData = useMemo(() => {
    let filtered = districtData;

    // State filter
    if (stateFilter !== "all") {
      filtered = filtered.filter((d) => d.state_name === stateFilter);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.district_name.toLowerCase().includes(q) ||
          d.state_name.toLowerCase().includes(q) ||
          d.lgd_district_code.toString().includes(q)
      );
    }

    // Sort
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

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown size={12} className="text-muted" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-saffron" />
    ) : (
      <ArrowDown size={12} className="text-saffron" />
    );
  };

  // Max MAI value for bar scaling
  const maxMAI = useMemo(() => {
    if (processedData.length === 0) return 1;
    return Math.max(
      ...processedData.map((d) => getMAIValue(d, indexType, timeHorizon))
    );
  }, [processedData, indexType, timeHorizon]);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-void text-primary font-sans">
      <TopBar />

      {/* Filter Bar */}
      <div className="flex items-center gap-3 border-b border-hairline bg-surface px-6 py-3 flex-wrap flex-shrink-0">
        {/* Index type */}
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

        {/* Time */}
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

        {/* State filter */}
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

        {/* Search */}
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

        {/* Count */}
        <span className="font-data text-[11px] text-muted ml-auto flex-shrink-0">
          {processedData.length} districts
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full table-dense" role="grid">
          <thead>
            <tr>
              <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider w-14">
                <button
                  onClick={() => handleSort("rank")}
                  className="flex items-center gap-1 min-h-[44px]"
                  aria-label="Sort by rank"
                >
                  # <SortIcon field="rank" />
                </button>
              </th>
              <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider">
                <button
                  onClick={() => handleSort("district_name")}
                  className="flex items-center gap-1 min-h-[44px]"
                  aria-label="Sort by district name"
                >
                  District <SortIcon field="district_name" />
                </button>
              </th>
              <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider">
                <button
                  onClick={() => handleSort("state_name")}
                  className="flex items-center gap-1 min-h-[44px]"
                  aria-label="Sort by state"
                >
                  State <SortIcon field="state_name" />
                </button>
              </th>
              <th className="text-right font-data text-[10px] text-muted uppercase tracking-wider w-56">
                <button
                  onClick={() => handleSort("mai")}
                  className="flex items-center gap-1 justify-end min-h-[44px] w-full"
                  aria-label="Sort by MAI score"
                >
                  MAI Score <SortIcon field="mai" />
                </button>
              </th>
              <th className="text-right font-data text-[10px] text-muted uppercase tracking-wider w-28">
                <button
                  onClick={() => handleSort("demand")}
                  className="flex items-center gap-1 justify-end min-h-[44px] w-full"
                  aria-label="Sort by demand"
                >
                  Demand <SortIcon field="demand" />
                </button>
              </th>
              <th className="text-right font-data text-[10px] text-muted uppercase tracking-wider w-28">
                <button
                  onClick={() => handleSort("realizability")}
                  className="flex items-center gap-1 justify-end min-h-[44px] w-full"
                  aria-label="Sort by realizability"
                >
                  Realiz. <SortIcon field="realizability" />
                </button>
              </th>
              <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider w-28">
                Quadrant
              </th>
              <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider w-28">
                <button
                  onClick={() => handleSort("confidence_score")}
                  className="flex items-center gap-1 min-h-[44px]"
                  aria-label="Sort by confidence"
                >
                  Confidence <SortIcon field="confidence_score" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {processedData.map((district, idx) => {
              const mai = getMAIValue(district, indexType, timeHorizon);
              const demand = getDemandValue(district, indexType, timeHorizon);
              const realizability = getRealizabilityValue(
                district,
                indexType,
                timeHorizon
              );
              const quadrant = getQuadrant(district, indexType, timeHorizon);
              const barWidth = maxMAI > 0 ? (mai / maxMAI) * 100 : 0;

              return (
                <tr
                  key={district.lgd_district_code}
                  className="border-b border-hairline/50 hover:bg-surface-raised/50 transition-colors"
                >
                  <td className="font-data text-xs text-muted">{idx + 1}</td>
                  <td>
                    <Link
                      href={`/district/${district.lgd_district_code}`}
                      className="font-data text-xs text-primary hover:text-saffron transition-colors"
                    >
                      {district.district_name}
                    </Link>
                  </td>
                  <td className="font-data text-xs text-secondary">
                    {district.state_name}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {/* Inline horizontal bar */}
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
                  </td>
                  <td className="text-right font-data text-xs text-demand">
                    {demand.toFixed(4)}
                  </td>
                  <td className="text-right font-data text-xs text-realizability">
                    {realizability.toFixed(4)}
                  </td>
                  <td>
                    <QuadrantBadge quadrant={quadrant} size="sm" />
                  </td>
                  <td>
                    <ConfidenceBadge
                      score={district.confidence_score}
                      size="sm"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {processedData.length === 0 && (
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
