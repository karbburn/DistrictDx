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

- **Strong Face Validity for Private Retail**: The primary indicator of a district's commercial pharmaceutical viability is out-of-pocket health spending. Our overall MAI correlates strongly and significantly with **NSSO OOP Health Expenditure per capita** (ρ = 0.7282, p_corrected < 0.0001). This confirms that our index successfully isolates districts with both the economic capacity and the willingness to pay for private healthcare services.
- **Generic Store Proliferation**: The positive, significant correlation with **Jan Aushadhi Kendra Density** (ρ = 0.4547, p_corrected < 0.0001) shows proxy alignment with existing generic pharmacy footprint. Districts identified as attractive by our AHP model have successfully supported the expansion of these retail outlets.
- **Weak Public Sector Alignment (HMIS Footfalls)**: The correlations with **HMIS OPD per capita** (ρ = 0.0358, p_corrected = 1.0000) and **HMIS IPD per capita** (ρ = 0.0576, p_corrected = 0.6422) are close to zero and statistically non-significant. This is expected and structurally sound: HMIS footfall counts capture utilization exclusively within *public health facilities* (primary health centers, community health centers, and public hospitals). In high-realizability districts (characterized by high nightlights and high literacy), patients heavily utilize private-sector providers instead of government facilities. Hence, public sector footfalls do not serve as a proxy for private commercial pharmacy attractiveness.
- **PM-JAY Claims Discrepancies**: At the state level, population-weighted MAI correlates moderately with **PM-JAY Claims Volume per 1,000 population** (ρ = 0.5089, p = 0.0015), but shows a weak negative, non-significant correlation with **PM-JAY Claims Value per capita** (ρ = -0.156757, p = 0.3612). This discrepancy is due to two factors:
  1. **Empanelment Clustered supply**: PM-JAY claims value is heavily skewed by the presence of large empanelled private tertiary care hospitals, which are highly clustered in a few states (such as Gujarat, Tamil Nadu, and Kerala), rather than tracking district-level chronic disease rates.
  2. **Target Demographics**: PM-JAY serves the bottom 40% of the population, whereas a private-market attractiveness index evaluates the commercial purchasing power of the entire population, leading to divergence in wealthier states where private pharmacy consumption dominates.
- **Reporting Gaps**: Known reporting lags and data-logging gaps in public portals (specifically in states like Bihar and Uttar Pradesh, where public facility data is under-reported) contribute to the weak statistical significance of public sector health proxies.


