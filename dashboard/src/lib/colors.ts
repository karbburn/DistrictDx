// ── Color Utilities for Data Visualization ────────────────────────────────────
// Single-hue sequential ramps, no rainbow/diverging.
// Purple gradients, glassmorphism explicitly banned.

import type { IndexType, ConfidenceLevel } from "./data";

// ── CSS variable values (kept in sync with globals.css) ───────────────────────

const COLORS = {
  void: [10, 9, 8],        // #0a0908
  saffron: [249, 115, 22], // #f97316
  demand: [74, 222, 128],  // #4ade80
  realizability: [56, 189, 248], // #38bdf8
  negative: [248, 113, 113], // #f87171
  confidenceLow: [87, 83, 78], // #57534e
} as const;

// ── Sequential Ramp (dark ink → accent) ───────────────────────────────────────

function interpolateColor(
  from: readonly number[],
  to: readonly number[],
  t: number
): string {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Get choropleth fill color for a district.
 * Sequential single-hue ramp per DESIGN §5:
 * - Overall: dark ink → saffron
 * - Chronic/demand-focused view: dark ink → green
 * - Acute/realizability view: dark ink → sky
 */
export function getChoroplethColor(
  value: number,
  indexType: IndexType
): string {
  // Clamp to [0,1]
  const t = Math.max(0, Math.min(1, value));

  switch (indexType) {
    case "overall":
      return interpolateColor(COLORS.void, COLORS.saffron, t);
    case "chronic":
      return interpolateColor(COLORS.void, COLORS.demand, t);
    case "acute":
      return interpolateColor(COLORS.void, COLORS.realizability, t);
  }
}

/**
 * Get the accent color name for the current index type (for legends/labels).
 */
export function getAccentForIndex(indexType: IndexType): string {
  switch (indexType) {
    case "overall":
      return "var(--accent-saffron)";
    case "chronic":
      return "var(--data-demand)";
    case "acute":
      return "var(--data-realizability)";
  }
}

/**
 * Get label for the index type.
 */
export function getIndexLabel(indexType: IndexType): string {
  switch (indexType) {
    case "overall":
      return "MAI Overall";
    case "chronic":
      return "MAI Chronic";
    case "acute":
      return "MAI Acute";
  }
}

/**
 * 2×2 scatter quadrant background tints at ~8% opacity.
 * Per DESIGN §5: green/sky mixed quadrant backgrounds.
 */
export function getQuadrantTints(): {
  starBg: string;
  emergingBg: string;
  underservedBg: string;
  deprioritizeBg: string;
} {
  return {
    starBg: "rgba(74, 222, 128, 0.08)",       // High D + High R
    emergingBg: "rgba(74, 222, 128, 0.05)",    // High D + Low R
    underservedBg: "rgba(56, 189, 248, 0.05)", // Low D + High R
    deprioritizeBg: "rgba(87, 83, 78, 0.05)",  // Low D + Low R
  };
}

/**
 * Confidence badge colors (dot color).
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "var(--data-demand)";
    case "medium":
      return "var(--accent-saffron)";
    case "low":
      return "var(--data-confidence-low)";
  }
}

/**
 * Generate an array of color stops for the legend gradient.
 */
export function getLegendStops(
  indexType: IndexType,
  steps: number = 10
): string[] {
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    stops.push(getChoroplethColor(i / steps, indexType));
  }
  return stops;
}
