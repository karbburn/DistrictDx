# DistrictDx

District-level pharmaceutical market attractiveness index (MAI) — a statistical framework outputting three indices (Overall, Chronic, Acute) across ~780+ Indian districts, featuring current and future trajectory views.

## Methodology

Each district receives an MAI score computed as:

```
MAI = Demand^α × Realizability^(1-α)    (default α = 0.5)
```

This is a **geometric mean**, not a weighted sum — it penalizes districts that are strong on one axis but weak on the other. The two axes are:

- **Demand Potential**: population density, chronic disease burden (diabetes, hypertension), acute disease burden (malaria, TB), nightlight-based income proxy, urbanization
- **Realizability**: healthcare infrastructure density (PHC/CHC per capita), diagnostic lab availability, road connectivity, ambulance access

Sub-domain weights are derived via **AHP** (Analytic Hierarchy Process) with documented pairwise judgments and Consistency Ratio checks. An entropy-weighted sensitivity analysis is run to verify robustness.

Each district is also placed in a **2×2 quadrant** (Star, Underserved, Latent, Low-Priority) using within-state median splits on Demand and Realizability, giving Sun Pharma actionable regional prioritization.

A **Future Opportunity Index** extends the current MAI with trend extrapolation (Census 2001→2011, NFHS-4→NFHS-5, VIIRS nightlight growth) to identify districts with improving trajectories.

## Data Sources

| Source | Variables | Granularity |
|---|---|---|
| Census 2011 (PCA + HLPCA) | Population, density, literacy, sex ratio, household amenities | District |
| NFHS-5 | Chronic disease prevalence, WASH indicators, child morbidity | District |
| NFHS-4 | Historical chronic indicators for trend computation | District |
| VIIRS Nightlights | Income proxy, growth rate | District (pre-aggregated) |
| LGD Directory | District codes, concordance crosswalk | District |
| PMJAY | Claims volume (validation proxy) | State |
| HMIS | Outpatient footfall (validation proxy) | District |
| Jan Aushadhi | Kendra density (validation proxy) | District |
| NSSO | Out-of-pocket health expenditure (validation proxy) | District |

## Project Architecture

```text
├── data/
│   ├── raw/               # Untouched raw public data downloads (partitioned by source)
│   └── processed/         # Cleaned, standardized, and LGD-reconciled datasets
├── pipeline/              # Modular pipeline scripts:
│   ├── 01_ingest/         # Raw download and parsing scripts per source
│   ├── 02_reconcile/      # LGD directory crosswalk and boundary reconciliation
│   ├── 03_clean/          # Outlier winsorization, missing data hierarchical imputation
│   ├── 04_construct/      # Multi-variable sub-domain composite scoring
│   ├── 05_index/          # AHP weighting and geometric index formulation
│   ├── 06_validate/       # Proxy correlation metrics (PMJAY, HMIS, Jan Aushadhi)
│   ├── 07_future/         # Trend-based future opportunity adjustments
│   ├── 08_export/         # Consolidated CSV exports and dashboard GeoJSONs
│   └── run_all.py         # Orchestrator — runs all stages sequentially
├── outputs/               # Final index tables, GeoJSONs, and validation report
├── dashboard/             # Next.js interactive visualization application
├── ppt-assets/            # Extracted charts, maps, and plots for presentations
├── data_dictionary.csv    # Schema, sources, year, and limitations for all indicators
└── README.md              # This file
```

## Reproducibility & Execution

### Prerequisites
- Python 3.10+
- Active internet connection (for initial data download from government portals)

### Quick Start

```bash
pip install -r requirements.txt
python pipeline/run_all.py
```

The orchestrator runs all pipeline stages sequentially. If any stage fails, execution halts with an error message identifying the failed stage.

### What Each Stage Produces

| Stage | Script | Output |
|---|---|---|
| 1 | `02_reconcile/build_district_master.py` | `data/processed/district_master.csv` |
| 2 | `03_clean/clean_and_impute.py` | `data/processed/district_variables_clean.csv` |
| 3 | `04_construct/build_subdomain_composites.py` | `data/processed/subdomain_composites.csv` |
| 4 | `05_index/build_index.py` | `data/processed/district_index_scores.csv` |
| 5 | `06_validate/validate_proxies.py` | `outputs/validation_report.md` |
| 6 | `07_future/build_future_index.py` | `data/processed/district_index_future.csv` |
| 7 | `08_export/export_final.py` | `outputs/district_index_final.csv`, `outputs/district_index_final.geojson` |

### Ingestion (Stage 0)

The ingestion scripts in `pipeline/01_ingest/` download raw data from government portals. These are run separately because government portals are often unstable. Raw data files are committed to the repository so the pipeline can run without re-downloading.

To re-download raw data:

```bash
python pipeline/01_ingest/census_2011.py
python pipeline/01_ingest/nfhs5.py
python pipeline/01_ingest/nightlights_viirs.py
# ... etc (see pipeline/01_ingest/ for all scripts)
```

### Troubleshooting

- **`FileNotFoundError`**: Run from the project root directory
- **`ModuleNotFoundError`**: Run `pip install -r requirements.txt`
- **Stage fails with network error**: Government portals may be temporarily down. Re-run the failed stage individually, or check if the raw data file exists in `data/raw/`
