"""
Stage 8 — Future Opportunity Index
===================================

  1. Computes Historical MAI (NFHS-4 / VIIRS 2015 baseline):
     - Loads raw NFHS-4 data and pivots indicators.
     - Loads nightlights data for the year 2015.
     - Imputes missing historical data using the same hierarchical fallback logic
       (district -> state avg -> national avg) and winsorizes at 1st/99th percentiles.
     - Normalizes historical data using the current variable bounds (ensuring a consistent scale).
     - Computes historical subdomain composites using AHP weights, and combines them
       into historical axis scores and historical MAI scores (geometric mean).

  2. Computes TrendSlope:
     - TrendSlope = (Current_MAI - Historical_MAI) / 4.0
       (representing annual rate of change over the ~4-year period from 2015-16 to 2019-21).

  3. Computes Future MAI:
     - Future_MAI = Current_MAI + β * TrendSlope
     - Default β = 0.3 (sensitivity tested at β = 0.2 and β = 0.4).

  4. Outputs:
     - /data/processed/district_index_future.csv (contains all current and future MAI variants)
"""

import logging
from pathlib import Path
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
MASTER_FILE = Path("data/processed/district_master.csv")
CLEAN_FILE = Path("data/processed/district_variables_clean.csv")
INDEX_FILE = Path("data/processed/district_index_scores.csv")
AHP_FILE = Path("data/processed/ahp_weights.csv")
RAW_DIR = Path("data/raw")
OUT_DIR = Path("data/processed")
OUT_FILE = OUT_DIR / "district_index_future.csv"

# ── Parameters ────────────────────────────────────────────────────────────────
DEFAULT_BETA = 0.3
BETA_SENSITIVITIES = [0.2, 0.3, 0.4]
TIME_DELTA = 4.0  # Approx 4 years between NFHS-4 and NFHS-5
EPSILON = 1e-10

# ── NFHS mapping helper ───────────────────────────────────────────────────────
NFHS_VARS = [
    "nfhs5_high_blood_sugar_pct", "nfhs5_elevated_bp_pct", "nfhs5_women_overweight_pct",
    "nfhs5_women_tobacco_pct", "nfhs5_men_tobacco_pct", "nfhs5_women_alcohol_pct",
    "nfhs5_men_alcohol_pct", "nfhs5_child_diarrhoea_pct", "nfhs5_child_ari_pct",
    "nfhs5_improved_sanitation_pct", "nfhs5_improved_water_pct", "nfhs5_child_underweight_pct"
]

NFHS4_MAPPING = {
    "nfhs5_high_blood_sugar_pct": "nfhs4_sugar",
    "nfhs5_elevated_bp_pct": "nfhs4_bp",
    "nfhs5_women_overweight_pct": "nfhs4_overweight",
    "nfhs5_child_diarrhoea_pct": "nfhs4_diarrhoea",
    "nfhs5_child_ari_pct": "nfhs4_ari",
    "nfhs5_improved_sanitation_pct": "nfhs4_sanitation",
    "nfhs5_improved_water_pct": "nfhs4_water",
    "nfhs5_child_underweight_pct": "nfhs4_underweight"
}


def winsorise(s: pd.Series, lo: int = 1, hi: int = 99) -> pd.Series:
    vals = s.dropna()
    if len(vals) == 0:
        return s
    p_lo = float(np.nanpercentile(vals, lo))
    p_hi = float(np.nanpercentile(vals, hi))
    return s.clip(lower=p_lo, upper=p_hi)


def main():
    log.info("=== Stage 8: Future Opportunity Index ===")
    
    # ── Load current datasets ─────────────────────────────────────────────────
    master = pd.read_csv(MASTER_FILE)
    clean_df = pd.read_csv(CLEAN_FILE)
    idx_df = pd.read_csv(INDEX_FILE)
    ahp_df = pd.read_csv(AHP_FILE)
    
    log.info("Loaded district index scores: %s", idx_df.shape)
    
    # ── Load raw datasets to reconstruct NFHS-4 baseline ──────────────────────
    log.info("Reconstructing historical NFHS-4 variables …")
    nfhs4_raw = pd.read_csv(RAW_DIR / "nfhs4" / "nfhs4_district.csv")
    
    needed_nf4_indicators = {
        81: "nfhs4_sugar",
        74: "nfhs4_overweight",
        52: "nfhs4_diarrhoea",
        60: "nfhs4_ari",
        8: "nfhs4_sanitation",
        7: "nfhs4_water",
        71: "nfhs4_underweight",
    }
    bp_indicators = [85, 86, 87]
    
    # Filter and extract
    nf4_subset = nfhs4_raw[nfhs4_raw["indicator_number"].isin(list(needed_nf4_indicators.keys()) + bp_indicators)].copy()
    nf4_subset["val"] = pd.to_numeric(nf4_subset["total"], errors="coerce")
    
    records_n4 = {}
    for _, row in nf4_subset.iterrows():
        dist_code = row["district_census_code"]
        if pd.isna(dist_code):
            continue
        dist_code = int(dist_code)
        if dist_code not in records_n4:
            records_n4[dist_code] = {"census_2011_district_code": dist_code}
        
        ind_num = row["indicator_number"]
        val = row["val"]
        if ind_num in needed_nf4_indicators:
            records_n4[dist_code][needed_nf4_indicators[ind_num]] = val
        elif ind_num in bp_indicators:
            records_n4[dist_code][f"bp_{ind_num}"] = val
            
    n4_df = pd.DataFrame.from_dict(records_n4, orient="index").reset_index(drop=True)
    n4_df["nfhs4_bp"] = n4_df[["bp_85", "bp_86", "bp_87"]].max(axis=1)
    
    # ── Load 2015 nightlights ─────────────────────────────────────────────────
    log.info("Loading 2015 nightlights data …")
    nl_panel = pd.read_csv(RAW_DIR / "nightlights_viirs" / "nightlights_district_panel.csv")
    nl_2015 = nl_panel[nl_panel["year"] == 2015][["district_id", "log1p_mean"]].copy()
    nl_2015.rename(columns={"district_id": "census_2011_district_code", "log1p_mean": "nightlight_log_mean_2015"}, inplace=True)
    
    # ── Reconstruct Historical Frame ──────────────────────────────────────────
    hist_df = master[["lgd_state_code", "lgd_district_code", "district_name", "state_name", "census_2011_district_code"]].copy()
    hist_df = hist_df.merge(n4_df, on="census_2011_district_code", how="left")
    hist_df = hist_df.merge(nl_2015, on="census_2011_district_code", how="left")
    
    # ── Populate historical variables ──────────────────────────────────────────
    log.info("Mapping and imputing historical variables …")
    
    # Variable list matches Stage 5
    VARIABLES = list(clean_df.columns[6:25])  # The 19 active variable columns
    
    # Create empty columns for hist variables
    hist_vars = {}
    
    # Re-calculate or map each variable to its 2015 counterpart
    for col in VARIABLES:
        if col in NFHS4_MAPPING:
            # NFHS variables with baseline counterparts
            nf4_col = NFHS4_MAPPING[col]
            hist_vars[col] = hist_df[nf4_col]
        elif col == "nightlight_log_mean":
            # Nightlight baseline
            hist_vars[col] = hist_df["nightlight_log_mean_2015"]
        else:
            # Variables without baseline counterparts (static Demographics, tobacco/alcohol, or growth rates)
            # We carry forward their current values as the baseline (delta = 0)
            hist_vars[col] = clean_df[col]
            
    hist_cleaned = pd.DataFrame(hist_vars, index=clean_df.index)
    hist_cleaned["state_name"] = clean_df["state_name"]
    
    # Apply Hierarchical Imputation to fill missing historical values
    # Try district -> state average -> national average
    state_avgs = hist_cleaned.groupby("state_name").mean(numeric_only=True)
    national_avgs = hist_cleaned.mean(numeric_only=True)
    
    for col in VARIABLES:
        # Check nulls
        null_mask = hist_cleaned[col].isna()
        if null_mask.sum() > 0:
            for idx in hist_cleaned[null_mask].index:
                state = hist_cleaned.at[idx, "state_name"]
                # Try state average
                val = state_avgs.loc[state, col] if state in state_avgs.index else np.nan
                if pd.isna(val):
                    # Try national average
                    val = national_avgs[col]
                hist_cleaned.at[idx, col] = val
                
        # Winsorize historical variables at 1st/99th percentiles
        hist_cleaned[col] = winsorise(hist_cleaned[col])

    # ── Normalize Historical Variables (Using CURRENT bounds) ──────────────────
    log.info("Normalizing historical variables using current variable scales …")
    hist_normalized = {}
    for col in VARIABLES:
        current_min = clean_df[col].min()
        current_max = clean_df[col].max()
        denom = current_max - current_min
        if denom == 0:
            hist_normalized[col] = pd.Series(0.0, index=clean_df.index)
        else:
            hist_normalized[col] = (hist_cleaned[col] - current_min) / denom
            
    hist_norm_df = pd.DataFrame(hist_normalized)

    # ── Compute Historical Subdomain Composites ────────────────────────────────
    log.info("Computing historical subdomain composites via AHP weights …")
    
    # Load AHP weights by domain
    weights_dict = {}
    for domain, group in ahp_df.groupby("domain_group"):
        weights_dict[domain] = {row["variable"]: row["ahp_weight"] for _, row in group.iterrows()}
        
    hist_composites = {}
    DOMAINS = {
        "Demand-Chronic": [
            "census_total_population", "sex_ratio", "nfhs5_high_blood_sugar_pct",
            "nfhs5_elevated_bp_pct", "nfhs5_women_overweight_pct", "nfhs5_women_tobacco_pct",
            "nfhs5_men_tobacco_pct", "nfhs5_women_alcohol_pct", "nfhs5_men_alcohol_pct"
        ],
        "Demand-Acute": [
            "census_total_population", "sex_ratio", "nfhs5_child_diarrhoea_pct",
            "nfhs5_child_ari_pct", "nfhs5_child_underweight_pct"
        ],
        "Realizability-Chronic": [
            "nightlight_log_mean", "nightlight_growth_rate", "literacy_rate"
        ],
        "Realizability-Acute": [
            "latrine_access_rate", "tap_water_rate", "nfhs5_improved_sanitation_pct",
            "nfhs5_improved_water_pct"
        ]
    }
    
    for domain, cols in DOMAINS.items():
        w_map = weights_dict[domain]
        # Weighted sum
        w_sum = pd.Series(0.0, index=clean_df.index)
        for col in cols:
            w_sum += hist_norm_df[col] * w_map[col]
        hist_composites[domain] = w_sum

    # Combine into historical axis scores
    Demand_Chronic_Hist = hist_composites["Demand-Chronic"]
    Demand_Acute_Hist = hist_composites["Demand-Acute"]
    Real_Chronic_Hist = hist_composites["Realizability-Chronic"]
    Real_Acute_Hist = hist_composites["Realizability-Acute"]
    
    Demand_Overall_Hist = 0.5 * Demand_Chronic_Hist + 0.5 * Demand_Acute_Hist
    Real_Overall_Hist = 0.5 * Real_Chronic_Hist + 0.5 * Real_Acute_Hist

    # Compute Historical MAI scores (geometric mean)
    MAI_Overall_Hist = (Demand_Overall_Hist.clip(lower=EPSILON) ** 0.5) * (Real_Overall_Hist.clip(lower=EPSILON) ** 0.5)
    MAI_Chronic_Hist = (Demand_Chronic_Hist.clip(lower=EPSILON) ** 0.5) * (Real_Chronic_Hist.clip(lower=EPSILON) ** 0.5)
    MAI_Acute_Hist = (Demand_Acute_Hist.clip(lower=EPSILON) ** 0.5) * (Real_Acute_Hist.clip(lower=EPSILON) ** 0.5)

    # ── Compute TrendSlopes ───────────────────────────────────────────────────
    log.info("Calculating index trend slopes (Current MAI vs. Historical MAI) …")
    
    slope_overall = (idx_df["MAI_Overall"] - MAI_Overall_Hist) / TIME_DELTA
    slope_chronic = (idx_df["MAI_Chronic"] - MAI_Chronic_Hist) / TIME_DELTA
    slope_acute = (idx_df["MAI_Acute"] - MAI_Acute_Hist) / TIME_DELTA

    log.info("  Trend slopes ranges:")
    log.info("    Overall Slope: [%.4f, %.4f]  mean=%.4f", slope_overall.min(), slope_overall.max(), slope_overall.mean())
    log.info("    Chronic Slope: [%.4f, %.4f]  mean=%.4f", slope_chronic.min(), slope_chronic.max(), slope_chronic.mean())
    log.info("    Acute Slope:   [%.4f, %.4f]  mean=%.4f", slope_acute.min(), slope_acute.max(), slope_acute.mean())

    # ── Reconstruct Future MAI scores ──────────────────────────────────────────
    future_df = idx_df.copy()
    
    # Save historical metrics and slopes for reference
    future_df["MAI_Overall_hist"] = MAI_Overall_Hist
    future_df["MAI_Chronic_hist"] = MAI_Chronic_Hist
    future_df["MAI_Acute_hist"] = MAI_Acute_Hist
    future_df["slope_overall"] = slope_overall
    future_df["slope_chronic"] = slope_chronic
    future_df["slope_acute"] = slope_acute

    # Compute future MAI scores across β sensitivities
    for beta in BETA_SENSITIVITIES:
        future_df[f"Future_MAI_Overall_beta_{beta}"] = idx_df["MAI_Overall"] + beta * slope_overall
        future_df[f"Future_MAI_Chronic_beta_{beta}"] = idx_df["MAI_Chronic"] + beta * slope_chronic
        future_df[f"Future_MAI_Acute_beta_{beta}"] = idx_df["MAI_Acute"] + beta * slope_acute

    # Default is beta = 0.3
    future_df["Future_MAI_Overall"] = future_df["Future_MAI_Overall_beta_0.3"]
    future_df["Future_MAI_Chronic"] = future_df["Future_MAI_Chronic_beta_0.3"]
    future_df["Future_MAI_Acute"] = future_df["Future_MAI_Acute_beta_0.3"]

    log.info("  Future MAI scores (beta=%.1f) ranges:", DEFAULT_BETA)
    for col in ["Future_MAI_Overall", "Future_MAI_Chronic", "Future_MAI_Acute"]:
        log.info("    %s: [%.4f, %.4f]  mean=%.4f", col, future_df[col].min(), future_df[col].max(), future_df[col].mean())

    # ── Future 2×2 Decomposition (Within-State Median Split on Future Axes) ────
    log.info("Assigning future 2×2 quadrants (beta=0.3) …")
    
    # Future axis values (Current axis + beta * respective variable slope, wait! Or simply reconstruct using Future MAI?)
    # Since future attractiveness is represented by Future MAI, let's see how the 2x2 quadrants are assigned.
    # Bucket each district into High/Low on Demand and Realizability.
    # For future indices, we can calculate the future Demand and Future Realizability axes:
    # Future Demand = Current Demand + beta * Demand_Slope
    # Future Realizability = Current Realizability + beta * Real_Slope
    
    slope_demand_overall = (idx_df["Demand_Overall"] - Demand_Overall_Hist) / TIME_DELTA
    slope_real_overall = (idx_df["Realizability_Overall"] - Real_Overall_Hist) / TIME_DELTA
    
    slope_demand_chronic = (idx_df["Demand_Chronic"] - Demand_Chronic_Hist) / TIME_DELTA
    slope_real_chronic = (idx_df["Realizability_Chronic"] - Real_Chronic_Hist) / TIME_DELTA
    
    slope_demand_acute = (idx_df["Demand_Acute"] - Demand_Acute_Hist) / TIME_DELTA
    slope_real_acute = (idx_df["Realizability_Acute"] - Real_Acute_Hist) / TIME_DELTA
    
    # Save future axis scores
    future_df["Future_Demand_Overall"] = idx_df["Demand_Overall"] + DEFAULT_BETA * slope_demand_overall
    future_df["Future_Realizability_Overall"] = idx_df["Realizability_Overall"] + DEFAULT_BETA * slope_real_overall
    
    future_df["Future_Demand_Chronic"] = idx_df["Demand_Chronic"] + DEFAULT_BETA * slope_demand_chronic
    future_df["Future_Realizability_Chronic"] = idx_df["Realizability_Chronic"] + DEFAULT_BETA * slope_real_chronic
    
    future_df["Future_Demand_Acute"] = idx_df["Demand_Acute"] + DEFAULT_BETA * slope_demand_acute
    future_df["Future_Realizability_Acute"] = idx_df["Realizability_Acute"] + DEFAULT_BETA * slope_real_acute
    
    # Within-state median splits on future axis components
    def assign_future_quadrants(df: pd.DataFrame, d_col: str, r_col: str) -> pd.Series:
        quads = pd.Series("", index=df.index)
        for state, group in df.groupby("state_name"):
            d_med = group[d_col].median()
            r_med = group[r_col].median()
            
            high_d = group[d_col] >= d_med
            high_r = group[r_col] >= r_med
            
            quads.loc[group.index[high_d & high_r]] = "Star"
            quads.loc[group.index[high_d & ~high_r]] = "Emerging"
            quads.loc[group.index[~high_d & high_r]] = "Underserved"
            quads.loc[group.index[~high_d & ~high_r]] = "Deprioritize"
        return quads

    future_df["quadrant_overall_future"] = assign_future_quadrants(future_df, "Future_Demand_Overall", "Future_Realizability_Overall")
    future_df["quadrant_chronic_future"] = assign_future_quadrants(future_df, "Future_Demand_Chronic", "Future_Realizability_Chronic")
    future_df["quadrant_acute_future"] = assign_future_quadrants(future_df, "Future_Demand_Acute", "Future_Realizability_Acute")

    # ── Report Sensitivity & Ranking Shifts ────────────────────────────────────
    log.info("\n=== FUTURE OPPORTUNITY SENSITIVITY CHECK ===")
    
    # Calculate top-20 overlap between current and future
    curr_rank = idx_df["MAI_Overall"].rank(ascending=False)
    curr_top20 = set(curr_rank[curr_rank <= 20].index)
    
    for beta in BETA_SENSITIVITIES:
        fut_rank = future_df[f"Future_MAI_Overall_beta_{beta}"].rank(ascending=False)
        fut_top20 = set(fut_rank[fut_rank <= 20].index)
        overlap = len(curr_top20 & fut_top20)
        log.info("  β = %.1f: Top-20 Overlap with Current = %d/20  (Shifts = %d districts)", 
                 beta, overlap, 20 - overlap)

    # Save output file
    future_df.to_csv(OUT_FILE, index=False)
    log.info("Saved future index scores → %s  (shape: %s)", OUT_FILE, future_df.shape)

    # Print top-10 future growth districts
    future_df["mai_gain"] = future_df["Future_MAI_Overall"] - future_df["MAI_Overall"]
    log.info("\n=== Top-10 Districts by Future Attractiveness Gain ===")
    log.info("\n%s", future_df.nlargest(10, "mai_gain")[
        ["district_name", "state_name", "MAI_Overall", "Future_MAI_Overall", "mai_gain", "quadrant_overall_future"]
    ].to_string(index=False))


if __name__ == "__main__":
    main()
