# DistrictDx

**District-level Pharmaceutical Market Attractiveness Index (MAI)**

A statistical framework outputting three defensible indices — Overall, Chronic, Acute — across 785 Indian districts, with current-state and future-trajectory views. Built for the **Trilytics 2026 · Sun Pharma Case · IIM Calcutta PGDBA Conclave**.

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Next.js](https://img.shields.io/badge/next.js-16-black.svg)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-v4-38bdf8.svg)](https://tailwindcss.com)

---

## Overview

Sun Pharma currently prioritizes districts using competition benchmarking and internal sales indicators — a backward-looking approach structurally blind to three things: underlying patient demand that hasn't converted into visible prescriber activity, access-to-convert constraints, and trajectory.

DistrictDx addresses this with a two-axis framework:

> **Market Attractiveness = Demand Potential × Realizability**

- **Demand Potential** — epidemiological, demographic, and economic capacity for a district to generate therapy need.
- **Realizability** — the degree to which that demand can be converted into actual prescriptions: provider density, pharmacy access, infrastructure.

The geometric mean formulation ensures a district with huge demand but zero infrastructure scores *low*, not moderate — because that demand is currently uncapturable. This decomposition maps directly to two commercial playbooks: deploy sales force now (Star), or invest in access infrastructure first (Emerging).

---

## Key Features

- **Geometric mean MAI** — penalizes districts weak on either axis; not a linear scorecard
- **AHP-weighted composites** — literature-grounded pairwise judgments with Consistency Ratio checks (CR < 0.1)
- **2×2 quadrant classification** — within-state median splits for actionable regional prioritization
- **Future Opportunity Index** — trend extrapolation from Census 2001→2011, NFHS-4→NFHS-5, VIIRS nightlights
- **Proxy validation** — Spearman correlations against PMJAY claims, HMIS footfall, Jan Aushadhi density, NSSO health expenditure
- **Entropy sensitivity analysis** — data-driven weights compared against AHP rankings (ρ ≥ 0.84 across all indices)
- **Full reproducibility** — one-command pipeline regeneration from free public data
- **Interactive dashboard** — choropleth map, scatter plot, rankings table, district drill-down

---

## Dashboard

An interactive Next.js dashboard provides exploratory visualization of the index:

- **`/`** — Full-bleed India choropleth with index type, time horizon, and state filter controls
- **`/scatter`** — 2×2 Demand × Realizability scatter plot with quadrant tints and population-scaled points
- **`/rankings`** — Virtualized, sortable rankings table with state search and confidence indicators
- **`/variables`** — Variable selection & business rationale for all 19 pipeline inputs
- **`/methodology`** — Plain-language methodology summary for non-technical readers

**Live demo:** [https://districtdx.vercel.app](https://districtdx.vercel.app)

### Run locally

```bash
cd dashboard
npm install
npm run dev
```

---

## Methodology

### Index Construction

Each district receives three MAI scores (Overall, Chronic, Acute) via a four-step pipeline:

1. **Sub-domain composites** — raw variables normalized to [0,1], AHP-weighted within each domain (Demand-Chronic, Demand-Acute, Realizability-Chronic, Realizability-Acute)
2. **Axis scores** — chronic + acute composites blended into Demand and Realizability axes
3. **Geometric mean** — `MAI = Demand^α × Realizability^(1-α)` with α = 0.5 (sensitivity-tested at α ∈ [0.4, 0.6])
4. **Quadrant assignment** — within-state median splits on each axis

### Quadrant Classification

| Demand | Realizability | Quadrant | Commercial Playbook |
|--------|--------------|----------|---------------------|
| High | High | **Star Market** | Deploy sales force, defend share |
| High | Low | **Emerging** | Market development — invest in access first |
| Low | High | **Underserved** | Maintenance/efficiency mode |
| Low | Low | **Deprioritize** | Monitor only |

### Future Opportunity Projection

```
Future_MAI = Current_MAI + β × TrendSlope    (β = 0.3)
```

TrendSlope is computed from historical deltas (Census 2001→2011, NFHS-4→NFHS-5, VIIRS multi-year), not synthetic data. β ∈ [0.2, 0.4] is sensitivity-tested.

### Validation (Proxy-Based)

| Proxy | Spearman ρ | p-value | Interpretation |
|-------|-----------|---------|----------------|
| Jan Aushadhi density | 0.45 | < 0.001 | Districts with higher MAI have more generic drug stores |
| NSSO OOP expenditure | 0.73 | < 0.001 | MAI correlates with healthcare purchasing power |
| PMJAY claims (state-level) | 0.51 | 0.002 | Aligns with public insurance utilization |
| HMIS OPD footfall | 0.04 | n.s. | Weak — expected given HMIS data quality issues |

> We never claim the index is "validated." All results represent proxy-based face validity, not ground-truth calibration.

---

## Data Sources

| Source | Variables | Granularity |
|--------|-----------|-------------|
| Census 2011 | Population, density, literacy, sex ratio, urbanization, age structure | District |
| NFHS-5 (2019-21) | Diabetes, hypertension, obesity, tobacco/alcohol use, child morbidity, sanitation, water | District |
| NFHS-4 (2015-16) | Historical chronic indicators for trend computation | District |
| VIIRS Nightlights (NASA Black Marble) | Income proxy (log radiance), growth rate | District |
| Rural Health Statistics (MoHFW) | Doctors per capita, PHC/CHC density, hospital beds, ambulance density | District |
| NVBDCP / IDSP | Malaria, dengue, TB incidence | District |
| PMGSY | Road/village connectivity index | District |
| LGD Directory (MeitY) | District codes, Census-2011 concordance crosswalk | District |
| PMJAY (NHA) | Claims volume/value — validation proxy | State |
| HMIS (NHM) | OPD/IPD footfall — validation proxy | District |
| Jan Aushadhi (PMBJP) | Kendra density — validation proxy | District |
| NSSO/NFHS | Out-of-pocket health expenditure — validation proxy | State |

All variables are documented in `data_dictionary.csv` with source URLs, year, granularity, and known limitations.

---

## Project Architecture

```text
├── data/
│   ├── raw/               # Untouched raw public data (partitioned by source)
│   └── processed/         # Cleaned, LGD-reconciled datasets
├── pipeline/
│   ├── 01_ingest/         # Download scripts per source (run separately)
│   ├── 02_reconcile/      # LGD crosswalk and boundary reconciliation
│   ├── 03_clean/          # Winsorization, hierarchical imputation
│   ├── 04_construct/      # Sub-domain composites via AHP weighting
│   ├── 05_index/          # Geometric MAI, 2×2 quadrants, α sensitivity
│   ├── 06_validate/       # Entropy sensitivity + proxy correlation report
│   ├── 07_future/         # Trend-based future opportunity index
│   ├── 08_export/         # Final CSV, GeoJSON, dashboard sync
│   └── run_all.py         # Orchestrator — runs stages 02→08 sequentially
├── outputs/               # district_index_final.csv, validation_report.md
├── dashboard/             # Next.js interactive visualization
│   └── src/
│       ├── app/           # Pages: /, /scatter, /rankings, /variables, /methodology
│       ├── components/    # ChoroplethMap, ScatterPlot, Drilldown, etc.
│       └── lib/           # Data loaders, color utilities, filter state
├── assets/                # PRD, TECHSPEC, DESIGN, reviews (excluded from git)
├── data_dictionary.csv    # Schema + metadata for all 19 pipeline variables
└── requirements.txt       # Python dependencies
```

---

## Reproducibility

### Prerequisites

- Python 3.10+
- Active internet (for initial data download — subsequent runs use cached raw data)

### Quick Start

```bash
pip install -r requirements.txt
python pipeline/run_all.py
```

### Pipeline Stages

| Stage | Script | Output |
|-------|--------|--------|
| 1 | `02_reconcile/build_district_master.py` | `district_master.csv` |
| 2 | `03_clean/clean_and_impute.py` | `district_variables_clean.csv` |
| 3 | `04_construct/build_subdomain_composites.py` | `subdomain_composites.csv` |
| 4 | `05_index/build_index.py` | `district_index_scores.csv` |
| 5 | `06_validate/validate_proxies.py` | `validation_report.md` |
| 6 | `07_future/build_future_index.py` | `district_index_future.csv` |
| 7 | `08_export/export_final.py` | `district_index_final.csv`, `.geojson` |

### Data Ingestion (Optional)

Ingestion scripts in `pipeline/01_ingest/` download raw data from government portals. These run separately because government portals are frequently unstable. Raw data is committed to the repository.

```bash
python pipeline/01_ingest/census_2011.py
python pipeline/01_ingest/nfhs5.py
python pipeline/01_ingest/nightlights_viirs.py
# See pipeline/01_ingest/ for all scripts
```

---

## Acknowledgments

- Data sources: Census of India, NFHS (IIPS/DHS Program), NASA VIIRS, MoHFW, NVBDCP, PMGSY, NHA, NHM, PMBJP
- LGD district boundaries: Local Government Directory (MeitY)
- Dashboard built with Next.js, d3-geo, Recharts, Tailwind CSS
- Quadrant color palette designed to match Sun Pharma brand identity
