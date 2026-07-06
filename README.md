# DistrictDx

District-level pharmaceutical market attractiveness index (MAI) — a statistical framework outputting three indices (Overall, Chronic, Acute) across ~780+ Indian districts, featuring current and future trajectory views.

## Project Architecture

The directory structure is organized as follows:

```text
├── data/
│   ├── raw/               # Untouched raw public data downloads (partitioned by source)
│   └── processed/         # Cleaned, standardized, and LGD-reconciled datasets
├── pipeline/              # Modulary pipeline scripts:
│   ├── 01_ingest/         # Raw download and parsing scripts per source
│   ├── 02_reconcile/      # LGD directory crosswalk and boundary reconciliation
│   ├── 03_clean/          # Outlier winsorization, missing data hierarchical imputation
│   ├── 04_construct/      # Multi-variable sub-domain composite scoring
│   ├── 05_index/          # AHP weighting and geometric index formulation
│   ├── 06_validate/       # Proxy correlation metrics (PMJAY, HMIS, Jan Aushadhi)
│   ├── 07_future/         # Trend-based future opportunity adjustments
│   └── 08_export/         # Consolidated CSV exports and dashboard GeoJSONs
├── outputs/               # Final index tables, GeoJSONs, and data dictionaries
├── dashboard/             # Next.js interactive visualization application
├── ppt-assets/            # Extracted charts, maps, and plots for presentations
├── data_dictionary.csv    # Schema, sources, year, and limitations for all indicators
├── CLAUDE.md              # Core constraints, non-negotiables, and developer guidelines
└── README.md              # Replicability instructions
```

## Reproducibility & Execution

The entire pipeline can be executed using a single command sequence. 

### Prerequisites
- Python 3.8+
- Active internet connection (to retrieve open-source data from Indian government portals)

### Run Instructions
1. Install the required libraries:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the complete end-to-end pipeline:
   ```bash
   python pipeline/run_all.py
   ```

The script will ingest the raw files, perform cleanups and imputations, construct AHP-weighted indices, perform validation correlations, and export the final datasets to the `/outputs` folder.
