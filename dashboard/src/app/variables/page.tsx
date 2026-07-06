"use client";

// Variable Selection & Business Rationale page.
// Fetches data_dictionary.csv client-side and renders a dense table
// with business justification for each variable.

import { useState, useEffect, useMemo } from "react";
import TopBar from "@/components/TopBar";
import { ChevronRight } from "lucide-react";

// ── Business Rationale (hardcoded — the CSV only has metadata, not justification) ──

const RATIONALE: Record<string, string> = {
  census_total_population:
    "Total addressable market size. Larger populations generate more therapy demand and justify rep deployment density.",
  literacy_rate:
    "Higher literacy correlates with health-seeking behavior, treatment adherence, and willingness to accept prescribed therapies.",
  sex_ratio:
    "Gender balance indicator. Skewed ratios signal migration patterns (male workforce drain) or female health access gaps.",
  latrine_access_rate:
    "Sanitation proxy for WASH-related disease burden (diarrheal, waterborne). Inverted: higher access = lower acute demand.",
  tap_water_rate:
    "Drinking water quality proxy. Safe water access reduces waterborne disease incidence, lowering acute therapy demand.",
  nfhs5_high_blood_sugar_pct:
    "Direct chronic disease prevalence indicator. Diabetes is Sun Pharma's core chronic portfolio driver.",
  nfhs5_elevated_bp_pct:
    "Hypertension prevalence. Second-largest chronic condition by patient volume in India. Core chronic portfolio.",
  nfhs5_women_overweight_pct:
    "Obesity proxy for metabolic syndrome risk. Leading indicator for future diabetes/hypertension burden.",
  nfhs5_women_tobacco_pct:
    "Chronic risk factor. Tobacco use drives COPD, oral cancer, cardiovascular disease — chronic therapy demand.",
  nfhs5_men_tobacco_pct:
    "Male tobacco prevalence. Higher than female in most states; captures the gendered chronic burden.",
  nfhs5_women_alcohol_pct:
    "Alcohol use as chronic liver disease and lifestyle disease risk factor.",
  nfhs5_men_alcohol_pct:
    "Male alcohol consumption. Captures chronic disease risk in the male population.",
  nfhs5_child_diarrhoea_pct:
    "Acute disease burden proxy. Diarrheal disease drives ORS, zinc, antibiotic demand.",
  nfhs5_child_ari_pct:
    "Acute respiratory infection burden. Drives antibiotic and respiratory therapy demand.",
  nfhs5_improved_sanitation_pct:
    "WASH infrastructure proxy. Lower sanitation = higher waterborne disease burden (inverted).",
  nfhs5_improved_water_pct:
    "Water access quality proxy. Inverted: better water = less acute disease.",
  nfhs5_child_underweight_pct:
    "Malnutrition proxy. Underweight children have higher morbidity and healthcare utilization.",
  nightlight_log_mean:
    "Income/wealth proxy via satellite. Captures economic activity invisible in Census (formal sector, urbanization).",
  nightlight_growth_rate:
    "Income trajectory proxy. Districts with growing nightlights are economically transitioning — future demand growth.",
};

// ── Domain grouping for anchor nav ──────────────────────────────────────────

const DOMAIN_GROUPS = [
  { id: "demographics", label: "Demographics", vars: ["census_total_population", "literacy_rate", "sex_ratio"] },
  { id: "wash", label: "WASH", vars: ["latrine_access_rate", "tap_water_rate", "nfhs5_improved_sanitation_pct", "nfhs5_improved_water_pct"] },
  { id: "chronic", label: "Chronic Disease", vars: ["nfhs5_high_blood_sugar_pct", "nfhs5_elevated_bp_pct", "nfhs5_women_overweight_pct"] },
  { id: "risk", label: "Risk Factors", vars: ["nfhs5_women_tobacco_pct", "nfhs5_men_tobacco_pct", "nfhs5_women_alcohol_pct", "nfhs5_men_alcohol_pct"] },
  { id: "acute", label: "Acute / Child Morbidity", vars: ["nfhs5_child_diarrhoea_pct", "nfhs5_child_ari_pct", "nfhs5_child_underweight_pct"] },
  { id: "income", label: "Income Proxy", vars: ["nightlight_log_mean", "nightlight_growth_rate"] },
];

// ── CSV Row type ────────────────────────────────────────────────────────────

interface DictRow {
  variable: string;
  source_url: string;
  year: string;
  granularity: string;
  domain: string;
  therapy_applicability: string;
  proxy_justification: string;
  known_limitations: string;
}

// ── CSV parser (same hand-rolled approach as data.ts) ───────────────────────

function parseCSVRow(headers: string[], row: string): Record<string, string> {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] ?? "";
  });
  return obj;
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function VariablesPage() {
  const [rows, setRows] = useState<DictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(DOMAIN_GROUPS[0].id);

  useEffect(() => {
    fetch("/data/dictionary.csv")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        const headers = lines[0].replace(/\r$/, "").split(",");
        const parsed: DictRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const raw = parseCSVRow(headers, lines[i].replace(/\r$/, ""));
          parsed.push({
            variable: raw["variable"] || "",
            source_url: raw["source_url"] || "",
            year: raw["year"] || "",
            granularity: raw["granularity"] || "",
            domain: raw["domain"] || "",
            therapy_applicability: raw["therapy_applicability"] || "",
            proxy_justification: raw["proxy_justification"] || "",
            known_limitations: raw["known_limitations"] || "",
          });
        }
        setRows(parsed);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data dictionary");
        setLoading(false);
      });
  }, []);

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );
    DOMAIN_GROUPS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [rows]);

  const rowsByVar = useMemo(() => new Map(rows.map((r) => [r.variable, r])), [rows]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-saffron animate-pulse" />
          <span className="font-data text-xs text-muted tracking-wider">Loading data dictionary…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <span className="font-display text-xl text-primary">Failed to load</span>
          <span className="font-data text-xs text-muted">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-void text-primary font-sans">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Anchor Sidebar */}
        <nav
          className="w-56 flex-shrink-0 border-r border-hairline bg-surface overflow-y-auto py-6 px-4 hidden md:block"
          aria-label="Variable sections"
        >
          <span className="font-data text-[10px] text-muted uppercase tracking-wider block mb-3">
            Domains
          </span>
          <ul className="flex flex-col gap-0.5">
            {DOMAIN_GROUPS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    activeSection === id
                      ? "text-saffron bg-saffron/10"
                      : "text-secondary hover:text-primary hover:bg-surface-raised"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection(id);
                    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <ChevronRight size={10} className={activeSection === id ? "text-saffron" : "text-muted"} />
                  <span className="font-sans">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-10">
            <div className="mb-10 border-b border-hairline pb-6">
              <h1 className="font-display text-3xl font-bold tracking-tight text-primary mb-2">
                Variable Selection & Business Rationale
              </h1>
              <p className="text-secondary text-sm">
                Every variable in the MAI pipeline, its source, and why it was selected.
                All {rows.length} variables use free, publicly available data.
              </p>
            </div>

            <div className="flex flex-col gap-14">
              {DOMAIN_GROUPS.map(({ id, label, vars }) => (
                <section key={id} id={id} className="scroll-mt-20">
                  <h2 className="font-display text-xl font-semibold text-primary mb-4 border-b border-hairline pb-2">
                    {label}
                  </h2>
                  <div className="flex flex-col gap-4">
                    {vars.map((v) => {
                      const row = rowsByVar.get(v);
                      const rationale = RATIONALE[v] || row?.proxy_justification || "";
                      return (
                        <div
                          key={v}
                          className="bg-surface border border-hairline rounded p-4 flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-data text-sm text-saffron font-medium">
                                {v}
                              </span>
                              <span className="font-data text-[10px] text-muted">
                                {row?.source_url} · {row?.year} · {row?.granularity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {row?.therapy_applicability === "True" && (
                                <span className="font-data text-[10px] px-1.5 py-0.5 rounded bg-saffron/10 text-saffron border border-saffron/30">
                                  therapy
                                </span>
                              )}
                              <span className="font-data text-[10px] px-1.5 py-0.5 rounded bg-void text-muted border border-hairline">
                                {row?.domain}
                              </span>
                            </div>
                          </div>
                          <p className="font-sans text-xs text-secondary leading-relaxed">
                            {rationale}
                          </p>
                          {row?.known_limitations && (
                            <p className="font-data text-[10px] text-muted leading-relaxed">
                              Limitations: {row.known_limitations}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-16 pt-6 border-t border-hairline text-center">
              <p className="font-data text-[10px] text-muted">
                DistrictDx — Pharmaceutical Market Attractiveness Index · Variable Selection & Business Rationale
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
