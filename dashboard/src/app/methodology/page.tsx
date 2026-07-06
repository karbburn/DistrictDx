"use client";

// ── Methodology Page ──────────────────────────────────────────────────────────
// Plain-language methodology summary for non-technical readers.
// Clean reading layout, no charts. Anchor sidebar navigation.

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { ChevronRight } from "lucide-react";

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "overview",
    title: "What is the MAI?",
    content: (
      <>
        <p>
          The <strong>Market Attractiveness Index (MAI)</strong> is a composite
          score that ranks each of India&apos;s 785 districts by their potential
          for pharmaceutical market opportunity. It combines two fundamental
          dimensions:
        </p>
        <ul>
          <li>
            <span className="text-demand font-data">Demand Potential</span> —
            how large and urgent is the healthcare need in this district?
            (Population, disease burden, chronic risk factors, acute disease
            incidence)
          </li>
          <li>
            <span className="text-realizability font-data">
              Realizability / Access
            </span>{" "}
            — can the market actually be served? (Healthcare infrastructure
            density, road connectivity, diagnostic lab availability)
          </li>
        </ul>
        <p>
          The index exists in three variants:{" "}
          <span className="font-data text-xs">MAI_Overall</span>,{" "}
          <span className="font-data text-xs">MAI_Chronic</span> (for chronic
          disease portfolios), and{" "}
          <span className="font-data text-xs">MAI_Acute</span> (for acute /
          infectious disease portfolios).
        </p>
      </>
    ),
  },
  {
    id: "data-sources",
    title: "Data Sources",
    content: (
      <>
        <p>
          All data comes from free, publicly available Indian government sources.
          No paid datasets are used. Key sources include:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider py-2 pr-4">
                  Source
                </th>
                <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider py-2 pr-4">
                  Variables
                </th>
                <th className="text-left font-data text-[10px] text-muted uppercase tracking-wider py-2">
                  Granularity
                </th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-secondary">
              <tr className="border-b border-hairline/50">
                <td className="py-2 pr-4">Census 2011</td>
                <td className="py-2 pr-4">
                  Population, literacy, sex ratio, urbanization, age structure
                </td>
                <td className="py-2">District</td>
              </tr>
              <tr className="border-b border-hairline/50">
                <td className="py-2 pr-4">NFHS-5 (2019-21)</td>
                <td className="py-2 pr-4">
                  Diabetes, hypertension, obesity, tobacco/alcohol use, child
                  morbidity, sanitation, water access
                </td>
                <td className="py-2">District</td>
              </tr>
              <tr className="border-b border-hairline/50">
                <td className="py-2 pr-4">
                  NASA VIIRS (Black Marble)
                </td>
                <td className="py-2 pr-4">
                  Nightlight intensity (income proxy), nightlight growth rate
                </td>
                <td className="py-2">
                  Satellite → District
                </td>
              </tr>
              <tr className="border-b border-hairline/50">
                <td className="py-2 pr-4">Rural Health Statistics (MoHFW)</td>
                <td className="py-2 pr-4">
                  Doctors per capita, PHC/CHC density, hospital beds, ambulance
                  density
                </td>
                <td className="py-2">District</td>
              </tr>
              <tr className="border-b border-hairline/50">
                <td className="py-2 pr-4">PMGSY</td>
                <td className="py-2 pr-4">Road/village connectivity index</td>
                <td className="py-2">District</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">NVBDCP / IDSP</td>
                <td className="py-2 pr-4">
                  Malaria, dengue, TB incidence
                </td>
                <td className="py-2">District</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-3">
          All variables are documented in{" "}
          <span className="font-data">data_dictionary.csv</span> with source
          URLs, year, granularity, and known limitations.
        </p>
      </>
    ),
  },
  {
    id: "index-construction",
    title: "How the Index is Built",
    content: (
      <>
        <p>The index construction follows four steps:</p>

        <h4 className="font-display text-base font-semibold text-primary mt-4 mb-2">
          Step 1: Sub-Domain Composites
        </h4>
        <p>
          Within each domain (e.g., Demand-Chronic, Realizability-Acute), raw
          variables are first normalized to a 0–1 scale using min-max
          normalization. Variables where higher values indicate worse conditions
          (e.g., open defecation rate) are inverted so that higher always means
          &quot;more attractive.&quot;
        </p>
        <p>
          A redundancy check is performed: if two variables correlate above 0.8,
          one is combined or dropped to avoid double-counting. The remaining
          variables are then weighted using{" "}
          <strong>AHP (Analytic Hierarchy Process)</strong> weights derived from
          epidemiological literature, and combined into a sub-domain composite
          score.
        </p>

        <h4 className="font-display text-base font-semibold text-primary mt-4 mb-2">
          Step 2: Axis Scores
        </h4>
        <p>
          Sub-domain composites are combined into two axis scores per therapy
          type:
        </p>
        <ul>
          <li>
            <span className="font-data text-xs text-demand">
              Demand_Overall
            </span>{" "}
            = blend of chronic + acute demand composites
          </li>
          <li>
            <span className="font-data text-xs text-realizability">
              Realizability_Overall
            </span>{" "}
            = blend of chronic + acute access composites
          </li>
        </ul>

        <h4 className="font-display text-base font-semibold text-primary mt-4 mb-2">
          Step 3: Composite Index (Geometric Mean)
        </h4>
        <p>
          The final MAI score uses a <strong>geometric mean</strong>, not a
          simple weighted average:
        </p>
        <div className="bg-void border border-hairline rounded p-4 my-3 text-center">
          <code className="font-data text-sm text-saffron">
            MAI = Demand<sup>α</sup> × Realizability<sup>(1-α)</sup>
          </code>
        </div>
        <p>
          The geometric mean is chosen deliberately: a district with enormous
          demand but zero infrastructure scores <em>low</em> (not moderate),
          because that demand is currently uncapturable. A simple weighted sum
          would let one high axis compensate for a near-zero other axis, which
          is commercially misleading.
        </p>
        <p>
          Default <span className="font-data text-xs">α = 0.5</span> (equal
          weight). Sensitivity is tested at α ∈ [0.4, 0.6].
        </p>

        <h4 className="font-display text-base font-semibold text-primary mt-4 mb-2">
          Step 4: 2×2 Quadrant Classification
        </h4>
        <p>
          Each district is placed into one of four quadrants based on
          whether its Demand and Realizability scores are above or below the{" "}
          <strong>within-state median</strong> (not the national median — a
          national split would simply reproduce a rich-state-vs-poor-state map).
        </p>
        <div className="grid grid-cols-2 gap-2 my-3 text-center text-xs">
          <div className="bg-void border border-hairline rounded p-3">
            <div className="font-data text-saffron font-semibold">Star Market</div>
            <div className="text-muted mt-1">High Demand + High Realizability</div>
          </div>
          <div className="bg-void border border-hairline rounded p-3">
            <div className="font-data text-demand font-semibold">Emerging</div>
            <div className="text-muted mt-1">High Demand + Low Realizability</div>
          </div>
          <div className="bg-void border border-hairline rounded p-3">
            <div className="font-data text-realizability font-semibold">Underserved</div>
            <div className="text-muted mt-1">Low Demand + High Realizability</div>
          </div>
          <div className="bg-void border border-hairline rounded p-3">
            <div className="font-data text-muted font-semibold">Deprioritize</div>
            <div className="text-muted mt-1">Low Demand + Low Realizability</div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "future-opportunity",
    title: "Future Opportunity Projection",
    content: (
      <>
        <p>
          The future projection is <em>not</em> a black-box forecast. It uses a
          simple, transparent formula:
        </p>
        <div className="bg-void border border-hairline rounded p-4 my-3 text-center">
          <code className="font-data text-sm text-saffron">
            Future_MAI = Current_MAI + β × TrendSlope
          </code>
        </div>
        <p>
          <span className="font-data text-xs">TrendSlope</span> is computed from
          actually-available historical deltas:
        </p>
        <ul>
          <li>Census 2001 → 2011 (urbanization growth, population growth)</li>
          <li>NFHS-4 (2015-16) → NFHS-5 (2019-21) (chronic risk factor changes)</li>
          <li>VIIRS multi-year nightlight series (income growth proxy)</li>
        </ul>
        <p>
          <span className="font-data text-xs">β = 0.3</span> (default) represents
          &quot;how much weight we give a 10-year historical trend over a ~5-year
          forward window.&quot; This is sensitivity-tested at β ∈ {"{0.2, 0.3, 0.4}"}.
        </p>
        <p className="text-secondary text-xs mt-2">
          No synthetic data is used. No machine learning predictions are made.
          The future projection should be interpreted as &quot;if historical
          structural trends continue at a moderated pace.&quot;
        </p>
      </>
    ),
  },
  {
    id: "confidence",
    title: "Data Confidence & Imputation",
    content: (
      <>
        <p>
          Not all variables are available at district level for all 785
          districts. When data is missing, a hierarchical imputation strategy is
          applied:
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Try the district-level value first.</li>
          <li>
            Fall back to the state-level average (flagged as{" "}
            <span className="font-data text-xs">imputed_state_avg</span>).
          </li>
          <li>
            Fall back to the national average only if state-level is also
            missing (flagged as{" "}
            <span className="font-data text-xs">imputed_national_avg</span>).
          </li>
        </ol>
        <p className="mt-3">
          Every district carries a{" "}
          <strong>confidence score</strong> = 1 − (fraction of input variables
          that were imputed). A district with confidence 1.0 had all data from
          actual district-level sources; a district with confidence 0.4 had
          60% of its input values imputed.
        </p>
        <p>
          On the map, low-confidence districts are shown with a{" "}
          <strong>diagonal hatch pattern overlay</strong> — not just a duller
          color — so the distinction is visible in greyscale print and to
          colorblind users.
        </p>
        <p>
          In the rankings table, the confidence indicator is always visible as a{" "}
          <strong>dot + text label</strong> (never color-only), per accessibility
          best practice.
        </p>
      </>
    ),
  },
  {
    id: "validation",
    title: "Validation (Proxy-Based)",
    content: (
      <>
        <p>
          Since no &quot;ground truth&quot; pharmaceutical sales data by district
          is publicly available, the index is validated against proxy measures
          of healthcare market activity:
        </p>
        <ul>
          <li>
            <strong>PMJAY claims volume/value</strong> — from the National
            Health Authority dashboard (free)
          </li>
          <li>
            <strong>HMIS OPD/IPD footfall</strong> — from the NHM HMIS portal
            (free)
          </li>
          <li>
            <strong>Jan Aushadhi Kendra count per district</strong> — from
            PMBJP (free, underused by other teams)
          </li>
          <li>
            <strong>Per-capita OOP health expenditure</strong> — from
            NSSO/NFHS
          </li>
        </ul>
        <p className="mt-2">
          Results are reported as Spearman rank correlations (ρ). Example:{" "}
          <span className="italic text-secondary">
            &quot;MAI_Overall correlates at Spearman ρ = 0.67 with district
            PMJAY claims volume, suggesting face validity as a proxy for
            realized healthcare demand.&quot;
          </span>
        </p>
        <p className="text-secondary text-xs mt-2">
          We never claim the index is &quot;validated&quot; or state an
          &quot;accuracy.&quot; Proxy-based validation provides face validity
          evidence, not ground-truth calibration.
        </p>
      </>
    ),
  },
  {
    id: "sensitivity",
    title: "Robustness & Sensitivity",
    content: (
      <>
        <p>Two robustness checks are performed:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            <strong>AHP vs Entropy weighting comparison</strong>: The
            sub-domain weights are recomputed using a fully data-driven entropy
            method (no manual judgments). The resulting district ranking is
            Spearman-correlated against the AHP-based ranking. High correlation
            = the index is robust to weighting methodology. Low correlation =
            specific domains that disagree are disclosed.
          </li>
          <li>
            <strong>α sensitivity</strong>: The demand-vs-realizability
            balancing parameter α is tested at 0.4, 0.5, and 0.6. If rankings
            shift dramatically, it means the index is sensitive to this
            assumption — this is disclosed, not hidden.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "reproducibility",
    title: "Reproducibility",
    content: (
      <>
        <p>
          The entire pipeline is reproducible from source. A new user can run:
        </p>
        <div className="bg-void border border-hairline rounded p-4 my-3">
          <code className="font-data text-xs text-saffron">
            pip install -r requirements.txt && python pipeline/run_all.py
          </code>
        </div>
        <p>
          This regenerates{" "}
          <span className="font-data text-xs">district_index_final.csv</span>{" "}
          from raw government data downloads (network access to listed portals
          required, no API keys). Every intermediate step is deterministic and
          logged.
        </p>
      </>
    ),
  },
];

export default function MethodologyPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  // Intersection observer for scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-void text-primary font-sans">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Anchor Sidebar */}
        <nav
          className="w-56 flex-shrink-0 border-r border-hairline bg-surface overflow-y-auto py-6 px-4 hidden md:block"
          aria-label="Methodology sections"
        >
          <span className="font-data text-[10px] text-muted uppercase tracking-wider block mb-3">
            Contents
          </span>
          <ul className="flex flex-col gap-0.5">
            {sections.map(({ id, title }) => (
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
                    document
                      .getElementById(id)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <ChevronRight
                    size={10}
                    className={
                      activeSection === id ? "text-saffron" : "text-muted"
                    }
                  />
                  <span className="font-sans">{title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">
            <div className="mb-10 border-b border-hairline pb-6">
              <h1 className="font-display text-3xl font-bold tracking-tight text-primary mb-2">
                Methodology
              </h1>
              <p className="text-secondary text-sm">
                Summary of how the District-Level Pharmaceutical
                Market Attractiveness Index is constructed, validated, and
                projected.
              </p>
            </div>

            <div className="flex flex-col gap-12">
              {sections.map(({ id, title, content }) => (
                <section key={id} id={id} className="scroll-mt-20">
                  <h2 className="font-display text-xl font-semibold text-primary mb-4 border-b border-hairline pb-2">
                    {title}
                  </h2>
                  <div className="prose-dark font-sans text-sm text-secondary leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:space-y-1 [&_strong]:text-primary [&_em]:text-primary/80 [&_code]:text-saffron [&_code]:text-xs [&_a]:text-saffron [&_a]:underline [&_p]:leading-relaxed">
                    {content}
                  </div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-6 border-t border-hairline text-center">
              <p className="font-data text-[10px] text-muted">
                DistrictDx — Pharmaceutical Market Attractiveness Index ·
                Built for Sun Pharmaceutical Industries
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
