import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demand × Realizability Scatter — 2×2 Quadrant",
  description:
    "Interactive Demand × Realizability scatter for 785 Indian districts. Population-scaled bubbles, within-state median quadrants (Star, Emerging, Underserved, Deprioritize). Filter by Overall/Chronic/Acute & Current/Future.",
  alternates: { canonical: "/scatter" },
  openGraph: {
    title: "DistrictDx Scatter — Demand × Realizability (785 Districts)",
    description:
      "Explore the 2×2 Demand-Realizability scatter — Star vs Emerging markets, population-scaled, therapy-specific.",
    url: "/scatter",
    type: "website",
  },
};

export default function ScatterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
