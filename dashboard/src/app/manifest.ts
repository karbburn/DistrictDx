import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DistrictDx — Pharmaceutical Market Attractiveness Index",
    short_name: "DistrictDx",
    description:
      "Reproducible Pharmaceutical Market Attractiveness Index (MAI) for 785 Indian districts — Demand × Realizability, therapy-specific, with interactive map, scatter & rankings.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["medical", "business", "education"],
    lang: "en-IN",
    dir: "ltr",
    scope: "/",
  };
}
