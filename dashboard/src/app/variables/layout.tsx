import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Variables — 19 Indicators & Business Rationale",
  description:
    "All 19 MAI input variables with business rationale, source URL, year & granularity: Census, NFHS-5/4, VIIRS nightlights, Rural Health Statistics, PMGSY, NVBDCP. Free public data, documented limitations.",
  alternates: { canonical: "/variables" },
  openGraph: {
    title: "DistrictDx Variables — Data Dictionary & Business Rationale",
    description:
      "19 variables across 6 domains with source, year, therapy applicability & limitations. Fully transparent data dictionary.",
    url: "/variables",
    type: "website",
  },
};

export default function VariablesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
