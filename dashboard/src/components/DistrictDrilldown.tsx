"use client";

// Right-side slide-over on top of the map, NOT a full page nav.
// Uses ease-out transitions and respects prefers-reduced-motion.

import { X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import ConfidenceBadge from "./ConfidenceBadge";
import QuadrantBadge from "./QuadrantBadge";
import TherapyComparison from "./TherapyComparison";
import type { DistrictData, IndexType, TimeHorizon } from "@/lib/data";
import {
  getMAIValue,
  getDemandValue,
  getRealizabilityValue,
  getQuadrant,
} from "@/lib/data";

interface DistrictDrilldownProps {
  district: DistrictData;
  indexType: IndexType;
  timeHorizon: TimeHorizon;
  onClose: () => void;
}

function ScoreRow({
  label,
  value,
  color,
  maxValue = 1,
}: {
  label: string;
  value: number;
  color: string;
  maxValue?: number;
}) {
  const pct = Math.min(100, (value / maxValue) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs text-secondary">{label}</span>
        <span className="font-data text-sm" style={{ color }}>
          {value.toFixed(4)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-void rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function DistrictDrilldown({
  district,
  indexType,
  timeHorizon,
  onClose,
}: DistrictDrilldownProps) {
  const mai = getMAIValue(district, indexType, timeHorizon);
  const demand = getDemandValue(district, indexType, timeHorizon);
  const realizability = getRealizabilityValue(district, indexType, timeHorizon);
  const quadrant = getQuadrant(district, indexType, timeHorizon);

  // Sub-domain bar chart data
  const subDomainData = [
    {
      name: "Demand (Chronic)",
      value: district.Demand_Chronic,
      color: "var(--data-demand)",
    },
    {
      name: "Demand (Acute)",
      value: district.Demand_Acute,
      color: "var(--data-demand)",
    },
    {
      name: "Realiz. (Chronic)",
      value: district.Realizability_Chronic,
      color: "var(--data-realizability)",
    },
    {
      name: "Realiz. (Acute)",
      value: district.Realizability_Acute,
      color: "var(--data-realizability)",
    },
  ];

  // Future vs current comparison
  const currentMAI = getMAIValue(district, indexType, "current");
  const futureMAI = getMAIValue(district, indexType, "future");
  const delta = futureMAI - currentMAI;

  return (
    <section
      className="slide-over-enter flex flex-col border-l border-hairline bg-surface h-full w-[400px] max-w-[90vw] flex-shrink-0 overflow-hidden"
      role="complementary"
      aria-label="District detail panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4 flex-shrink-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight text-primary truncate">
            {district.district_name}
          </h2>
          <span className="font-data text-[11px] text-muted">
            {district.state_name} · LGD {district.lgd_district_code}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close district panel"
          className="flex h-9 w-9 items-center justify-center rounded border border-hairline hover:bg-surface-raised text-secondary hover:text-primary transition-colors flex-shrink-0 ml-3"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Primary Score */}
        <div className="flex items-center justify-between bg-void p-4 rounded border border-hairline">
          <div className="flex flex-col gap-0.5">
            <span className="font-data text-[10px] text-muted uppercase tracking-wider">
              {indexType === "overall"
                ? "MAI Overall"
                : indexType === "chronic"
                  ? "MAI Chronic"
                  : "MAI Acute"}
            </span>
            <span className="font-data text-2xl font-bold text-saffron">
              {mai.toFixed(4)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <QuadrantBadge quadrant={quadrant} size="sm" />
            <ConfidenceBadge
              score={district.confidence_score}
              showScore
              size="sm"
            />
          </div>
        </div>

        {/* Axis Scores */}
        <div className="flex flex-col gap-3">
          <span className="font-data text-[10px] text-muted uppercase tracking-wider">
            Axis Breakdown
          </span>
          <ScoreRow
            label="Demand"
            value={demand}
            color="var(--data-demand)"
          />
          <ScoreRow
            label="Realizability"
            value={realizability}
            color="var(--data-realizability)"
          />
        </div>

        {/* Sub-Domain Chart */}
        <div className="flex flex-col gap-2">
          <span className="font-data text-[10px] text-muted uppercase tracking-wider">
            Sub-Domain Scores
          </span>
          <div className="bg-void rounded border border-hairline p-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                layout="vertical"
                data={subDomainData}
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                barSize={14}
              >
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tick={{ fontSize: 10, fill: "#6b6459", fontFamily: "var(--font-jetbrains-mono)" }}
                  axisLine={{ stroke: "#2a2620" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 10, fill: "#a8a093", fontFamily: "var(--font-jetbrains-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#14120f",
                    border: "1px solid #2a2620",
                    borderRadius: 4,
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 11,
                    color: "#f2ede2",
                  }}
                  formatter={(value) => [Number(value).toFixed(4), "Score"]}
                  cursor={{ fill: "rgba(249, 115, 22, 0.05)" }}
                />
                <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                  {subDomainData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Therapy Comparison */}
        <div className="flex flex-col gap-2">
          <span className="font-data text-[10px] text-muted uppercase tracking-wider">
            Therapy Comparison
          </span>
          <div className="bg-void rounded border border-hairline p-3">
            <TherapyComparison district={district} timeHorizon={timeHorizon} />
          </div>
        </div>

        {/* Future Projection */}
        <div className="flex flex-col gap-2">
          <span className="font-data text-[10px] text-muted uppercase tracking-wider">
            Trend Projection (β=0.3)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-void rounded border border-hairline p-3 flex flex-col items-center gap-0.5">
              <span className="font-data text-[10px] text-muted">Current</span>
              <span className="font-data text-sm text-primary">
                {currentMAI.toFixed(4)}
              </span>
            </div>
            <div className="bg-void rounded border border-hairline p-3 flex flex-col items-center gap-0.5">
              <span className="font-data text-[10px] text-muted">Future</span>
              <span className="font-data text-sm text-primary">
                {futureMAI.toFixed(4)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 font-data text-xs">
            <span className="text-muted">Δ</span>
            <span
              className={delta >= 0 ? "text-demand" : "text-negative"}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Key Indicators */}
        <div className="flex flex-col gap-2">
          <span className="font-data text-[10px] text-muted uppercase tracking-wider">
            Key Indicators
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "Population",
                value: district.census_total_population
                  ? (district.census_total_population / 1e6).toFixed(2) + "M"
                  : "N/A",
              },
              {
                label: "Literacy",
                value: district.literacy_rate
                  ? district.literacy_rate.toFixed(1) + "%"
                  : "N/A",
              },
              {
                label: "Sex Ratio",
                value: district.sex_ratio
                  ? district.sex_ratio.toFixed(0)
                  : "N/A",
              },
              {
                label: "Nightlight",
                value: district.nightlight_log_mean
                  ? district.nightlight_log_mean.toFixed(3)
                  : "N/A",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-void rounded border border-hairline p-2.5 flex flex-col gap-0.5"
              >
                <span className="font-data text-[10px] text-muted">
                  {item.label}
                </span>
                <span className="font-data text-sm text-primary">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-hairline flex-shrink-0">
        <span className="font-data text-[10px] text-muted">
          Confidence: {(district.confidence_score * 100).toFixed(0)}% of
          variables sourced at district level
        </span>
      </div>
    </section>
  );
}
