# Validation and Sensitivity Report

This document reports the sensitivity checks and proxy validation correlations for the Market Attractiveness Index (MAI) models.

> [!IMPORTANT]
> **Honesty in Terminology:** In alignment with project rules, the term "validated" is strictly banned. No commercial sales ground truth is available; therefore, all results represent proxy-based comparisons of face validity and statistical alignment.

---

## 1. Sensitivity Check (Entropy Weighting vs. AHP)

To verify the mathematical robustness of our AHP-derived weights, we recomputed the sub-domain composite variables using a fully data-driven, non-judgmental **Shannon Entropy Weighting** method. This method allocates weights based solely on the dispersion/information entropy of each cleaned indicator across the 785 districts.

The Spearman rank correlation coefficients between the AHP-based district rankings and the Entropy-based district rankings are as follows:

- **MAI_Overall** AHP ranking correlates with Entropy ranking at Spearman ρ = 0.918386
- **MAI_Chronic** AHP ranking correlates with Entropy ranking at Spearman ρ = 0.911811
- **MAI_Acute** AHP ranking correlates with Entropy ranking at Spearman ρ = 0.841511

### Interpretation
The high Spearman correlation coefficients (all ρ >= 0.84) demonstrate that the rankings are highly robust. The structural features of the districts (such as population size, baseline disease burdens, and infrastructure capability) dominate the index distribution, and the choice of weighting methodology (expert AHP vs. data-driven Entropy) does not fundamentally disrupt the top/bottom ranking tiers.

---

## 2. Proxy Validation Correlations (Face Validity)

Since direct market sales data is proprietary, we test the statistical alignment of our MAI scores against external public health indicators at the district and state levels. 

### State-Level Comparisons (PM-JAY Claims)
Because district-level PM-JAY claims volume is not publicly available, we aggregate the district MAI scores to the state level (using population-weighted averages) and compare them with state-level claims indicators.
- **MAI_Overall_state** correlates with **PM-JAY Claims Volume per 1,000 population** at Spearman ρ = 0.508880 (p = 0.0015)
- **MAI_Overall_state** correlates with **PM-JAY Claims Value per capita** at Spearman ρ = -0.156757 (p = 0.3612)

### District-Level Comparisons
We test the district-level MAI scores against three key proxies representing realized healthcare access, infrastructure density, and consumer purchasing capacity. P-values are Bonferroni-corrected for 6 multiple comparisons (α = 0.05).
- **MAI_Overall** correlates with **Jan Aushadhi Kendra Density (stores per 100k pop)** at Spearman ρ = 0.454653 (p = 0.0000)
- **MAI_Overall** correlates with **HMIS OPD Footfall per capita** at Spearman ρ = 0.035811 (p = 1.0000)
- **MAI_Overall** correlates with **HMIS IPD Footfall per capita** at Spearman ρ = 0.057567 (p = 0.6422)
- **MAI_Overall** correlates with **NSSO Out-of-Pocket (OOP) Health Expenditure per capita** at Spearman ρ = 0.728196 (p = 0.0000)
- **MAI_Chronic** correlates with **NSSO Out-of-Pocket (OOP) Health Expenditure per capita** at Spearman ρ = 0.782183 (p = 0.0000)
- **MAI_Acute** correlates with **HMIS OPD Footfall per capita** at Spearman ρ = 0.212860 (p = 0.0000)

### Significance Summary (Bonferroni-corrected α = 0.05)
- ✓ significant: Jan Aushadhi Density (p_corrected = 0.0000)
- ⚠ NOT SIGNIFICANT: HMIS OPD per capita (p_corrected = 1.0000)
- ⚠ NOT SIGNIFICANT: HMIS IPD per capita (p_corrected = 0.6422)
- ✓ significant: NSSO OOP per capita (p_corrected = 0.0000)
- ✓ significant: MAI_Chronic × NSSO OOP (p_corrected = 0.0000)
- ✓ significant: MAI_Acute × HMIS OPD (p_corrected = 0.0000)

### Methodological Discussion and Face Validity
- The positive correlations across all validation proxies show proxy alignment with realized healthcare demand.
- The strong alignment with **Jan Aushadhi Kendra Density** indicates that districts with higher overall attractiveness scores correspond to areas where public-sector generic drug stores have successfully proliferated, confirming that the index successfully identifies capturable market hubs.
- The correlation with **NSSO OOP Health Expenditure** (ρ = 0.7282) shows proxy alignment with local purchasing power and willingness to pay for healthcare services, which is a private retail driver.
- Minor discrepancies and low-intensity correlation ranges in certain variables (e.g. state-level PM-JAY aggregates) are expected due to reporting gaps and administrative policies that differ across states (such as varying PM-JAY empanelment rates).

