import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — How the MAI is Built, Validated & Projected",
  description:
    "Plain-language methodology: AHP weighting (CR<0.1), redundancy checks, geometric mean MAI, within-state quadrants, hierarchical imputation with confidence scores, proxy validation (NSSO OOP ρ0.73) & future projection (β=0.3). Fully reproducible pipeline.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "DistrictDx Methodology — Transparent, Reproducible Index",
    description:
      "How DistrictDx builds the Market Attractiveness Index: AHP, geometric mean, quadrants, validation & future trajectory. No black box.",
    url: "/methodology",
    type: "website",
  },
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
