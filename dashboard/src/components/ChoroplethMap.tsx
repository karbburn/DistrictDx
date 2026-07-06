"use client";

// Full-bleed SVG choropleth representing all districts.
// - Sequential single-hue ramp per index type
// - Diagonal hatch overlay on low-confidence/inherited districts
// - Batched staggered fade-in on initial load only
// - No animation on filter-triggered redraws
// - Keyboard navigable: Tab + Enter

import { useMemo, useCallback, useRef, useState, useEffect, memo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry, Feature } from "geojson";
import type {
  DistrictData,
  IndexType,
  TimeHorizon,
  GeoDistrictProperties,
} from "@/lib/data";
import { getMAIValue, getConfidenceLevel } from "@/lib/data";
import { getChoroplethColor, getLegendStops, getIndexLabel } from "@/lib/colors";

// ── Memoized District Path (only re-renders when its own props change) ────────

interface DistrictPathProps {
  pathD: string;
  fillColor: string;
  isLowConf: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isInitialLoad: boolean;
  batchIndex: number;
  code: string;
  districtName: string;
  stateName: string;
  indexType: IndexType;
  timeHorizon: TimeHorizon;
  onDistrictClick: (code: string) => void;
  onHover: (code: string | null) => void;
}

const DistrictPath = memo(function DistrictPath({
  pathD,
  fillColor,
  isLowConf,
  isSelected,
  isHighlighted,
  isInitialLoad,
  batchIndex,
  code,
  districtName,
  stateName,
  indexType,
  timeHorizon,
  onDistrictClick,
  onHover,
}: DistrictPathProps) {
  const [localHovered, setLocalHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setLocalHovered(true);
    onHover(code);
  }, [code, onHover]);

  const handleMouseLeave = useCallback(() => {
    setLocalHovered(false);
    onHover(null);
  }, [onHover]);

  const handleFocus = useCallback(() => {
    setLocalHovered(true);
    onHover(code);
  }, [code, onHover]);

  const handleBlur = useCallback(() => {
    setLocalHovered(false);
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    onDistrictClick(code);
  }, [code, onDistrictClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onDistrictClick(code);
      }
    },
    [code, onDistrictClick]
  );

  const strokeColor = isSelected
    ? "var(--accent-saffron)"
    : localHovered
      ? "var(--text-primary)"
      : "rgba(42, 38, 32, 0.6)";
  const strokeWidth = isSelected ? 2 : localHovered ? 1.5 : 0.3;

  const animStyle = isInitialLoad
    ? { animationDelay: `${batchIndex * 100}ms` }
    : { opacity: 1 };

  const dimOpacity = !isHighlighted ? 0.15 : 1;

  return (
    <g>
      <path
        d={pathD}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className={isInitialLoad ? "district-path" : undefined}
        style={{ ...animStyle, opacity: isInitialLoad ? undefined : dimOpacity }}
        tabIndex={0}
        role="button"
        aria-label={`${districtName}, ${stateName}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        cursor="pointer"
      />
      {isLowConf && (
        <path
          d={pathD}
          fill="url(#hatch-low-confidence)"
          stroke="none"
          pointerEvents="none"
          className={isInitialLoad ? "district-path" : undefined}
          style={{ ...animStyle, opacity: isInitialLoad ? undefined : dimOpacity }}
        />
      )}
    </g>
  );
});

// ── Main Map Component ───────────────────────────────────────────────────────

interface ChoroplethMapProps {
  geoData: FeatureCollection<Geometry, GeoDistrictProperties>;
  districtData: DistrictData[];
  indexType: IndexType;
  timeHorizon: TimeHorizon;
  stateFilter: string;
  highlightedState: string | null;
  onDistrictClick: (lgdCode: string) => void;
  onDistrictHover: (lgdCode: string | null) => void;
  selectedDistrictCode: string | null;
  isInitialLoad: boolean;
}

const BATCH_SIZE = 50;

export default function ChoroplethMap({
  geoData,
  districtData,
  indexType,
  timeHorizon,
  stateFilter,
  highlightedState,
  onDistrictClick,
  onDistrictHover,
  selectedDistrictCode,
  isInitialLoad,
}: ChoroplethMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 800 });

  // Responsive sizing
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(300, width), height: Math.max(400, height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Build district lookup map
  const districtMap = useMemo(() => {
    const map = new Map<string, DistrictData>();
    districtData.forEach((d) => map.set(d.lgd_district_code, d));
    return map;
  }, [districtData]);

  // Compute min/max for color scaling
  const [minVal, maxVal] = useMemo(() => {
    let min = 1, max = 0;
    districtData.forEach((d) => {
      const v = getMAIValue(d, indexType, timeHorizon);
      if (v < min) min = v;
      if (v > max) max = v;
    });
    return [min, max];
  }, [districtData, indexType, timeHorizon]);

  // Projection fitted to the SVG bounds
  const projection = useMemo(() => {
    return geoMercator().fitSize(
      [dimensions.width - 40, dimensions.height - 40],
      geoData
    );
  }, [geoData, dimensions]);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  // Filter features by state
  const filteredFeatures = useMemo(() => {
    if (stateFilter === "all") return geoData.features;
    return geoData.features.filter(
      (f) => f.properties.state_name === stateFilter
    );
  }, [geoData.features, stateFilter]);

  // Pre-compute path data for all filtered features (avoids pathGenerator in render loop)
  const pathData = useMemo(() => {
    return filteredFeatures.map((feature) => ({
      code: feature.properties.lgd_district_code,
      pathD: pathGenerator(feature) || "",
    }));
  }, [filteredFeatures, pathGenerator]);

  // Pre-compute fill colors for all filtered features
  const fillColors = useMemo(() => {
    const colors = new Map<string, string>();
    const range = maxVal - minVal;
    filteredFeatures.forEach((feature) => {
      const code = feature.properties.lgd_district_code;
      const district = districtMap.get(code);
      if (!district) {
        colors.set(code, "#1c1915");
        return;
      }
      const value = getMAIValue(district, indexType, timeHorizon);
      const normalized = range > 0 ? (value - minVal) / range : 0.5;
      colors.set(code, getChoroplethColor(normalized, indexType));
    });
    return colors;
  }, [filteredFeatures, districtMap, indexType, timeHorizon, minVal, maxVal]);

  // Pre-compute low-confidence flags
  const lowConfidenceFlags = useMemo(() => {
    const flags = new Map<string, boolean>();
    filteredFeatures.forEach((feature) => {
      const code = feature.properties.lgd_district_code;
      const district = districtMap.get(code);
      if (!district) {
        flags.set(code, false);
        return;
      }
      const lowConf = getConfidenceLevel(district.confidence_score) === "low";
      flags.set(code, lowConf || district.boundary_inherited === true);
    });
    return flags;
  }, [filteredFeatures, districtMap]);

  // O(1) feature lookup for tooltip
  const featureMap = useMemo(() => {
    const map = new Map<string, Feature<Geometry, GeoDistrictProperties>>();
    filteredFeatures.forEach((f) => map.set(f.properties.lgd_district_code, f));
    return map;
  }, [filteredFeatures]);

  // Hover callback — stable reference, doesn't cause path re-renders
  const handleHover = useCallback((code: string | null) => {
    setHoveredCode(code);
    onDistrictHover(code);
  }, [onDistrictHover]);

  // Tooltip info — O(1) lookup
  const hoveredDistrict = hoveredCode ? districtMap.get(hoveredCode) : null;
  const hoveredFeatureProps = hoveredCode
    ? featureMap.get(hoveredCode)?.properties
    : null;

  // Legend stops
  const legendStops = getLegendStops(indexType, 8);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
        role="img"
        aria-label={`India choropleth map showing ${getIndexLabel(indexType)} by district`}
      >
        {/* Hatch pattern definition for low-confidence districts */}
        <defs>
          <pattern
            id="hatch-low-confidence"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="rgba(242, 237, 226, 0.12)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <g transform="translate(20, 20)">
          {filteredFeatures.map((feature, i) => {
            const code = feature.properties.lgd_district_code;
            const pd = pathData[i];
            if (!pd.pathD) return null;

            return (
              <DistrictPath
                key={code}
                code={code}
                pathD={pd.pathD}
                fillColor={fillColors.get(code) || "#1c1915"}
                isLowConf={lowConfidenceFlags.get(code) || false}
                isSelected={selectedDistrictCode === code}
                isHighlighted={!highlightedState || feature.properties.state_name === highlightedState}
                isInitialLoad={isInitialLoad}
                batchIndex={Math.floor(i / BATCH_SIZE)}
                districtName={feature.properties.district_name}
                stateName={feature.properties.state_name}
                indexType={indexType}
                timeHorizon={timeHorizon}
                onDistrictClick={onDistrictClick}
                onHover={handleHover}
              />
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredDistrict && hoveredFeatureProps && (
        <div
          className="absolute pointer-events-none bg-surface border border-hairline rounded px-3 py-2 z-40 shadow-lg"
          style={{ top: 16, right: 16 }}
        >
          <div className="font-display text-sm font-semibold text-primary">
            {hoveredFeatureProps.district_name}
          </div>
          <div className="font-data text-[10px] text-muted">
            {hoveredFeatureProps.state_name}
          </div>
          <div className="mt-1 font-data text-xs text-saffron">
            {getIndexLabel(indexType)}:{" "}
            {getMAIValue(hoveredDistrict, indexType, timeHorizon).toFixed(4)}
          </div>
          <div className="font-data text-[10px] text-secondary">
            Confidence: {(hoveredDistrict.confidence_score * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {/* Static Legend (always visible) */}
      <div
        className="absolute bottom-4 left-4 bg-surface/90 border border-hairline rounded p-3 z-30 flex flex-col gap-2"
        role="img"
        aria-label={`Color legend for ${getIndexLabel(indexType)}`}
      >
        <span className="font-data text-[10px] text-muted uppercase tracking-wider">
          {getIndexLabel(indexType)}
        </span>
        <div className="flex items-center gap-0">
          {legendStops.map((color, i) => (
            <div
              key={i}
              className="w-4 h-3"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex justify-between font-data text-[10px] text-muted">
          <span>{minVal.toFixed(2)}</span>
          <span>{maxVal.toFixed(2)}</span>
        </div>
        {/* Hatch pattern legend entry */}
        <div className="flex items-center gap-2 mt-1 border-t border-hairline pt-1.5">
          <svg width="16" height="12">
            <defs>
              <pattern
                id="hatch-legend"
                patternUnits="userSpaceOnUse"
                width="4"
                height="4"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="4"
                  stroke="rgba(242, 237, 226, 0.3)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="16" height="12" fill="#2a2620" />
            <rect width="16" height="12" fill="url(#hatch-legend)" />
          </svg>
          <span className="font-data text-[10px] text-muted">
            Low confidence
          </span>
        </div>
      </div>
    </div>
  );
}
