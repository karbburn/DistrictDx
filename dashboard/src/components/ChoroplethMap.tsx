"use client";

// ── India Choropleth Map ──────────────────────────────────────────────────────
// Full-bleed SVG choropleth. The map IS the product (DESIGN §1).
// - Sequential single-hue ramp per index type (DESIGN §5)
// - Diagonal hatch overlay on low-confidence districts (DESIGN §5)
// - Staggered fade-in on initial load only (DESIGN §6)
// - No animation on filter-triggered redraws (DESIGN §6)
// - Keyboard navigable: Tab + Enter (DESIGN §7)

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
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

interface ChoroplethMapProps {
  geoData: FeatureCollection<Geometry, GeoDistrictProperties>;
  districtData: DistrictData[];
  indexType: IndexType;
  timeHorizon: TimeHorizon;
  stateFilter: string;
  onDistrictClick: (lgdCode: number) => void;
  selectedDistrictCode: number | null;
  isInitialLoad: boolean;
}

export default function ChoroplethMap({
  geoData,
  districtData,
  indexType,
  timeHorizon,
  stateFilter,
  onDistrictClick,
  selectedDistrictCode,
  isInitialLoad,
}: ChoroplethMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCode, setHoveredCode] = useState<number | null>(null);
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
    const map = new Map<number, DistrictData>();
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
    ).translate([dimensions.width / 2, dimensions.height / 2]);
  }, [geoData, dimensions]);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  // Filter features by state
  const filteredFeatures = useMemo(() => {
    if (stateFilter === "all") return geoData.features;
    return geoData.features.filter(
      (f) => f.properties.state_name === stateFilter
    );
  }, [geoData.features, stateFilter]);

  // Get fill color for a feature
  const getFill = useCallback(
    (feature: Feature<Geometry, GeoDistrictProperties>) => {
      const code = feature.properties.lgd_district_code;
      const district = districtMap.get(code);
      if (!district) return "#1c1915";

      const value = getMAIValue(district, indexType, timeHorizon);
      // Normalize to [0,1] within the current range
      const range = maxVal - minVal;
      const normalized = range > 0 ? (value - minVal) / range : 0.5;
      return getChoroplethColor(normalized, indexType);
    },
    [districtMap, indexType, timeHorizon, minVal, maxVal]
  );

  // Check if a feature is low confidence
  const isLowConfidence = useCallback(
    (feature: Feature<Geometry, GeoDistrictProperties>) => {
      const district = districtMap.get(feature.properties.lgd_district_code);
      if (!district) return false;
      return getConfidenceLevel(district.confidence_score) === "low";
    },
    [districtMap]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, code: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onDistrictClick(code);
      }
    },
    [onDistrictClick]
  );

  // Tooltip info
  const hoveredDistrict = hoveredCode ? districtMap.get(hoveredCode) : null;
  const hoveredFeatureProps = hoveredCode
    ? filteredFeatures.find(
        (f) => f.properties.lgd_district_code === hoveredCode
      )?.properties
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
            const d = pathGenerator(feature);
            if (!d) return null;

            const isHovered = hoveredCode === code;
            const isSelected = selectedDistrictCode === code;
            const lowConf = isLowConfidence(feature);

            return (
              <g key={code}>
                <path
                  d={d}
                  fill={getFill(feature)}
                  stroke={
                    isSelected
                      ? "var(--accent-saffron)"
                      : isHovered
                        ? "var(--text-primary)"
                        : "rgba(42, 38, 32, 0.6)"
                  }
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.3}
                  className={isInitialLoad ? "district-path" : undefined}
                  style={
                    isInitialLoad
                      ? { animationDelay: `${i * 1.5}ms` }
                      : { opacity: 1 }
                  }
                  tabIndex={0}
                  role="button"
                  aria-label={`${feature.properties.district_name}, ${feature.properties.state_name}`}
                  onClick={() => onDistrictClick(code)}
                  onKeyDown={(e) => handleKeyDown(e, code)}
                  onMouseEnter={() => setHoveredCode(code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  onFocus={() => setHoveredCode(code)}
                  onBlur={() => setHoveredCode(null)}
                  cursor="pointer"
                />
                {/* Hatch overlay for low-confidence districts */}
                {lowConf && (
                  <path
                    d={d}
                    fill="url(#hatch-low-confidence)"
                    stroke="none"
                    pointerEvents="none"
                    className={isInitialLoad ? "district-path" : undefined}
                    style={
                      isInitialLoad
                        ? { animationDelay: `${i * 1.5}ms` }
                        : { opacity: 1 }
                    }
                  />
                )}
              </g>
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

      {/* Static Legend (DESIGN §5: never hover-only) */}
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
