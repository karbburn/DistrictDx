"""
Stage 5 — Normalization, Correlation Check, and AHP Weighting
==============================================================
1. Normalizes variables within their domain groups using min-max normalization.
   - Direction-corrects variables if necessary (all variables are currently aligned positive).
2. Performs a correlation check within each domain group.
   - Combines variables correlating above 0.8 using Factor Analysis (sklearn FactorAnalysis)
     to prevent double-counting redundancy.
3. Defines AHP pairwise comparison matrices based on literature-grounded judgments,
   computes weights via the eigenvector method, and verifies consistency (CR < 0.1).
4. Outputs:
   - /data/processed/subdomain_composites.csv (composite scores per district)
   - /data/processed/ahp_weights.csv (AHP weight table and Consistency Ratios)
"""

import logging
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.decomposition import FactorAnalysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
INPUT_FILE = Path("data/processed/district_variables_clean.csv")
OUT_DIR = Path("data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

COMPOSITES_FILE = OUT_DIR / "subdomain_composites.csv"
AHP_WEIGHTS_FILE = OUT_DIR / "ahp_weights.csv"


# ── Domain Groups Definition ───────────────────────────────────────────────────

# Define the variables for each sub-domain group
DOMAINS = {
    "Demand-Chronic": [
        "census_total_population",
        "sex_ratio",
        "nfhs5_high_blood_sugar_pct",
        "nfhs5_elevated_bp_pct",
        "nfhs5_women_overweight_pct",
        "nfhs5_women_tobacco_pct",
        "nfhs5_men_tobacco_pct",
        "nfhs5_women_alcohol_pct",
        "nfhs5_men_alcohol_pct"
    ],
    "Demand-Acute": [
        "census_total_population",
        "sex_ratio",
        "nfhs5_child_diarrhoea_pct",
        "nfhs5_child_ari_pct",
        "nfhs5_child_underweight_pct"
    ],
    "Realizability-Chronic": [
        "nightlight_log_mean",
        "nightlight_growth_rate",
        "literacy_rate"
    ],
    "Realizability-Acute": [
        "latrine_access_rate",
        "tap_water_rate",
        "nfhs5_improved_sanitation_pct",
        "nfhs5_improved_water_pct"
    ]
}


# ── AHP Pairwise Judgment Vectors ──────────────────────────────────────────────

# Literature-grounded judgment scores (approximate weights vector for ratio scale construction)
# 1. Demand-Chronic:
#    Disease burdens (sugar, bp) are the most critical direct drivers of chronic pharma sales (score: 3.0).
#    Population is the scale factor (score: 2.0).
#    Obesity/overweight is a chronic pre-indicator (score: 1.5).
#    Tobacco/alcohol use represent behavioral habits and risk profiles (scores: 0.8 - 1.0 for men, 0.4 - 0.6 for women due to lower prevalence).
#    Sex ratio is a demographic modifier for gender-skewed reporting (score: 0.2).
CHRONIC_DEMAND_SCORES = np.array([2.0, 0.2, 3.0, 3.0, 1.5, 0.8, 1.0, 0.4, 0.6])

# 2. Demand-Acute:
#    Acute disease burdens (diarrhoea, ari) are the primary drivers of acute pharma demand (score: 3.0).
#    Malnutrition/underweight is a risk factor (score: 2.0).
#    Population is scale (score: 1.5).
#    Sex ratio is a baseline demographic control (score: 0.3).
ACUTE_DEMAND_SCORES = np.array([1.5, 0.3, 3.0, 3.0, 2.0])

# 3. Realizability-Chronic:
#    Mean nightlights represent local affordability/wealth, which is key for buying chronic drugs (score: 3.0).
#    Nightlights growth rate represents economic growth trends (score: 2.0).
#    Literacy rate represents health literacy and treatment adherence capability (score: 1.0).
CHRONIC_REAL_SCORES = np.array([3.0, 2.0, 1.0])

# 4. Realizability-Acute:
#    Improved water and tap water are critical to prevent acute waterborne disease transmission (score: 3.0, 2.5).
#    Improved sanitation and latrines prevent vector/fecal-oral disease vectors (score: 2.0, 1.5).
ACUTE_REAL_SCORES = np.array([1.5, 2.5, 2.0, 3.0])

SCORE_VECTORS = {
    "Demand-Chronic": CHRONIC_DEMAND_SCORES,
    "Demand-Acute": ACUTE_DEMAND_SCORES,
    "Realizability-Chronic": CHRONIC_REAL_SCORES,
    "Realizability-Acute": ACUTE_REAL_SCORES
}

# Saaty's Random Index (RI) table for AHP Consistency Ratio verification
RI_TABLE = {
    1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12,
    6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
}

# Standard AHP Scale: {1, 2, 3, 4, 5, 6, 7, 8, 9} and reciprocals
AHP_SCALES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

def to_ahp_scale(val: float) -> float:
    """Clips and rounds ratio values to standard AHP scale values or reciprocals."""
    if np.isinf(val) or np.isnan(val):
        raise ValueError(f"Invalid AHP ratio: {val}. Check score vectors for zero values.")
    if val >= 1.0:
        return float(min(AHP_SCALES, key=lambda x: abs(x - val)))
    else:
        recip_val = 1.0 / val
        closest_recip = min(AHP_SCALES, key=lambda x: abs(x - recip_val))
        return 1.0 / float(closest_recip)


def compute_ahp_weights(scores: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Constructs an AHP pairwise comparison matrix from score ratios,
    rounds to Saaty's 1-9 scale, computes eigenvectors, and returns
    (weights, consistency_ratio).
    """
    n = len(scores)
    A = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            A[i, j] = to_ahp_scale(scores[i] / scores[j])
            
    # Eigenvalue decomposition
    eigenvalues, eigenvectors = np.linalg.eig(A)
    max_idx = np.argmax(np.real(eigenvalues))
    lambda_max = np.real(eigenvalues[max_idx])
    
    # Extract weights corresponding to principal eigenvalue
    w = np.real(eigenvectors[:, max_idx])
    if np.any(w < 0):
        log.warning("Negative weight component detected in domain — using absolute values and renormalizing")
        w = np.abs(w)
    w = w / np.sum(w)  # Normalize
    
    # Calculate Consistency Index (CI) and Consistency Ratio (CR)
    ci = (lambda_max - n) / (n - 1) if n > 1 else 0.0
    ri = RI_TABLE.get(n, 1.49)
    cr = ci / ri if ri > 0.0 else 0.0
    
    return w, cr


# ── Normalization and Inversion Helper ─────────────────────────────────────────

def min_max_normalize(s: pd.Series) -> pd.Series:
    """Standard Min-Max Normalization to [0, 1]."""
    denom = s.max() - s.min()
    if denom == 0:
        return pd.Series(0.0, index=s.index)
    return (s - s.min()) / denom


# ── Main Stage 5 Orchestrator ──────────────────────────────────────────────────

def main():
    log.info("Loading cleaned district variables …")
    df = pd.read_csv(INPUT_FILE)
    log.info("  Input shape: %s", df.shape)

    # Validate all expected columns exist in input
    all_domain_cols = [col for cols in DOMAINS.values() for col in cols]
    missing = [c for c in all_domain_cols if c not in df.columns]
    if missing:
        log.error("Columns expected by DOMAINS but missing from input: %s", missing)
        raise SystemExit(f"Missing columns: {missing}")

    # Dictionary to hold the final processed variables for composite score computation
    processed_variables = {}
    
    # Keep LGD keys and confidence_score
    composite_df = df[["lgd_state_code", "lgd_district_code", "district_name",
                       "state_name", "confidence_score"]].copy()

    # List of all final variable weights for output
    weights_records = []

    # 1. Normalization and Direction Correction
    # Note: Direction correction check.
    # In our cleaned variables:
    # - latrine_access_rate, tap_water_rate, nfhs5_improved_sanitation_pct, nfhs5_improved_water_pct are POSITIVE (higher is better access/realizability).
    # - nightlight_log_mean, nightlight_growth_rate, literacy_rate are POSITIVE.
    # - nfhs5_high_blood_sugar_pct, nfhs5_elevated_bp_pct, etc. represent DISEASE PREVALENCE.
    #   In a pharmaceutical attractiveness index, HIGHER disease prevalence represents HIGHER demand (more attractive market).
    #   Therefore, no variable in the current cleaned dataset is "bad" (i.e. representing lower attractiveness for higher values),
    #   and no variables require inversion. We document this explicit positive alignment here.
    
    log.info("Normalizing variables within domain groups …")
    normalized_data = {}
    for domain_name, cols in DOMAINS.items():
        for col in cols:
            normalized_data[col] = min_max_normalize(df[col])

    # 2. Correlation Checks and Redundancy Treatment
    log.info("Running within-domain redundancy check (threshold = 0.8) …")
    
    domain_retained_cols = {}
    
    for domain_name, cols in DOMAINS.items():
        log.info("  Domain: %s", domain_name)
                    
        # Apply Factor Analysis if redundancies are found
        retained_cols = list(cols)
        changed = True
        while changed:
            changed = False
            domain_df = pd.DataFrame({col: normalized_data[col] for col in retained_cols})
            corr_matrix = domain_df.corr()
            for i in range(len(retained_cols)):
                for j in range(i + 1, len(retained_cols)):
                    if abs(corr_matrix.iloc[i, j]) > 0.8:
                        col1, col2 = retained_cols[i], retained_cols[j]
                        log.warning("    Redundancy found! %s & %s correlate at %.4f",
                                    col1, col2, corr_matrix.iloc[i, j])
                        log.info("    Combining %s and %s via Factor Analysis ...", col1, col2)
                        fa = FactorAnalysis(n_components=1, random_state=42)
                        combined_scores = fa.fit_transform(domain_df[[col1, col2]])[:, 0]
                        # Ensure combined score is positively correlated with originals
                        corr_with_col1 = np.corrcoef(combined_scores, domain_df[col1].values)[0, 1]
                        if corr_with_col1 < 0:
                            combined_scores = -combined_scores
                        # Normalize combined score to [0, 1]
                        combined_name = f"fa_combined_{col1}_and_{col2}"
                        normalized_data[combined_name] = min_max_normalize(
                            pd.Series(combined_scores, index=df.index))
                        retained_cols.remove(col1)
                        retained_cols.remove(col2)
                        retained_cols.append(combined_name)
                        changed = True
                        break
                if changed:
                    break
        if len(retained_cols) == len(cols):
            log.info("    No redundancies found above 0.8.")
            
        domain_retained_cols[domain_name] = retained_cols

    # 3. AHP Weight Assignment and Consistency Checks
    log.info("Building AHP pairwise comparison matrices and computing weights …")
    
    # Validate score vector lengths match DOMAINS
    for domain_name, scores in SCORE_VECTORS.items():
        expected = len(DOMAINS[domain_name])
        actual = len(scores)
        assert actual == expected, (
            f"Score vector length mismatch for {domain_name}: "
            f"expected {expected} (from DOMAINS), got {actual} (from score vector)"
        )
    
    for domain_name, cols in DOMAINS.items():
        original_scores = SCORE_VECTORS[domain_name]
        
        # If any variables were combined/retained, adjust the scores vector
        retained_cols = domain_retained_cols[domain_name]
        
        if len(retained_cols) != len(cols):
            # Dynamic adjustment of scores if factor analysis combined variables
            log.info("    Adjusting AHP score vector dynamically for combined variables in %s...", domain_name)
            adjusted_scores = []
            for col in retained_cols:
                if col.startswith("fa_combined_"):
                    # Use mean score of the combined variables
                    parts = col.replace("fa_combined_", "").split("_and_")
                    idx1 = cols.index(parts[0])
                    idx2 = cols.index(parts[1])
                    adjusted_scores.append((original_scores[idx1] + original_scores[idx2]) / 2.0)
                else:
                    idx = cols.index(col)
                    adjusted_scores.append(original_scores[idx])
            scores_to_use = np.array(adjusted_scores)
        else:
            scores_to_use = original_scores
            
        # Compute weights via Eigenvector Method
        weights, cr = compute_ahp_weights(scores_to_use)
        
        log.info("  %s Consistency Ratio (CR) = %.4f", domain_name, cr)
        if cr >= 0.1:
            log.error("HALT: Consistency Ratio (CR) = %.4f for %s >= 0.1 threshold.", cr, domain_name)
            log.error("Per project rules, AHP judgments with CR >= 0.1 require manual review.")
            log.error("Review the pairwise comparison matrix and adjust judgments before re-running.")
            raise SystemExit(f"AHP Consistency Ratio {cr:.4f} for {domain_name} exceeds 0.1 threshold. "
                             f"Manual review of pairwise judgments required.")
            
        # Record weights
        for col_name, weight in zip(retained_cols, weights):
            weights_records.append({
                "domain_group": domain_name,
                "variable": col_name,
                "ahp_weight": weight,
                "consistency_ratio": cr
            })
            
        # Calculate sub-domain composite score: weighted average of retained normalized variables
        weighted_sum = pd.Series(0.0, index=df.index)
        for col_name, weight in zip(retained_cols, weights):
            weighted_sum += normalized_data[col_name] * weight
            
        # Save composite score
        clean_name = domain_name.lower().replace("-", "_")
        composite_df[f"{clean_name}_composite"] = weighted_sum

    # Save weights table to ahp_weights.csv
    weights_df = pd.DataFrame(weights_records)
    weights_df.to_csv(AHP_WEIGHTS_FILE, index=False)
    log.info("Saved AHP weights to → %s", AHP_WEIGHTS_FILE)

    # Save sub-domain composite scores per district
    composite_df.to_csv(COMPOSITES_FILE, index=False)
    log.info("Saved subdomain composites to → %s  (shape: %s)", COMPOSITES_FILE, composite_df.shape)
    
    # Print sample composites
    log.info("\n=== SUB-DOMAIN COMPOSITES PREVIEW (Top 5) ===")
    log.info(composite_df.head(5).to_string())

if __name__ == "__main__":
    main()

