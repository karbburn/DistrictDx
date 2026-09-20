import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "District Profile — MAI Drill-Down",
  description:
    "District-level drill-down: MAI Overall/Chronic/Acute, Demand & Realizability axes, quadrant, confidence score, historical trend & future projection. Shareable LGD deep-link for any of 785 districts.",
  alternates: { canonical: "/district" },
  openGraph: {
    title: "DistrictDx — District Profile",
    description:
      "Deep-dive any Indian district — MAI scores, quadrant playbook, confidence & trajectory. Shareable LGD link.",
    type: "website",
  },
};

export default function DistrictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
