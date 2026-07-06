"use client";

// 2×2 Scatter Plot: Demand (x) × Realizability (y) for all 785 districts.
// - Quadrant background tints at 8% opacity
// - National median dashed hairlines
// - Point size = log-scaled population, color = quadrant
// - State highlight dims non-matching districts
// - Keyboard navigable, accessible legend

import { useMemo, useRef, useState, useEffect, useCallback, memo } from "react";
import type { DistrictData, IndexType, TimeHorizon } from "@/lib/data";
import { getDemandValue, getRealizabilityValue, getQuadrant } from "@/lib/data";
import { getQuadrantTints } from "@/lib/colors";

const QUADRANT_TINTS = getQuadrantTints();

// ── Layout Constants ────────────────────────────────────────────────────────

const PADDING = { top: 40, right: 40, bottom: 60, left: 90 };
const MIN_POINT_R = 1.5;
const MAX_POINT_R = 7;

// ── Quadrant colors (CSS variables for consistency) ─────────────────────────

const QUADRANT_COLORS: Record<string, string> = {
  Star: "var(--accent-saffron)",
  Emerging: "var(--data-demand)",
  Underserved: "var(--data-realizability)",
  Deprioritize: "var(--text-muted)",
};

// ── Single Point ────────────────────────────────────────────────────────────

interface ScatterPointProps {
  cx: number;
  cy: number;
  r: number;
  color: string;
  opacity: number;
  code: string;
  name: string;
  state: string;
  isSelected: boolean;
  onClick: (code: string) => void;
  onHover: (code: string | null) => void;
}

const ScatterPoint = memo(function ScatterPoint({
  cx,
  cy,
  r,
  color,
  opacity,
  code,
  name,
  state,
  isSelected,
  onClick,
  onHover,
}: ScatterPointProps) {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    onHover(code);
  }, [code, onHover]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    onClick(code);
  }, [code, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(code);
      }
    },
    [code, onClick]
  );

  const displayR = hovered ? r + 2 : r;
  const strokeColor = isSelected
    ? "var(--accent-saffron)"
    : hovered
      ? "var(--text-primary)"
      : "var(--bg-void)";
  const strokeWidth = isSelected ? 2 : hovered ? 1.5 : 0.5;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={displayR}
      fill={color}
      fillOpacity={opacity}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      tabIndex={0}
      role="button"
      aria-label={`${name}, ${state}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      cursor="pointer"
      style={{ transition: "r 0.1s ease" }}
    />
  );
});

// ── Main Scatter Component ──────────────────────────────────────────────────

export interface ScatterPlotProps {
  districtData: DistrictData[];
  indexType: IndexType;
  timeHorizon: TimeHorizon;
  highlightedState: string | null;
  onDistrictClick: (lgdCode: string) => void;
  selectedDistrictCode: string | null;
}

export default function ScatterPlot({
  districtData,
  indexType,
  timeHorizon,
  highlightedState,
  onDistrictClick,
  selectedDistrictCode,
}: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 700 });
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  // Responsive sizing
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(400, width), height: Math.max(300, height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Plot area
  const plotW = dimensions.width - PADDING.left - PADDING.right;
  const plotH = dimensions.height - PADDING.top - PADDING.bottom;

  // Extract demand/realizability values
  const points = useMemo(() => {
    return districtData.map((d) => ({
      code: d.lgd_district_code,
      name: d.district_name,
      state: d.state_name,
      demand: getDemandValue(d, indexType, timeHorizon),
      realizability: getRealizabilityValue(d, indexType, timeHorizon),
      population: d.census_total_population,
      quadrant: getQuadrant(d, indexType, timeHorizon),
    }));
  }, [districtData, indexType, timeHorizon]);

  // National medians for quadrant lines
  const [medianDemand, medianRealizability] = useMemo(() => {
    const demands = points.map((p) => p.demand).filter((v) => !isNaN(v)).sort((a, b) => a - b);
    const reals = points.map((p) => p.realizability).filter((v) => !isNaN(v)).sort((a, b) => a - b);
    if (demands.length === 0 || reals.length === 0) return [0.5, 0.5];
    const mid = Math.floor(demands.length / 2);
    const md = demands.length % 2 ? demands[mid] : (demands[mid - 1] + demands[mid]) / 2;
    const mr = reals.length % 2 ? reals[mid] : (reals[mid - 1] + reals[mid]) / 2;
    return [md, mr];
  }, [points]);

  // Scale functions
  const xScale = useCallback(
    (v: number) => PADDING.left + (v / 1) * plotW,
    [plotW]
  );
  const yScale = useCallback(
    (v: number) => PADDING.top + plotH - (v / 1) * plotH,
    [plotH]
  );

  // Population range for size scaling
  const [minPop, maxPop] = useMemo(() => {
    let min = Infinity, max = -Infinity;
    points.forEach((p) => {
      if (p.population > 0 && p.population < min) min = p.population;
      if (p.population > max) max = p.population;
    });
    return [min || 1, max || 1];
  }, [points]);

  const pointRadius = useCallback(
    (pop: number) => {
      const logMin = Math.log(Math.max(minPop, 1));
      const logMax = Math.log(Math.max(maxPop, 1));
      const logVal = Math.log(Math.max(pop, 1));
      const t = logMax > logMin ? (logVal - logMin) / (logMax - logMin) : 0.5;
      return MIN_POINT_R + t * (MAX_POINT_R - MIN_POINT_R);
    },
    [minPop, maxPop]
  );

  // Quadrant tints (static, computed once at module level)

  // Compute positioned points
  const positionedPoints = useMemo(() => {
    return points.map((p) => ({
      ...p,
      cx: xScale(p.demand),
      cy: yScale(p.realizability),
      r: pointRadius(p.population),
      color: QUADRANT_COLORS[p.quadrant] || "#6b6459",
      opacity: highlightedState && p.state !== highlightedState ? 0.12 : 0.75,
    }));
  }, [points, xScale, yScale, pointRadius, highlightedState]);

  // Hovered district info
  const hoveredDistrict = hoveredCode
    ? positionedPoints.find((p) => p.code === hoveredCode)
    : null;

  // Tick marks
  const ticks = useMemo(() => {
    const result = [];
    for (let i = 0; i <= 10; i++) {
      const v = i / 10;
      result.push({ v, x: xScale(v), y: yScale(v) });
    }
    return result;
  }, [xScale, yScale]);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
        role="img"
        aria-label={`Demand vs Realizability scatter plot for ${indexType} index`}
      >
        {/* Quadrant background tints */}
        <rect
          x={xScale(medianDemand)}
          y={PADDING.top}
          width={xScale(1) - xScale(medianDemand)}
          height={yScale(medianRealizability) - PADDING.top}
          fill={QUADRANT_TINTS.starBg}
        />
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={xScale(medianDemand) - PADDING.left}
          height={yScale(medianRealizability) - PADDING.top}
          fill={QUADRANT_TINTS.emergingBg}
        />
        <rect
          x={xScale(medianDemand)}
          y={yScale(medianRealizability)}
          width={xScale(1) - xScale(medianDemand)}
          height={yScale(0) - yScale(medianRealizability)}
          fill={QUADRANT_TINTS.underservedBg}
        />
        <rect
          x={PADDING.left}
          y={yScale(medianRealizability)}
          width={xScale(medianDemand) - PADDING.left}
          height={yScale(0) - yScale(medianRealizability)}
          fill={QUADRANT_TINTS.deprioritizeBg}
        />

        {/* Quadrant labels */}
        <text x={xScale((1 + medianDemand) / 2)} y={PADDING.top + 18} textAnchor="middle" className="font-data" fontSize="10" fill="#f97316" opacity="0.6">Star Market</text>
        <text x={xScale(medianDemand / 2)} y={PADDING.top + 18} textAnchor="middle" className="font-data" fontSize="10" fill="#4ade80" opacity="0.6">Emerging</text>
        <text x={xScale((1 + medianDemand) / 2)} y={yScale(0) - 10} textAnchor="middle" className="font-data" fontSize="10" fill="#38bdf8" opacity="0.6">Underserved</text>
        <text x={xScale(medianDemand / 2)} y={yScale(0) - 10} textAnchor="middle" className="font-data" fontSize="10" fill="#6b6459" opacity="0.6">Deprioritize</text>

        {/* Median lines */}
        <line
          x1={xScale(medianDemand)}
          y1={PADDING.top}
          x2={xScale(medianDemand)}
          y2={yScale(0)}
          stroke="var(--text-muted)"
          strokeDasharray="4 4"
          strokeWidth="0.7"
          opacity="0.5"
        />
        <line
          x1={PADDING.left}
          y1={yScale(medianRealizability)}
          x2={xScale(1)}
          y2={yScale(medianRealizability)}
          stroke="var(--text-muted)"
          strokeDasharray="4 4"
          strokeWidth="0.7"
          opacity="0.5"
        />

        {/* Median labels */}
        <g>
          <rect
            x={xScale(medianDemand) - 30}
            y={PADDING.top + 2}
            width={60}
            height={14}
            fill="var(--surface)"
            rx={2}
          />
          <text
            x={xScale(medianDemand)}
            y={PADDING.top + 12}
            textAnchor="middle"
            className="font-data"
            fontSize="9"
            fill="var(--text-muted)"
          >
            D med={medianDemand.toFixed(3)}
          </text>
        </g>
        <g>
          <rect
            x={PADDING.left + 2}
            y={yScale(medianRealizability) - 15}
            width={62}
            height={14}
            fill="var(--surface)"
            rx={2}
          />
          <text
            x={PADDING.left + 4}
            y={yScale(medianRealizability) - 4}
            textAnchor="start"
            className="font-data"
            fontSize="9"
            fill="var(--text-muted)"
          >
            R med={medianRealizability.toFixed(3)}
          </text>
        </g>

        {/* Axes */}
        <line x1={PADDING.left} y1={yScale(0)} x2={xScale(1)} y2={yScale(0)} stroke="var(--border-hairline)" strokeWidth="1" />
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={yScale(0)} stroke="var(--border-hairline)" strokeWidth="1" />

        {/* Tick marks and labels */}
        {ticks.map(({ v, x, y }) => (
          <g key={`tick-${v}`}>
            <line x1={x} y1={yScale(0)} x2={x} y2={yScale(0) + 4} stroke="var(--border-hairline)" strokeWidth="0.7" />
            <text x={x} y={yScale(0) + 16} textAnchor="middle" className="font-data" fontSize="9" fill="var(--text-muted)">{v.toFixed(1)}</text>
            <line x1={PADDING.left - 4} y1={y} x2={PADDING.left} y2={y} stroke="var(--border-hairline)" strokeWidth="0.7" />
            <text x={PADDING.left - 8} y={y + 3} textAnchor="end" className="font-data" fontSize="9" fill="var(--text-muted)">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={PADDING.left + plotW / 2}
          y={dimensions.height - 8}
          textAnchor="middle"
          className="font-data"
          fontSize="11"
          fill="var(--data-demand)"
          fontWeight="500"
        >
          Demand Score
        </text>
        <text
          x={14}
          y={PADDING.top + plotH / 2}
          textAnchor="middle"
          className="font-data"
          fontSize="11"
          fill="var(--data-realizability)"
          fontWeight="500"
          transform={`rotate(-90, 14, ${PADDING.top + plotH / 2})`}
        >
          Realizability Score
        </text>

        {/* Data points */}
        {positionedPoints.map((p) => (
          <ScatterPoint
            key={p.code}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            color={p.color}
            opacity={p.opacity}
            code={p.code}
            name={p.name}
            state={p.state}
            isSelected={selectedDistrictCode === p.code}
            onClick={onDistrictClick}
            onHover={setHoveredCode}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredDistrict && (
        <div
          className="absolute pointer-events-none bg-surface border border-hairline rounded px-3 py-2 z-40 shadow-lg"
          style={{ top: 16, right: 16 }}
        >
          <div className="font-display text-sm font-semibold text-primary">
            {hoveredDistrict.name}
          </div>
          <div className="font-data text-[10px] text-muted">
            {hoveredDistrict.state}
          </div>
          <div className="mt-1 font-data text-[11px] text-secondary space-y-0.5">
            <div>Demand: <span className="text-demand">{hoveredDistrict.demand.toFixed(4)}</span></div>
            <div>Realizability: <span className="text-realizability">{hoveredDistrict.realizability.toFixed(4)}</span></div>
            <div>Quadrant: <span style={{ color: hoveredDistrict.color }}>{hoveredDistrict.quadrant}</span></div>
          </div>
        </div>
      )}

      {/* Static Legend */}
      <div
        className="absolute bottom-4 right-4 bg-surface/90 border border-hairline rounded p-3 z-30 flex flex-col gap-1.5"
        role="img"
        aria-label="Scatter plot legend"
      >
        <span className="font-data text-[10px] text-muted uppercase tracking-wider mb-1">
          Quadrant
        </span>
        {Object.entries(QUADRANT_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-data text-[10px] text-secondary">{label}</span>
          </div>
        ))}
        <div className="border-t border-hairline mt-1 pt-1.5">
          <span className="font-data text-[10px] text-muted">Point size = population</span>
        </div>
        <div className="border-t border-hairline mt-1 pt-1.5 space-y-0.5">
          <span className="font-data text-[9px] text-muted leading-tight block">Color = within-state quadrant</span>
          <span className="font-data text-[9px] text-muted leading-tight block">Lines = national median</span>
        </div>
      </div>
    </div>
  );
}
