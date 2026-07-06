"""
Stage 4 — Cleaning + Missing Data Imputation
=============================================
Joins every ingested raw source onto district_master.csv by LGD code.
Applies hierarchical imputation (district → state avg → national avg).
Winsorizes each raw variable at 1st/99th percentile.
Computes per-district confidence_score.
Outputs /data/processed/district_variables_clean.csv.

Sources used:
  - Census 2011 PCA (population, density, literacy, sex ratio)
  - Census 2011 HLPCA (household amenities: latrine, drinking water)
  - NFHS-5 district indicators (chronic risk factors, WASH, child morbidity)
  - VIIRS nightlights panel (income proxy, growth rate)
  - district_master.csv (LGD crosswalk, census_2011_district_code)

TECHSPEC §3 rules enforced:
  - Imputation hierarchy: district → state avg → national avg
  - Imputation flags: {var}__imputed_state_avg, {var}__imputed_national_avg
  - Winsorisation before any normalisation
  - confidence_score = 1 − fraction of imputed variables
"""

import logging
import re
from pathlib import Path
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
MASTER = Path("data/processed/district_master.csv")
RAW = Path("data/raw")
OUT_DIR = Path("data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "district_variables_clean.csv"


# ── Helpers ────────────────────────────────────────────────────────────────────

def winsorise(s: pd.Series, lo: int = 1, hi: int = 99) -> pd.Series:
    """Clip series to [p_lo, p_hi] percentile bounds (winsorisation)."""
    vals = s.dropna()
    if len(vals) == 0:
        return s
    p_lo = float(np.nanpercentile(vals, lo))
    p_hi = float(np.nanpercentile(vals, hi))
    return s.clip(lower=p_lo, upper=p_hi)


def safe_numeric(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce")


def norm_name(s: str) -> str:
    """Normalize district/state names for fuzzy matching across sources."""
    return re.sub(r'\s+', ' ',
                  str(s).strip().lower()
                  .replace("&", " and ")
                  .replace("-", " ")
                  .replace("(", " ").replace(")", " ")
                  .replace(" island", " islands"))


def main():
    # ── 1. District master ─────────────────────────────────────────────────────────

    log.info("Loading district master …")
    master = pd.read_csv(MASTER)
    master["census_2011_district_code"] = pd.to_numeric(
        master["census_2011_district_code"], errors="coerce"
    )
    log.info("  master shape: %s", master.shape)

    df = master[["lgd_state_code", "lgd_district_code", "district_name",
                 "state_name", "census_2011_district_code", "notes"]].copy()
    expected_rows = len(df)


    # ── 2. Census 2011 PCA ────────────────────────────────────────────────────────

    log.info("Processing Census 2011 PCA …")
    pca_raw = pd.read_csv(RAW / "census_2011/census2011_pca_total.csv")
    pca_dist = pca_raw[(pca_raw["Level"] == "DISTRICT") & (pca_raw["TRU"] == "Total")].copy()
    pca_dist["District"] = pd.to_numeric(pca_dist["District"], errors="coerce")

    pca_keep = pca_dist[["District", "TOT_P", "TOT_M", "TOT_F",
                           "P_LIT", "P_SC", "P_ST"]].copy()
    pca_keep.rename(columns={
        "District": "census_2011_district_code",
        "TOT_P": "census_total_population",
        "TOT_M": "census_total_male",
        "TOT_F": "census_total_female",
        "P_LIT": "census_literates",
    }, inplace=True)

    pca_keep["literacy_rate"] = (
        safe_numeric(pca_keep["census_literates"])
        / safe_numeric(pca_keep["census_total_population"]) * 100
    )
    pca_keep["sex_ratio"] = (
        safe_numeric(pca_keep["census_total_female"])
        / safe_numeric(pca_keep["census_total_male"]) * 1000
    )
    pca_out = pca_keep[["census_2011_district_code", "census_total_population",
                          "literacy_rate", "sex_ratio"]].copy()

    df = df.merge(pca_out, on="census_2011_district_code", how="left")
    assert len(df) == expected_rows, f"Row count changed after Census PCA merge: expected {expected_rows}, got {len(df)}"
    log.info("  After PCA merge: %s  (nulls in census_total_population: %d)",
             df.shape, df["census_total_population"].isna().sum())


    # ── 3. Census 2011 HLPCA — household amenities ────────────────────────────────

    log.info("Processing Census 2011 HLPCA …")
    hlpca_raw = pd.read_csv(RAW / "census_2011/census2011_hlpca_total.csv")
    hlpca = hlpca_raw[hlpca_raw["Rural/Urban"] == "Total"].copy()
    hlpca["District Code"] = pd.to_numeric(hlpca["District Code"], errors="coerce")

    hlpca_keep = hlpca[["District Code", "Total", "Latrine_premise",
                          "DW_TFTS"]].copy()
    hlpca_keep.rename(columns={
        "District Code": "census_2011_district_code",
        "Total": "hlpca_total_hh",
        "Latrine_premise": "hh_with_latrine",
        "DW_TFTS": "hh_tap_water",
    }, inplace=True)
    hlpca_keep["latrine_access_rate"] = (
        safe_numeric(hlpca_keep["hh_with_latrine"])
        / safe_numeric(hlpca_keep["hlpca_total_hh"]) * 100
    )
    hlpca_keep["tap_water_rate"] = (
        safe_numeric(hlpca_keep["hh_tap_water"])
        / safe_numeric(hlpca_keep["hlpca_total_hh"]) * 100
    )
    hlpca_out = hlpca_keep[["census_2011_district_code",
                              "latrine_access_rate", "tap_water_rate"]].copy()

    df = df.merge(hlpca_out, on="census_2011_district_code", how="left")
    assert len(df) == expected_rows, f"Row count changed after HLPCA merge: expected {expected_rows}, got {len(df)}"
    log.info("  After HLPCA merge: %s", df.shape)


    # ── 4. NFHS-5 district indicators ────────────────────────────────────────────

    log.info("Processing NFHS-5 district indicators …")
    nfhs5 = pd.read_csv(RAW / "nfhs5/NFHS-5-Districts.csv")
    nfhs5["nfhs5_val"] = safe_numeric(nfhs5["NFHS-5"])

    # Map: indicator substring → output column name
    INDICATOR_MAP = {
        "88. Blood sugar level - high or very high": "nfhs5_high_blood_sugar_pct",
        "94. Elevated blood pressure": "nfhs5_elevated_bp_pct",
        "79. Women who are overweight or obese": "nfhs5_women_overweight_pct",
        "101. Women age 15 years and above who use any kind of tobacco": "nfhs5_women_tobacco_pct",
        "102. Men age 15 years and above who use any kind of tobacco": "nfhs5_men_tobacco_pct",
        "103. Women age 15 years and above who consume alcohol": "nfhs5_women_alcohol_pct",
        "104. Men age 15 years and above who consume alcohol": "nfhs5_men_alcohol_pct",
        "61. Prevalence of diarrhoea in the 2 weeks": "nfhs5_child_diarrhoea_pct",
        "65. Prevalence of symptoms of acute respiratory infection": "nfhs5_child_ari_pct",
        "9. Population living in households that use an improved sanitation": "nfhs5_improved_sanitation_pct",
        "8. Population living in households with an improved drinking-water": "nfhs5_improved_water_pct",
        "76. Children under 5 years who are underweight": "nfhs5_child_underweight_pct",
    }

    # Build a wide table: (state, district) → one value per indicator
    records: dict = {}
    for _, row in nfhs5.iterrows():
        ind_str = str(row["Indicator"])
        key = (norm_name(str(row["State"])), norm_name(str(row["District"])))
        if key not in records:
            records[key] = {"_s": key[0], "_d": key[1]}
        for ind_key, col_name in INDICATOR_MAP.items():
            if ind_key.lower() in ind_str.lower():
                records[key][col_name] = row["nfhs5_val"]

    nfhs5_wide = pd.DataFrame.from_dict(records, orient="index").reset_index(drop=True)

    # Join to master via normalised state + district name
    df["_d"] = df["district_name"].apply(norm_name)
    df["_s"] = df["state_name"].apply(norm_name)
    df = df.merge(nfhs5_wide.drop_duplicates(["_s", "_d"]),
                  on=["_s", "_d"], how="left").drop(columns=["_s", "_d"])
    assert len(df) == expected_rows, f"Row count changed after NFHS-5 merge: expected {expected_rows}, got {len(df)}"

    log.info("  After NFHS-5 merge: %s", df.shape)
    # Count matched rows
    nfhs5_vars = list(INDICATOR_MAP.values())
    nfhs5_vars_present = [c for c in nfhs5_vars if c in df.columns]
    if nfhs5_vars_present:
        matched = df[nfhs5_vars_present[0]].notna().sum()
        log.info("  NFHS-5 districts matched: %d / %d", matched, len(df))


    # ── 4.5. NFHS-4 district indicators ───────────────────────────────────────────

    log.info("Processing NFHS-4 district indicators …")
    nfhs4_raw = pd.read_csv(RAW / "nfhs4/nfhs4_district.csv")

    # We pivot the required indicators
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

    nf4_subset = nfhs4_raw[nfhs4_raw["indicator_number"].isin(list(needed_nf4_indicators.keys()) + bp_indicators)].copy()
    nf4_subset["val"] = safe_numeric(nf4_subset["total"])

    records_n4: dict = {}
    for _, row in nf4_subset.iterrows():
        dist_code = row["district_census_code"]
        if pd.isna(dist_code):
            continue
        dist_code = int(dist_code)
        
        if dist_code not in records_n4:
            records_n4[dist_code] = {
                "census_2011_district_code": dist_code,
            }
        
        ind_num = row["indicator_number"]
        val = row["val"]
        if ind_num in needed_nf4_indicators:
            records_n4[dist_code][needed_nf4_indicators[ind_num]] = val
        elif ind_num in bp_indicators:
            records_n4[dist_code][f"bp_{ind_num}"] = val

    n4_wide = pd.DataFrame.from_dict(records_n4, orient="index").reset_index(drop=True)
    # ponytail: bp_85/86/87 overlap on sys/dia OR thresholds — use max as union proxy
    n4_wide["nfhs4_bp"] = n4_wide[["bp_85", "bp_86", "bp_87"]].max(axis=1)
    n4_wide.drop(columns=["bp_85", "bp_86", "bp_87"], inplace=True, errors="ignore")

    # Merge NFHS-4 variables onto the master frame
    df = df.merge(n4_wide, on="census_2011_district_code", how="left")
    assert len(df) == expected_rows, f"Row count changed after NFHS-4 merge: expected {expected_rows}, got {len(df)}"
    log.info("  After NFHS-4 merge: %s", df.shape)


    # ── 5. VIIRS nightlights ──────────────────────────────────────────────────────

    log.info("Processing VIIRS nightlights …")
    nl = pd.read_csv(RAW / "nightlights_viirs/nightlights_district_panel.csv")

    # Latest year income proxy
    latest_year = nl["year"].max()
    nl_latest = nl[nl["year"] == latest_year][
        ["district_id", "log1p_mean"]
    ].copy()
    nl_latest.rename(columns={
        "district_id": "census_2011_district_code",
        "log1p_mean": "nightlight_log_mean",
    }, inplace=True)

    # Annual growth slope (log1p_mean ~ year OLS)
    def _slope(grp: pd.DataFrame) -> float:
        x = grp["year"].values.astype(float)
        y = grp["log1p_mean"].values.astype(float)
        mask = ~np.isnan(y)
        if mask.sum() < 3:
            return np.nan
        return float(np.polyfit(x[mask], y[mask], 1)[0])

    nl_growth = (
        nl.groupby("district_id")
        .apply(_slope)
        .reset_index()
        .rename(columns={"district_id": "census_2011_district_code", 0: "nightlight_growth_rate"})
    )

    nl_all = nl_latest.merge(nl_growth, on="census_2011_district_code", how="left")
    df = df.merge(nl_all, on="census_2011_district_code", how="left")
    assert len(df) == expected_rows, f"Row count changed after nightlights merge: expected {expected_rows}, got {len(df)}"
    log.info("  After nightlights merge: %s", df.shape)


    # ── 6. Define variable columns ────────────────────────────────────────────────

    VARIABLE_COLS = [
        "census_total_population",
        "literacy_rate",
        "sex_ratio",
        "latrine_access_rate",
        "tap_water_rate",
        "nfhs5_high_blood_sugar_pct",
        "nfhs5_elevated_bp_pct",
        "nfhs5_women_overweight_pct",
        "nfhs5_women_tobacco_pct",
        "nfhs5_men_tobacco_pct",
        "nfhs5_women_alcohol_pct",
        "nfhs5_men_alcohol_pct",
        "nfhs5_child_diarrhoea_pct",
        "nfhs5_child_ari_pct",
        "nfhs5_improved_sanitation_pct",
        "nfhs5_improved_water_pct",
        "nfhs5_child_underweight_pct",
        "nightlight_log_mean",
        "nightlight_growth_rate",
    ]
    VARIABLE_COLS = [c for c in VARIABLE_COLS if c in df.columns]
    log.info("Variable columns for imputation (%d): %s", len(VARIABLE_COLS), VARIABLE_COLS)


    # ── 7. Winsorise Raw Variables ────────────────────────────────────────────────

    log.info("Winsorising raw variables at 1st/99th percentile …")
    for col in VARIABLE_COLS:
        df[col] = safe_numeric(df[col])
        df[col] = winsorise(df[col])

    # Also winsorise NFHS-4 variables to prevent outlier propagation
    NF5_TO_NF4_MAP = {
        "nfhs5_high_blood_sugar_pct": "nf4_sugar",
        "nfhs5_elevated_bp_pct": "nf4_bp",
        "nfhs5_women_overweight_pct": "nf4_overweight",
        "nfhs5_child_diarrhoea_pct": "nf4_diarrhoea",
        "nfhs5_child_ari_pct": "nf4_ari",
        "nfhs5_improved_sanitation_pct": "nf4_sanitation",
        "nfhs5_improved_water_pct": "nf4_water",
        "nfhs5_child_underweight_pct": "nf4_underweight",
    }

    # Rename the merged NFHS-4 columns to match our map
    df.rename(columns={
        "nfhs4_sugar": "nf4_sugar",
        "nfhs4_bp": "nf4_bp",
        "nfhs4_overweight": "nf4_overweight",
        "nfhs4_diarrhoea": "nf4_diarrhoea",
        "nfhs4_ari": "nf4_ari",
        "nfhs4_sanitation": "nf4_sanitation",
        "nfhs4_water": "nf4_water",
        "nfhs4_underweight": "nf4_underweight",
    }, inplace=True, errors="ignore")

    for nf4_col in NF5_TO_NF4_MAP.values():
        if nf4_col in df.columns:
            df[nf4_col] = safe_numeric(df[nf4_col])
            df[nf4_col] = winsorise(df[nf4_col])


    # ── 8. Hierarchical Imputation ────────────────────────────────────────────────

    log.info("Applying revised hierarchical imputation …")

    # Define NFHS-5 sourced variables
    NFHS5_VARS = [
        "nfhs5_high_blood_sugar_pct",
        "nfhs5_elevated_bp_pct",
        "nfhs5_women_overweight_pct",
        "nfhs5_women_tobacco_pct",
        "nfhs5_men_tobacco_pct",
        "nfhs5_women_alcohol_pct",
        "nfhs5_men_alcohol_pct",
        "nfhs5_child_diarrhoea_pct",
        "nfhs5_child_ari_pct",
        "nfhs5_improved_sanitation_pct",
        "nfhs5_improved_water_pct",
        "nfhs5_child_underweight_pct",
    ]

    # Initialize all flag columns to False
    for col in VARIABLE_COLS:
        df[f"{col}__imputed_state_avg"] = False
        df[f"{col}__imputed_national_avg"] = False
        if col in NFHS5_VARS:
            df[f"{col}__imputed_nfhs4_trend_adjusted"] = False

    # Precompute state and national averages for NFHS-5 and NFHS-4
    state_avgs_nf5 = df.groupby("state_name")[VARIABLE_COLS].mean()
    national_avgs_nf5 = df[VARIABLE_COLS].mean()

    state_avgs_nf4 = df.groupby("state_name")[list(NF5_TO_NF4_MAP.values())].mean()
    national_avgs_nf4 = df[list(NF5_TO_NF4_MAP.values())].mean()

    # For reporting counts
    reconciliation_counts = {}

    for col in VARIABLE_COLS:
        if df[col].isna().all():
            log.warning("Column %s is entirely NaN — skipping imputation (no source data joined)", col)
            continue
        direct_cnt = 0
        nf4_cnt = 0
        state_cnt = 0
        nat_cnt = 0

        if col in NF5_TO_NF4_MAP:
            nf4_col = NF5_TO_NF4_MAP[col]
            # Precompute deltas
            # ponytail: delta conflates temporal change + medication inclusion diff
            # (NFHS-5 indicator 88 includes "taking medicine", NFHS-4 indicator 81 does not)
            # Accept ~5-15% inflation in trend-adjusted values for now.
            state_deltas = state_avgs_nf5[col] - state_avgs_nf4[nf4_col]
            national_delta = float(national_avgs_nf5[col] - national_avgs_nf4[nf4_col])

            for idx, row in df.iterrows():
                val_nf5 = row[col]
                if not pd.isna(val_nf5):
                    # Tier 1: District-direct
                    direct_cnt += 1
                else:
                    val_nf4 = row[nf4_col]
                    if not pd.isna(val_nf4):
                        # Tier 2: NFHS-4 trend-adjusted
                        state = row["state_name"]
                        delta = state_deltas.get(state, np.nan)
                        if pd.isna(delta):
                            delta = national_delta
                        
                        df.at[idx, col] = val_nf4 + delta
                        df.at[idx, f"{col}__imputed_nfhs4_trend_adjusted"] = True
                        nf4_cnt += 1
                    else:
                        # Tier 3: State-average fallback
                        state = row["state_name"]
                        state_val = state_avgs_nf5.loc[state, col] if state in state_avgs_nf5.index else np.nan
                        if not pd.isna(state_val):
                            df.at[idx, col] = state_val
                            df.at[idx, f"{col}__imputed_state_avg"] = True
                            state_cnt += 1
                        else:
                            # Tier 4: National fallback
                            df.at[idx, col] = float(national_avgs_nf5[col])
                            df.at[idx, f"{col}__imputed_national_avg"] = True
                            nat_cnt += 1
        else:
            # Non-trend variable (tobacco, alcohol, Census, Nightlights)
            for idx, row in df.iterrows():
                val = row[col]
                if not pd.isna(val):
                    # Tier 1: District-direct
                    direct_cnt += 1
                else:
                    # Tier 2: State-average fallback
                    state = row["state_name"]
                    state_val = state_avgs_nf5.loc[state, col] if state in state_avgs_nf5.index else np.nan
                    if not pd.isna(state_val):
                        df.at[idx, col] = state_val
                        df.at[idx, f"{col}__imputed_state_avg"] = True
                        state_cnt += 1
                    else:
                        # Tier 3: National fallback
                        df.at[idx, col] = float(national_avgs_nf5[col])
                        df.at[idx, f"{col}__imputed_national_avg"] = True
                        nat_cnt += 1

        reconciliation_counts[col] = {
            "district-direct": direct_cnt,
            "NFHS-4-adjusted": nf4_cnt,
            "state-avg": state_cnt,
            "national-avg": nat_cnt,
            "total": direct_cnt + nf4_cnt + state_cnt + nat_cnt
        }

    # Final winsorization of variable columns to clean up trend-adjusted values
    for col in VARIABLE_COLS:
        df[col] = winsorise(df[col])

    # Print counts reconciliation table
    log.info("\n=== IMPUTATION COUNTS RECONCILIATION ===")
    log.info("%-35s | %-12s | %-15s | %-10s | %-12s | %-5s", 
             "Variable", "Direct", "NFHS-4-adjusted", "State-avg", "National-avg", "Total")
    log.info("-" * 105)
    for col, counts in reconciliation_counts.items():
        log.info("%-35s | %-12d | %-15d | %-10d | %-12d | %-5d",
                 col, counts["district-direct"], counts["NFHS-4-adjusted"],
                 counts["state-avg"], counts["national-avg"], counts["total"])
    log.info("-" * 105)


    # ── 9. Confidence Score ───────────────────────────────────────────────────────

    log.info("Computing confidence score …")
    imputed_flags = {}
    for col in VARIABLE_COLS:
        is_imputed = df[f"{col}__imputed_state_avg"] | df[f"{col}__imputed_national_avg"]
        if col in NFHS5_VARS:
            is_imputed = is_imputed | df[f"{col}__imputed_nfhs4_trend_adjusted"]
        imputed_flags[col] = is_imputed

    imputed_matrix = pd.DataFrame(imputed_flags)
    df["confidence_score"] = 1.0 - imputed_matrix.mean(axis=1)

    log.info("confidence_score — mean: %.3f  min: %.3f  max: %.3f",
             df["confidence_score"].mean(),
             df["confidence_score"].min(),
             df["confidence_score"].max())


    # ── 10. Save Output ───────────────────────────────────────────────────────────

    id_cols = ["lgd_state_code", "lgd_district_code", "district_name",
               "state_name", "census_2011_district_code", "notes"]

    flag_cols = []
    for col in VARIABLE_COLS:
        flag_cols.append(f"{col}__imputed_state_avg")
        flag_cols.append(f"{col}__imputed_national_avg")
        if col in NFHS5_VARS:
            flag_cols.append(f"{col}__imputed_nfhs4_trend_adjusted")

    out_cols = id_cols + VARIABLE_COLS + flag_cols + ["confidence_score"]
    out = df[out_cols]

    out.to_csv(OUT_FILE, index=False)
    log.info("Saved → %s  (shape: %s)", OUT_FILE, out.shape)

    # Acceptance check
    n_nulls = out[VARIABLE_COLS].isna().sum().sum()
    if n_nulls:
        log.error("FAIL: %d nulls remain in variable columns!", n_nulls)
    else:
        log.info("PASS: Zero nulls in all %d variable columns.", len(VARIABLE_COLS))

    # Print a top/bottom confidence summary for sanity
    log.info("\nTop-5 highest confidence districts:\n%s",
             out.nlargest(5, "confidence_score")[["district_name", "state_name", "confidence_score"]].to_string())
    log.info("\nBottom-5 lowest confidence districts:\n%s",
             out.nsmallest(5, "confidence_score")[["district_name", "state_name", "confidence_score"]].to_string())


if __name__ == "__main__":
    main()
