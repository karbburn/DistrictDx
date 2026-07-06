// ── Confidence Badge ──────────────────────────────────────────────────────────
// Per DESIGN §4 + §7: dot + text label, NEVER color-only.
// Accessible: aria-label describes confidence level for screen readers.

import { getConfidenceLevel, type ConfidenceLevel } from "@/lib/data";
import { getConfidenceColor } from "@/lib/colors";

interface ConfidenceBadgeProps {
  score: number;
  showScore?: boolean;
  size?: "sm" | "md";
}

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function ConfidenceBadge({
  score,
  showScore = false,
  size = "md",
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(score);
  const color = getConfidenceColor(level);
  const label = LEVEL_LABELS[level];

  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-data ${textSize}`}
      aria-label={`Confidence: ${label} (${(score * 100).toFixed(0)}%)`}
      role="status"
    >
      <span
        className={`${dotSize} rounded-full flex-shrink-0`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-secondary">{label}</span>
      {showScore && (
        <span className="text-muted">
          {(score * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
}
