import type { MetadataRoute } from "next";
import { readFileSync } from "fs";
import { join } from "path";

// Static routes + dynamic district pages for SEO/GEO crawlability
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://districtdx.sourabhpradhan.in";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/scatter`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/rankings`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/variables`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/methodology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Generate district pages dynamically from CSV (785 districts)
  // Falls back to static only if file not available at build time
  try {
    const csvPath = join(process.cwd(), "public/data/district_index_final.csv");
    const raw = readFileSync(csvPath, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      const headers = lines[0].replace(/\r$/, "").split(",");
      const lgdIdx = headers.indexOf("lgd_district_code");
      if (lgdIdx !== -1) {
        const districtEntries: MetadataRoute.Sitemap = [];
        for (let i = 1; i < lines.length; i++) {
          // Hand-rolled CSV split respecting quotes (same as data.ts)
          const row = lines[i];
          let inQuotes = false;
          let cur = "";
          const vals: string[] = [];
          for (let j = 0; j < row.length; j++) {
            const ch = row[j];
            if (ch === '"') inQuotes = !inQuotes;
            else if (ch === "," && !inQuotes) {
              vals.push(cur);
              cur = "";
            } else cur += ch;
          }
          vals.push(cur);
          const code = vals[lgdIdx]?.trim();
          if (code) {
            districtEntries.push({
              url: `${base}/district/${code}`,
              lastModified: now,
              changeFrequency: "monthly",
              priority: 0.6,
            });
          }
        }
        return [...staticRoutes, ...districtEntries];
      }
    }
  } catch {
    // Build-time fallback: return static routes only
  }

  return staticRoutes;
}
