import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rankings — 785 Districts Ranked by MAI",
  description:
    "Sortable, searchable rankings of all 785 Indian districts by MAI_Overall/Chronic/Acute — with Demand, Realizability, quadrant & confidence. State filter, virtualized table, CSV-backed reproducible scores.",
  alternates: { canonical: "/rankings" },
  openGraph: {
    title: "DistrictDx Rankings — 785 Districts by Market Attractiveness",
    description:
      "Rank, filter and search 785 districts by MAI score, demand, realizability and quadrant. Built from free public data.",
    url: "/rankings",
    type: "website",
  },
};

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
