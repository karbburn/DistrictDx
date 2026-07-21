# DistrictDx

## District-Level Pharmaceutical Market Attractiveness Index
### Supporting Technical Note

**Trilytics 2026 — Sun Pharmaceutical Industries × IIM Calcutta PGDBA Conclave**

---

## Executive Summary

India's pharmaceutical territory planning relies on backward-looking inputs — state aggregates, historical sales, and regional manager intuition — masking tenfold variation across districts and rewarding past allocation over future potential.

**DistrictDx replaces them with an evidence-based framework** scoring all 785 districts — built entirely from free public data, fully auditable, and reproducible by any analyst.

[Figure 1 — DistrictDx's Two-Axis Structure: Demand × Realizability]

| Dimension | Definition | Commercial Meaning |
|-----------|------------|-------------------|
| **Demand Potential** | Epidemiological, demographic, and economic capacity to generate therapy need | *"How large is the market opportunity?"* |
| **Realizability** | Healthcare infrastructure, access, and affordability to convert need into prescriptions | *"Can we actually reach this market?"* |

The index is the **geometric mean** of both axes — not a weighted sum. High demand with negligible infrastructure scores low because that demand is currently uncapturable.

The framework produces **three indices per district**: MAI_Overall (portfolio allocation), MAI_Chronic (diabetes, hypertension, cardiovascular), MAI_Acute (infections, child health), plus a Future Opportunity Index.

Constructed from **19 variables across 11+ public datasets**, the framework applies hierarchical imputation, redundancy-aware factor analysis, AHP weighting (CR < 0.1), and within-state quadrant classification. Validation uses two independent mechanisms: Spearman correlation against external proxies (NSSO OOP ρ = 0.73, Jan Aushadhi ρ = 0.45, PMJAY ρ = 0.51) and entropy-weighting sensitivity (AHP vs. data-driven, ρ ≥ 0.84).

> **Key Takeaway — DistrictDx converts fragmented public data into actionable district-level intelligence, replacing intuition with evidence at national scale.**

---

## Why DistrictDx?

[Figure 2 — Traditional Planning vs. DistrictDx]

| Dimension | Traditional Approach | DistrictDx |
|-----------|--------------------|------------|
| **Geographic resolution** | State aggregates | District scores (785 districts) |
| **Temporal orientation** | Backward-looking (past sales) | Forward-looking (current + trend) |
| **Prioritization basis** | Manager intuition | Explainable statistical framework |
| **Therapy granularity** | Uniform planning | Therapy-specific (Overall, Chronic, Acute) |
| **Weighting rationale** | Implicit or arbitrary | AHP-derived, literature-grounded, verified |
| **Data limitations** | Hidden in aggregates | Explicit confidence scores per district |
| **Reproducibility** | Tribal knowledge | Full pipeline reproducible from source |
| **Decision framework** | Single rank-order list | 2×2 quadrant → distinct commercial playbooks |

> **Key Takeaway — DistrictDx moves territory planning from intuition and aggregation to evidence and granularity.**

---

## Framework Overview

[Figure 3 — Seven-Stage Pipeline: Data → Reconciliation → Estimation → Weighting → Index → Validation → Projection]

**1. Data Foundation.** Eleven public datasets assembled — Census, NFHS-5/4, NASA VIIRS, Rural Health Statistics, PMGSY, NVBDCP/IDSP, LGD codes. All free; no proprietary input.

**2. Administrative Reconciliation.** Every district receives a canonical LGD crosswalk key. Post-2011 boundary changes reconciled via concordance analysis; inherited districts flagged, none dropped.

**3. Data Quality & Estimation.** Variables winsorized at 1st and 99th percentiles. Missing values — NFHS-5 covers 707 of 785 districts — filled via four tiers: district observation → NFHS-4 trend-adjusted → state average → national average. Each imputation flagged. Every district receives a **confidence score** (fraction of variables directly observed).

**4. Variable Weighting.** Variables grouped into four domains (Demand-Chronic, Demand-Acute, Realizability-Chronic, Realizability-Acute), min-max normalized to [0, 1], checked for pairwise redundancy (|r| > 0.8 → Factor Analysis). AHP weights derived from literature-grounded score vectors, verified for consistency (CR < 0.1).

**5. Index Construction.** Domain composites blended into Demand and Realizability axes (50/50 chronic-acute default). Final MAI is the geometric mean:

```
MAI = Demand^α × Realizability^(1-α)    (default α = 0.5)
```

Three variants: Overall, Chronic, Acute. Blend ratio adjustable by portfolio mix.

**6. Validation.** AHP weights compared against Shannon entropy weights (Spearman ρ ≥ 0.84). Index correlated against NSSO OOP, Jan Aushadhi, HMIS, and PMJAY.

**7. Future Projection.** Historical baseline reconstructed from NFHS-4 (~2015) using identical normalization and weights. Trend slopes dampened (β = 0.3, sensitivity-tested at β ∈ {0.2, 0.3, 0.4}) to produce Future MAI.

> **Key Takeaway — Every stage serves a purpose: reconciliation prevents boundary data loss, imputation respects missingness, redundancy checks prevent double-counting.**

---

## Scientific Rationale

### Why Demand × Realizability

Market attractiveness is two-dimensional. Demand without infrastructure is uncapturable; infrastructure without demand is oversupply. Either axis near-zero yields a near-zero score.

> **Commercial implication:** High diabetes prevalence with no endocrinologists, few pharmacies, and low income is not an attractive market today — regardless of patient population.

| Scenario | Demand | Realizability | Linear Sum (α=0.5) | Geometric Mean (α=0.5) | Correct Signal |
|----------|--------|---------------|-------------------|----------------------|----------------|
| Balanced market | 0.5 | 0.5 | 0.50 | 0.50 | ✓ |
| High demand, low access | 0.9 | 0.1 | 0.50 | **0.30** | ✓ — penalizes imbalance |
| Low demand, high access | 0.1 | 0.9 | 0.50 | **0.30** | ✓ — penalizes imbalance |
| Moderate both | 0.7 | 0.5 | 0.60 | 0.59 | ✓ |

This two-axis structure maps directly to resource allocation. Star markets (high demand, high realizability) are ready for sales-force deployment. Emerging markets (high demand, low realizability) need market-development investment first — two distinct playbooks, not a single rank order.

> **Key Takeaway — Two axes prevent a single high score from masking a critical weakness — exactly what a linear composite would do.**

### Why Geometric Mean Instead of Weighted Sum

A weighted sum lets one high axis compensate for a near-zero other. At Demand = 0.9 and Realizability = 0.1, a weighted sum (α = 0.5) yields 0.50 — "moderate attractiveness" where 90% of demand cannot be reached. The geometric mean yields **0.30**.

[Figure 4 — Weighted Sum vs. Geometric Mean: The Penalty of Imbalance]

| Property | Weighted Sum | Geometric Mean | Business Rationale |
|----------|-------------|----------------|--------------------|
| D=0.9, R=0.1 | 0.50 (misleading) | 0.30 (correct) | Low access drags score down |
| Formula | α·D + (1-α)·R | D^α × R^(1-α) | Non-linear penalty for imbalance |
| Sensitivity | Linear | Sub-linear | Improving the weak axis matters more |

Alpha sensitivity tested at 0.4, 0.5, 0.6. Rank correlation exceeds 0.98 across all values — ranking is robust.

> **Key Takeaway — The geometric mean requires both axes to score well, matching the commercial reality that demand without access is uncapturable.**

### Why AHP Weighting

| Approach | Why Not Used |
|----------|-------------|
| **Equal weighting** | Implies sex ratio matters as much as diabetes prevalence — overweights marginal variables |
| **Data-driven** (PCA, entropy) | Maximizes variance, not business importance. Low-variance variables get zero weight regardless of commercial relevance |
| **AHP (selected)** | Literature-grounded pairwise comparisons, consistency-verified (CR < 0.1), auditable, tested against entropy weights (ρ ≥ 0.84) |

AHP produces weights any sales manager can understand and challenge — each traces to documented comparisons, with a consistency check (CR < 0.1) that halts construction if too contradictory. The ρ ≥ 0.84 correlation with entropy weights confirms rankings are not artifacts of subjective judgment.

> **Key Takeaway — AHP balances expert judgment with mathematical rigor; entropy sensitivity (ρ ≥ 0.84) confirms weights are defensible, not arbitrary.**

### Additional Decisions

[Table — Supporting Methodology Choices]

| Decision | Problem It Addresses | Solution | Business Impact |
|----------|---------------------|----------|-----------------|
| **Confidence scores** | 78 of 785 districts lack direct NFHS-5 data | 1 − imputed fraction; low-confidence districts flagged visually | Prevents imputed districts appearing observed; enables risk-calibrated investment |
| **Hierarchical imputation** | Missingness not random — remote districts underrepresented | Four tiers: district → NFHS-4 trend-adjusted → state → national | Preserves district variation; degrades gracefully |
| **Within-state benchmarking** | National medians favor wealthy states, producing a GDP map | Each district compared to within-state median only | Reflects actual pharma deployment patterns |
| **Proxy validation** | District-level sales proprietary; calibration impossible | Rank correlation: NSSO OOP (ρ=0.73), Jan Aushadhi (ρ=0.45), PMJAY (ρ=0.51) | Face validity without overclaiming; non-significant results disclosed |
| **Explainable framework** | ML models uninterpretable; risk of overfitting to proxies | Transparent AHP with documented weights, flagged imputations, reproducible pipeline | A sales manager can understand any district's score |

> **Key Takeaway — Every methodological choice serves a purpose: transparency, defensibility, and practical utility for pharmaceutical decisions.**

---

## Validation Evidence

[Figure 5 — Validation Cascade: AHP Weights → Entropy Comparison → Proxy Correlation → Convergence]

[Figure 6 — Spearman ρ Across All Proxy Tests with Significance Indicators]

[Table 1 — Validation Summary]

| Test | Spearman ρ | p-corrected | Interpretation |
|------|-----------|-------------|----------------|
| AHP vs Entropy (Overall) | 0.918 | — | Strong rank agreement — index robust to weighting method |
| AHP vs Entropy (Chronic) | 0.912 | — | Strong rank agreement |
| AHP vs Entropy (Acute) | 0.842 | — | Good rank agreement |
| MAI × NSSO OOP/capita | 0.728 | 0.0000 | Strong — realized healthcare purchasing |
| MAI_Chronic × NSSO OOP/capita | 0.782 | 0.0000 | Strong — chronic drives out-of-pocket spending |
| MAI × Jan Aushadhi density | 0.455 | 0.0000 | Moderate — public pharmacy penetration |
| MAI_state × PMJAY vol/1k | 0.509 | 0.0015 | Moderate — state insurance utilization |
| MAI × HMIS OPD/capita | 0.036 | 1.0000 | Not significant (expected — HMIS quality) |

[Figure 7 — AHP vs. Entropy District Rankings: MAI_Overall (ρ = 0.918)]

Both mechanisms converge: the index captures real variation in healthcare market activity. The strongest signal — NSSO OOP (ρ = 0.73) — confirms higher-MAI districts exhibit higher realized healthcare purchasing, the closest available proxy for pharmaceutical consumption.

> **Key Takeaway — Entropy sensitivity and proxy correlation converge: the index captures real market variation, not artifacts of expert judgment.**

---

## Business Interpretation

### From Scores to Decisions

A numerical MAI score is necessary for ranking but insufficient for resource allocation. The quadrant classification maps directly to investment strategy:

[Figure 8 — Commercial Decision Matrix: 2×2 Quadrant Framework]

| Quadrant | Demand | Realizability | Signal | Commercial Action |
|----------|--------|---------------|--------|-------------------|
| **Star Market** | High | High | Both dimensions strong | Deploy, defend, prioritize new launches |
| **Emerging** | High | Low | Demand exists, access limits conversion | Invest in pharmacy networks and hospital partnerships before scaling sales |
| **Underserved** | Low | High | Infrastructure ahead of need | Maintain coverage, monitor for demand shifts |
| **Deprioritize** | Low | Low | Both dimensions weak | Monitor; revisit when conditions shift |

A Star in Bihar may score lower absolutely than an Emerging district in Maharashtra — but relative to its peers, it is the priority for a regional manager with a fixed budget.

### Therapy-Specific Strategy

| Index | Use Case | Example Portfolio |
|-------|----------|-------------------|
| MAI Overall | Portfolio-level territory allocation | Cross-therapy resource planning |
| MAI Chronic | Chronic franchise strategy | Diabetes, hypertension, cardiovascular |
| MAI Acute | Acute franchise strategy | Anti-infectives, pediatric, vaccines |

A district aging and urban may rank high on Chronic but low on Acute — franchise-specific scores prevent misallocation.

### Future Opportunity

The Future Index answers: *"Where is this district heading?"*

| Gain Signal | Interpretation | Commercial Implication |
|-------------|---------------|------------------------|
| High positive gain | District improving rapidly | Early investment ahead of competitors |
| High current MAI, low gain | Mature market, plateaued growth | Defend share, optimize cost |
| Negative gain | Declining attractiveness | Monitor, consider reallocation |

β = 0.3 dampens the four-year trend to 30% extrapolation. Government interventions (Swachh Bharat, Jal Jeevan) may accelerate trends; NFHS-5 methodological changes may not sustain.

> **Key Takeaway — The framework transforms statistical outputs into three concrete commercial decisions: where to deploy, where to develop, and where to wait.**

---

## Limitations & Reproducibility

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Census 2011 data is 15+ years old | Demographics may have shifted | Most comprehensive baseline until Census 2021 |
| NFHS-5 covers 707 of 785 districts | 78 rely on imputed values | Confidence scores flag every estimated district |
| Nightlights capture formal economy only | Rural subsistence undercounted | Disclosed; no superior public alternative exists |
| No ground-truth pharmaceutical sales | Cannot calibrate against actual prescriptions | Proxy validation (NSSO OOP ρ = 0.73) |
| Within-state splits obscure cross-state variation | Bihar Star < Maharashtra Emerging absolutely | Supplement with absolute scores |

### Reproducibility & Extensibility

Every output independently reproducible from source — no proprietary data, no API keys, no black-box steps. Every imputation flagged, every weight documented. The framework extends to new therapy categories without code changes; new data sources integrate via the data dictionary.

---

## Conclusion

DistrictDx provides an **explainable, reproducible, and commercially meaningful** framework for district-level pharmaceutical planning.

| What DistrictDx Is | What DistrictDx Is Not |
|--------------------|------------------------|
| Evidence-based, auditable, and transparent | A black-box algorithm |
| Validated against available proxies with disclosed limitations | A "validated" model with ground-truth calibration |
| Designed for strategic resource allocation decisions | A predictive engine for sales forecasting |
| Reproducible by any analyst from public data | Dependent on proprietary or purchased datasets |

DistrictDx answers a question historically unanswerable at scale: *"Across 785 districts, which ones deserve my sales force today — and which should I develop for tomorrow?"*

The methodology is deliberately transparent — every weight challengeable, every imputation flagged, every conclusion traceable. It is not the final word, but a significant improvement over the state aggregates, historical sales, and intuition that currently guide allocation.

> **Key Takeaway — DistrictDx makes district-level pharmaceutical intelligence auditable, reproducible, and actionable — 19 public variables into a defensible framework for 785 districts.**

---

*DistrictDx — District-Level Pharmaceutical Market Attractiveness Index · Supporting Technical Note — Trilytics 2026 · IIM Calcutta PGDBA Conclave — Sun Pharmaceutical Industries*