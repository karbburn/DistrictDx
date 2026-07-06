// ── Quadrant Badge ────────────────────────────────────────────────────────────
// Displays the 2×2 quadrant classification with semantic icon + label.

import { getQuadrantLabel } from "@/lib/data";
import { Star, TrendingUp, AlertTriangle, MinusCircle } from "lucide-react";

interface QuadrantBadgeProps {
  quadrant: string;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
}

const QUADRANT_ICONS: Record<string, typeof Star> = {
  Star: Star,
  Emerging: TrendingUp,
  Underserved: AlertTriangle,
  Deprioritize: MinusCircle,
};

const QUADRANT_COLORS: Record<string, string> = {
  Star: "text-saffron",
  Emerging: "text-demand",
  Underserved: "text-realizability",
  Deprioritize: "text-muted",
};

export default function QuadrantBadge({
  quadrant,
  size = "md",
  showDescription = false,
}: QuadrantBadgeProps) {
  const { label, description } = getQuadrantLabel(quadrant);
  const Icon = QUADRANT_ICONS[quadrant] || MinusCircle;
  const color = QUADRANT_COLORS[quadrant] || "text-muted";

  const textSize =
    size === "sm"
      ? "text-xs"
      : size === "lg"
        ? "text-base"
        : "text-sm";
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 font-data ${textSize} ${color}`}
      >
        <Icon size={iconSize} strokeWidth={1.5} aria-hidden="true" />
        <span>{label}</span>
      </span>
      {showDescription && description && (
        <span className="text-secondary text-xs font-sans">{description}</span>
      )}
    </div>
  );
}
