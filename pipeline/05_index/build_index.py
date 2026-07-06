"""
Stage 6 — Axis Scores, Composite Index, 2×2 Decomposition
===========================================================

  Step 2 — Axis scores:
    Demand_Chronic, Demand_Acute        = sub-domain composites (from Stage 5)
    Realizability_Chronic, Real_Acute   = sub-domain composites (from Stage 5)
    Demand_Overall      = 0.5 * Demand_Chronic  + 0.5 * Demand_Acute
    Realizability_Overall = 0.5 * Realizability_Chronic + 0.5 * Realizability_Acute
    (Default 50/50 chronic/acute blend; adjustable if Sun Pharma portfolio mix is disclosed.)

  Step 3 — Composite Index (GEOMETRIC MEAN, NOT weighted sum):
    MAI = Demand^α × Realizability^(1-α)
    Default α = 0.5.  Sensitivity tested at α ∈ {0.4, 0.5, 0.6}.
    A geometric mean is used deliberately so that a district near-zero on
    either axis scores poorly — a linear sum would incorrectly let high
    demand compensate for zero realizability.

  Step 4 — 2×2 decomposition:
    Each district is bucketed High/Low on Demand and Realizability using
    a **within-state median split** (not national median), because a national
    median split would merely reproduce a rich-state-vs-poor-state map.

Outputs:
  /data/processed/district_index_scores.csv   — all MAI scores, axis components,
                                                 quadrant labels, confidence_score
  /data/processed/alpha_sensitivity_report.csv — ranking shifts for top/bottom 20
                                                 across α values
"""

import logging
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
COMPOSITES_FILE = Path("data/processed/subdomain_composites.csv")
CLEAN_FILE = Path("data/processed/district_variables_clean.csv")
OUT_DIR = Path("data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

INDEX_FILE = OUT_DIR / "district_index_scores.csv"
SENSITIVITY_FILE = OUT_DIR / "alpha_sensitivity_report.csv"

# ── Parameters ────────────────────────────────────────────────────────────────
CHRONIC_ACUTE_BLEND = 0.5          # Default 50/50 chronic/acute blend
DEFAULT_ALPHA = 0.5                # Equal weight Demand vs Realizability
SENSITIVITY_ALPHAS = [0.4, 0.5, 0.6]
EPSILON = 1e-10                    # Floor to prevent log(0) in geometric mean


# ── Geometric Mean MAI ────────────────────────────────────────────────────────

def geometric_mai(demand: pd.Series, realizability: pd.Series,
                  alpha: float = 0.5) -> pd.Series:
    """
    MAI = Demand^α × Realizability^(1-α)

    Geometric mean form. It is NOT a weighted linear sum.
    A tiny epsilon floor prevents zero-valued inputs from producing NaN.
    """
    d = demand.clip(lower=EPSILON)
    r = realizability.clip(lower=EPSILON)
    return (d ** alpha) * (r ** (1.0 - alpha))


# ── 2×2 Quadrant Assignment ──────────────────────────────────────────────────

def assign_quadrants(df: pd.DataFrame, demand_col: str,
                     realizability_col: str, suffix: str) -> pd.Series:
    """
    Within-state median split.
    Not national median — a national median would just reproduce a
    rich-state-vs-poor-state map, which is not operationally useful.

    Quadrants (named for commercial interpretation):
      High-Demand / High-Realizability → "Star"         (priority markets)
      High-Demand / Low-Realizability  → "Underserved"  (access-constrained)
      Low-Demand  / High-Realizability → "Niche"        (infra ahead of need)
      Low-Demand  / Low-Realizability  → "Deprioritize" (low on both axes)
    """
    quadrants = pd.Series("", index=df.index)

    for state, group in df.groupby("state_name"):
        demand_median = group[demand_col].median()
        real_median = group[realizability_col].median()

        high_d = group[demand_col] >= demand_median
        high_r = group[realizability_col] >= real_median

        quadrants.loc[group.index[high_d & high_r]] = "Star"
        quadrants.loc[group.index[high_d & ~high_r]] = "Underserved"
        quadrants.loc[group.index[~high_d & high_r]] = "Niche"
        quadrants.loc[group.index[~high_d & ~high_r]] = "Deprioritize"

    return quadrants


# ── Alpha Sensitivity Analysis ────────────────────────────────────────────────

def sensitivity_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each MAI variant (Overall, Chronic, Acute), compute rankings at
    α ∈ {0.4, 0.5, 0.6} and report how much the top-20 / bottom-20 sets shift.
    """
    variants = {
        "MAI_Overall": ("Demand_Overall", "Realizability_Overall"),
        "MAI_Chronic": ("Demand_Chronic", "Realizability_Chronic"),
        "MAI_Acute":   ("Demand_Acute",   "Realizability_Acute"),
    }

    records = []
    for variant_name, (d_col, r_col) in variants.items():
        rankings = {}
        for alpha in SENSITIVITY_ALPHAS:
            mai = geometric_mai(df[d_col], df[r_col], alpha)
            rankings[alpha] = mai.rank(ascending=False, method="min")

        # Compare each α against the baseline (0.5)
        baseline_rank = rankings[DEFAULT_ALPHA]
        baseline_top20 = set(baseline_rank[baseline_rank <= 20].index)
        baseline_bot20 = set(baseline_rank[baseline_rank >= (len(df) - 19)].index)

        for alpha in SENSITIVITY_ALPHAS:
            rank = rankings[alpha]
            top20 = set(rank[rank <= 20].index)
            bot20 = set(rank[rank >= (len(df) - 19)].index)

            top20_overlap = len(baseline_top20 & top20)
            bot20_overlap = len(baseline_bot20 & bot20)

            # Spearman rank correlation with baseline
            spearman_corr = baseline_rank.corr(rank, method="spearman")

            records.append({
                "mai_variant": variant_name,
                "alpha": alpha,
                "top20_overlap_with_baseline": top20_overlap,
                "top20_shifted_out": 20 - top20_overlap,
                "bottom20_overlap_with_baseline": bot20_overlap,
                "bottom20_shifted_out": 20 - bot20_overlap,
                "spearman_rank_corr_vs_baseline": round(spearman_corr, 6),
            })

    return pd.DataFrame(records)


# ── Main Orchestrator ─────────────────────────────────────────────────────────

def main():
    log.info("=== Stage 6: Index Construction ===")

    # ── Load inputs ───────────────────────────────────────────────────────────
    composites = pd.read_csv(COMPOSITES_FILE)
    log.info("Loaded subdomain composites: %s", composites.shape)

    clean_df = pd.read_csv(CLEAN_FILE)
    log.info("Loaded clean variables (for confidence_score): %s", clean_df.shape)

    # ── Build output frame ────────────────────────────────────────────────────
    idx = composites[["lgd_state_code", "lgd_district_code",
                       "district_name", "state_name"]].copy()

    # ── Step 2: Axis Scores ───────────────────────────────────────────────────
    log.info("Step 2 — Computing axis scores …")

    # Therapy-specific axes (directly from sub-domain composites)
    idx["Demand_Chronic"] = composites["demand_chronic_composite"]
    idx["Demand_Acute"] = composites["demand_acute_composite"]
    idx["Realizability_Chronic"] = composites["realizability_chronic_composite"]
    idx["Realizability_Acute"] = composites["realizability_acute_composite"]

    # Overall axes = blended chronic + acute (default 50/50)
    w = CHRONIC_ACUTE_BLEND
    idx["Demand_Overall"] = (
        w * idx["Demand_Chronic"] + (1 - w) * idx["Demand_Acute"]
    )
    idx["Realizability_Overall"] = (
        w * idx["Realizability_Chronic"] + (1 - w) * idx["Realizability_Acute"]
    )

    log.info("  Axis score ranges:")
    for col in ["Demand_Overall", "Demand_Chronic", "Demand_Acute",
                "Realizability_Overall", "Realizability_Chronic",
                "Realizability_Acute"]:
        log.info("    %s: [%.4f, %.4f]  mean=%.4f",
                 col, idx[col].min(), idx[col].max(), idx[col].mean())

    # ── Step 3: Composite Index (GEOMETRIC MEAN) ─────────────────────────────
    log.info("Step 3 — Computing MAI via geometric mean (α=%.1f) …",
             DEFAULT_ALPHA)

    idx["MAI_Overall"] = geometric_mai(
        idx["Demand_Overall"], idx["Realizability_Overall"], DEFAULT_ALPHA
    )
    idx["MAI_Chronic"] = geometric_mai(
        idx["Demand_Chronic"], idx["Realizability_Chronic"], DEFAULT_ALPHA
    )
    idx["MAI_Acute"] = geometric_mai(
        idx["Demand_Acute"], idx["Realizability_Acute"], DEFAULT_ALPHA
    )

    log.info("  MAI score ranges:")
    for col in ["MAI_Overall", "MAI_Chronic", "MAI_Acute"]:
        log.info("    %s: [%.4f, %.4f]  mean=%.4f  median=%.4f",
                 col, idx[col].min(), idx[col].max(),
                 idx[col].mean(), idx[col].median())

    # ── Step 4: 2×2 Quadrant Decomposition (within-state median) ─────────────
    log.info("Step 4 — Assigning 2×2 quadrants (within-state median split) …")

    idx["quadrant_overall"] = assign_quadrants(
        idx, "Demand_Overall", "Realizability_Overall", "overall"
    )
    idx["quadrant_chronic"] = assign_quadrants(
        idx, "Demand_Chronic", "Realizability_Chronic", "chronic"
    )
    idx["quadrant_acute"] = assign_quadrants(
        idx, "Demand_Acute", "Realizability_Acute", "acute"
    )

    # Quadrant distribution
    for qcol in ["quadrant_overall", "quadrant_chronic", "quadrant_acute"]:
        log.info("  %s distribution:", qcol)
        for label, count in idx[qcol].value_counts().items():
            log.info("    %s: %d (%.1f%%)", label, count, 100 * count / len(idx))

    # ── Attach confidence_score from Stage 4 ──────────────────────────────────
    idx["confidence_score"] = clean_df["confidence_score"].values

    # ── Sensitivity Analysis ──────────────────────────────────────────────────
    log.info("Running alpha sensitivity analysis (α ∈ %s) …", SENSITIVITY_ALPHAS)
    sensitivity_df = sensitivity_analysis(idx)
    sensitivity_df.to_csv(SENSITIVITY_FILE, index=False)
    log.info("Saved sensitivity report → %s", SENSITIVITY_FILE)
    log.info("\n%s", sensitivity_df.to_string(index=False))

    # ── Save final index ──────────────────────────────────────────────────────
    idx.to_csv(INDEX_FILE, index=False)
    log.info("Saved district index scores → %s  (shape: %s)", INDEX_FILE, idx.shape)

    # ── Spot-check known districts ────────────────────────────────────────────
    log.info("\n=== SPOT-CHECK: Known Districts ===")
    spot_checks = [
        ("Mumbai", "Maharashtra", "High demand (metro population), high realizability (infra-rich)"),
        ("Dakshin Bastar Dantewada", "Chhattisgarh", "High disease burden (tribal/remote), low realizability"),
        ("Ahmedabad", "Gujarat", "High demand (large urban chronic pop), high realizability"),
        ("Malkangiri", "Odisha", "High acute disease (malaria belt), very low realizability"),
        ("Bengaluru Urban", "Karnataka", "Highest realizability, moderate-high demand"),
    ]
    check_cols = [
        "district_name", "state_name",
        "MAI_Overall", "MAI_Chronic", "MAI_Acute",
        "Demand_Overall", "Realizability_Overall",
        "quadrant_overall", "confidence_score"
    ]
    for name, state, rationale in spot_checks:
        match = idx[
            (idx["district_name"].str.contains(name, case=False, na=False)) &
            (idx["state_name"].str.contains(state, case=False, na=False))
        ]
        if len(match) > 0:
            row = match.iloc[0]
            log.info("  %s (%s): MAI_Overall=%.4f  D=%.4f  R=%.4f  quad=%s  conf=%.2f",
                     row["district_name"], row["state_name"],
                     row["MAI_Overall"], row["Demand_Overall"],
                     row["Realizability_Overall"], row["quadrant_overall"],
                     row["confidence_score"])
            log.info("    Expected: %s", rationale)
        else:
            log.warning("  %s (%s): NOT FOUND in dataset", name, state)

    # ── Print top-10 and bottom-10 for MAI_Overall ────────────────────────────
    log.info("\n=== TOP-10 Districts by MAI_Overall ===")
    top10 = idx.nlargest(10, "MAI_Overall")[check_cols]
    log.info("\n%s", top10.to_string(index=False))

    log.info("\n=== BOTTOM-10 Districts by MAI_Overall ===")
    bot10 = idx.nsmallest(10, "MAI_Overall")[check_cols]
    log.info("\n%s", bot10.to_string(index=False))


if __name__ == "__main__":
    main()
