"use client";

// Compact Chronic vs Acute comparison for the district drill-down panel.
// Two horizontal bars, no Recharts needed.

import type { DistrictData, TimeHorizon } from "@/lib/data";

interface TherapyComparisonProps {
  district: DistrictData;
  timeHorizon: TimeHorizon;
}

export default function TherapyComparison({
  district,
  timeHorizon,
}: TherapyComparisonProps) {
  const chronic =
    timeHorizon === "future"
      ? district.Future_MAI_Chronic
      : district.MAI_Chronic;
  const acute =
    timeHorizon === "future"
      ? district.Future_MAI_Acute
      : district.MAI_Acute;

  const max = Math.max(chronic, acute, 0.01);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-data text-[10px] text-muted uppercase tracking-wider">
          Chronic
        </span>
        <span className="font-data text-xs text-demand">
          {chronic.toFixed(4)}
        </span>
      </div>
      <div className="h-2 bg-void rounded overflow-hidden">
        <div
          className="h-full bg-demand rounded"
          style={{ width: `${Math.max(0, Math.min(100, (chronic / max) * 100))}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="font-data text-[10px] text-muted uppercase tracking-wider">
          Acute
        </span>
        <span className="font-data text-xs text-realizability">
          {acute.toFixed(4)}
        </span>
      </div>
      <div className="h-2 bg-void rounded overflow-hidden">
        <div
          className="h-full bg-realizability rounded"
          style={{ width: `${Math.max(0, Math.min(100, (acute / max) * 100))}%` }}
        />
      </div>
    </div>
  );
}
