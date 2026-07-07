# DistrictDx — Index Building Process

A comprehensive technical walkthrough of how DistrictDx computes the Pharmaceutical Market Attractiveness Index (MAI) for all 785 districts of India.

---

## 1. What DistrictDx Measures

DistrictDx produces a **Market Attractiveness Index (MAI)** that quantifies how attractive a district is for pharmaceutical market entry or expansion. The index combines two axes:

- **Demand** — How much disease burden and population health need exists in the district
- **Realizability** — How capable the district's infrastructure and economic conditions are of converting that need into actual pharmaceutical consumption

The output is **6 indices per district**:

| Index | What It Measures |
|-------|-----------------|
| MAI Overall (Current) | Combined demand + realizability today |
| MAI Chronic (Current) | Chronic therapy market attractiveness today |
| MAI Acute (Current) | Acute therapy market attractiveness today |
| MAI Overall (Future) | Projected overall attractiveness (trend-extrapolated) |
| MAI Chronic (Future) | Projected chronic therapy attractiveness |
| MAI Acute (Future) | Projected acute therapy attractiveness |

Each district is classified into one of **4 quadrants** based on its Demand and Realizability scores:

| Quadrant | High Demand | High Realizability | Business Playbook |
|----------|-------------|-------------------|-------------------|
| **Star** | Yes | Yes | Deploy sales force, defend share |
| **Emerging** | Yes | No | Market development — invest in access first |
| **Underserved** | No | Yes | Maintenance/efficiency mode |
| **Deprioritize** | No | No | Monitor only |

---

## 2. Data Foundation — District Master

**Script:** `pipeline/02_reconcile/build_district_master.py`

The district master is the canonical crosswalk that maps every district across all data sources. It uses **Local Government Directory (LGD)** codes as the primary key.

**785 districts** are registered, each with:

| Column | Description |
|--------|-------------|
| `lgd_state_code` | LGD state identifier |
| `lgd_district_code` | LGD district identifier (string type — prevents leading-zero loss) |
| `district_name` | District name from LGD |
| `state_name` | State name from LGD |
| `census_2011_district_code` | Parent Census 2011 code (null if no mapping) |
| `notes` | Boundary-inheritance annotations |

### Boundary-Inheritance Logic

Post-2011 districts (carved, split, formed from older districts) are flagged as `boundary_inherited` when:
1. Census 2011 code is 0 in the raw LGD list
2. District code not found in the raw LGD list (new district post-2011)
3. Concordance comment contains: "split", "created", "carved", "formed", or "separated"

---

## 3. Data Cleaning & Imputation

**Script:** `pipeline/03_clean/clean_and_impute.py`

### 3.1 The 19 Variables

All variables used in the index, their sources, and derivations:

#### Demographics (Census 2011)

| Variable | Formula | Notes |
|----------|---------|-------|
| `census_total_population` | Direct from Census | Static decennial data |
| `literacy_rate` | `(census_literates / census_total_population) × 100` | |
| `sex_ratio` | `(census_total_female / census_total_male) × 1000` | |

#### WASH — Water, Sanitation & Hygiene

| Variable | Source | Notes |
|----------|--------|-------|
| `latrine_access_rate` | `(hh_with_latrine / hlpca_total_hh) × 100` | Census 2011 HLPCA |
| `tap_water_rate` | `(hh_tap_water / hlpca_total_hh) × 100` | Census 2011 HLPCA |
| `nfhs5_improved_sanitation_pct` | NFHS-5 direct | Community-level |
| `nfhs5_improved_water_pct` | NFHS-5 direct | Community-level |

#### Chronic Disease Indicators (NFHS-5)

| Variable | NFHS-5 Indicator |
|----------|-----------------|
| `nfhs5_high_blood_sugar_pct` | "Blood sugar level - high or very high" |
| `nfhs5_elevated_bp_pct` | "Elevated blood pressure" |
| `nfhs5_women_overweight_pct` | "Women who are overweight or obese" |
| `nfhs5_women_tobacco_pct` | "Women who use any kind of tobacco" |
| `nfhs5_men_tobacco_pct` | "Men who use any kind of tobacco" |
| `nfhs5_women_alcohol_pct` | "Women who consume alcohol" |
| `nfhs5_men_alcohol_pct` | "Men who consume alcohol" |

#### Acute / Child Health Indicators (NFHS-5)

| Variable | NFHS-5 Indicator |
|----------|-----------------|
| `nfhs5_child_diarrhoea_pct` | "Prevalence of diarrhoea in the 2 weeks" |
| `nfhs5_child_ari_pct` | "Prevalence of symptoms of acute respiratory infection" |
| `nfhs5_child_underweight_pct` | "Children under 5 years who are underweight" |

#### Economic Proxy (NASA VIIRS Nightlights)

| Variable | Formula | Notes |
|----------|---------|-------|
| `nightlight_log_mean` | `log1p(mean of latest available year)` | Formal-sector economic activity proxy |
| `nightlight_growth_rate` | OLS slope of `log1p_mean ~ year` (≥3 data points required) | Growth trajectory |

### 3.2 Winsorization

Before imputation, all 19 variables are winsorized at the **1st and 99th percentiles**. This caps extreme outliers to prevent them from dominating the normalization step. A second pass of winsorization is applied after imputation to clean up trend-adjusted outliers.

### 3.3 Imputation Hierarchy

Missing values are filled using a tiered approach. The hierarchy differs by variable source:

#### For NFHS-5 Sourced Variables (12 variables)

```
Tier 1: District-direct value (already present)
    ↓ if missing
Tier 2: NFHS-4 trend-adjusted estimate
    formula: nfhs4_value + (state_avg_nfhs5 - state_avg_nfhs4)
    falls back to national delta if state delta is NaN
    ↓ if missing
Tier 3: State average of that variable
    ↓ if missing
Tier 4: National average of that variable
```

**NFHS-4 trend adjustment** bridges the ~4-year gap between NFHS-4 (~2015-16) and NFHS-5 (~2019-21). The delta captures both temporal change and medication inclusion differences (accepting ~5-15% inflation).

NFHS-4 to NFHS-5 variable mapping:

| NFHS-5 Variable | NFHS-4 Counterpart |
|-----------------|-------------------|
| `nfhs5_high_blood_sugar_pct` | `nfhs4_sugar` (indicator 81) |
| `nfhs5_elevated_bp_pct` | `nfhs4_bp` = max(bp_85, bp_86, bp_87) |
| `nfhs5_women_overweight_pct` | `nfhs4_overweight` (indicator 74) |
| `nfhs5_child_diarrhoea_pct` | `nfhs4_diarrhoea` (indicator 52) |
| `nfhs5_child_ari_pct` | `nfhs4_ari` (indicator 60) |
| `nfhs5_improved_sanitation_pct` | `nfhs4_sanitation` (indicator 8) |
| `nfhs5_improved_water_pct` | `nfhs4_water` (indicator 7) |
| `nfhs5_child_underweight_pct` | `nfhs4_underweight` (indicator 71) |

#### For Non-NFHS-5 Variables (Census, tobacco, alcohol, nightlights)

```
Tier 1: District-direct value
    ↓ if missing
Tier 2: State average
    ↓ if missing
Tier 3: National average
```

### 3.4 Imputation Flags

For every variable, boolean flags are created:
- `{var}__imputed_state_avg` — imputed via state average
- `{var}__imputed_national_avg` — imputed via national average
- `{var}__imputed_nfhs4_trend_adjusted` — imputed via NFHS-4 trend (NFHS-5 vars only)

### 3.5 Confidence Score

Each district receives a confidence score reflecting data completeness:

```
confidence_score = 1.0 - (number of imputed variables / 19)
```

- A district with all 19 variables observed directly → score = **1.0**
- A district with all 19 imputed → score = **0.0**
- The score is carried through every downstream computation

**Post-imputation assertion:** Zero nulls in all 19 variable columns.

---

## 4. Subdomain Composites

**Script:** `pipeline/04_construct/build_subdomain_composites.py`

### 4.1 Domain Groups

The 19 variables are organized into 4 domain groups:

#### Demand — Chronic (9 variables)
```
census_total_population, sex_ratio,
nfhs5_high_blood_sugar_pct, nfhs5_elevated_bp_pct,
nfhs5_women_overweight_pct, nfhs5_women_tobacco_pct,
nfhs5_men_tobacco_pct, nfhs5_women_alcohol_pct,
nfhs5_men_alcohol_pct
```

#### Demand — Acute (5 variables)
```
census_total_population, sex_ratio,
nfhs5_child_diarrhoea_pct, nfhs5_child_ari_pct,
nfhs5_child_underweight_pct
```

#### Realizability — Chronic (3 variables)
```
nightlight_log_mean, nightlight_growth_rate,
literacy_rate
```

#### Realizability — Acute (4 variables)
```
latrine_access_rate, tap_water_rate,
nfhs5_improved_sanitation_pct, nfhs5_improved_water_pct
```

Note: `census_total_population` and `sex_ratio` appear in **both** Demand domains.

### 4.2 Min-Max Normalization

All variables are normalized to [0, 1] within each domain:

```
x_norm = (x - min(x)) / (max(x) - min(x))
```

If max == min, the normalized value is 0.0.

**Direction correction:** Not required — all variables are positively aligned (higher value = higher attractiveness for pharma market).

### 4.3 Redundancy Check (Correlation Threshold)

Within each domain, pairwise **Pearson correlation** is computed. If any pair exceeds **|r| > 0.8**:

1. The two variables are combined via **Factor Analysis**: `sklearn.decomposition.FactorAnalysis(n_components=1)`
2. The combined score is sign-corrected to be positively correlated with the first original variable
3. The combined score is re-normalized to [0, 1]
4. Named `fa_combined_{col1}_and_{col2}`
5. The loop repeats until no pair exceeds 0.8

### 4.4 AHP Weight Construction

**Analytic Hierarchy Process (AHP)** is used to derive weights based on expert judgment encoded as score vectors.

#### Score Vectors

| Domain | Variable | Score |
|--------|----------|-------|
| **Demand-Chronic** | census_total_population | 2.0 |
| | sex_ratio | 0.2 |
| | nfhs5_high_blood_sugar_pct | 3.0 |
| | nfhs5_elevated_bp_pct | 3.0 |
| | nfhs5_women_overweight_pct | 1.5 |
| | nfhs5_women_tobacco_pct | 0.8 |
| | nfhs5_men_tobacco_pct | 1.0 |
| | nfhs5_women_alcohol_pct | 0.4 |
| | nfhs5_men_alcohol_pct | 0.6 |
| **Demand-Acute** | census_total_population | 1.5 |
| | sex_ratio | 0.3 |
| | nfhs5_child_diarrhoea_pct | 3.0 |
| | nfhs5_child_ari_pct | 3.0 |
| | nfhs5_child_underweight_pct | 2.0 |
| **Realizability-Chronic** | nightlight_log_mean | 3.0 |
| | nightlight_growth_rate | 2.0 |
| | literacy_rate | 1.0 |
| **Realizability-Acute** | latrine_access_rate | 1.5 |
| | tap_water_rate | 2.5 |
| | nfhs5_improved_sanitation_pct | 2.0 |
| | nfhs5_improved_water_pct | 3.0 |

#### Pairwise Comparison Matrix

The score vectors are converted to a pairwise comparison matrix using Saaty's 1-9 scale:

```
A[i,j] = to_ahp_scale(scores[i] / scores[j])
```

where `to_ahp_scale` clips to the nearest integer in {1, 2, 3, 4, 5, 6, 7, 8, 9} or its reciprocal.

#### Eigenvector Extraction

```
eigenvalues, eigenvectors = np.linalg.eig(A)
lambda_max = max(real(eigenvalues))
w = real(eigenvectors[:, argmax(eigenvalues)])
if any w < 0: w = abs(w)
w = w / sum(w)   # normalize to sum to 1
```

#### Consistency Check

```
Consistency Index:  CI = (lambda_max - n) / (n - 1)
Random Index (RI):  Lookup table based on matrix size n
Consistency Ratio:  CR = CI / RI
```

**Saaty's Random Index (RI):**

| n | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| RI | 0.0 | 0.0 | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 | 1.49 |

**Threshold:** CR < 0.1. If CR >= 0.1, the pipeline **halts** — the pairwise comparisons are too inconsistent to produce reliable weights.

If Factor Analysis combined variables, the combined variable's score is the **mean** of the two original scores.

### 4.5 Subdomain Composite Score

For each domain, the composite is a **weighted sum**:

```
composite_k = Σ (x_norm_i × ahp_weight_i)   for all i in domain k
```

This produces 4 composites per district:
- `demand_chronic_composite`
- `demand_acute_composite`
- `realizability_chronic_composite`
- `realizability_acute_composite`

---

## 5. Index Construction

**Script:** `pipeline/05_index/build_index.py`

### 5.1 Axis Scores

The 4 subdomain composites are blended into 2 axis scores using a **50/50 chronic/acute blend**:

```
Demand_Overall        = 0.5 × demand_chronic_composite + 0.5 × demand_acute_composite
Realizability_Overall = 0.5 × realizability_chronic_composite + 0.5 × realizability_acute_composite
```

The individual therapy axes are used directly:
- `Demand_Chronic` = `demand_chronic_composite`
- `Demand_Acute` = `demand_acute_composite`
- `Realizability_Chronic` = `realizability_chronic_composite`
- `Realizability_Acute` = `realizability_acute_composite`

### 5.2 Geometric Mean MAI

The Market Attractiveness Index uses the **geometric mean** (not a weighted sum):

```
MAI = Demand^α × Realizability^(1 - α)
```

with a floor of `ε = 1e-10` to prevent `log(0)`:

```
d = max(Demand, 1e-10)
r = max(Realizability, 1e-10)
MAI = d^α × r^(1 - α)
```

At the default **α = 0.5**:

```
MAI = √(Demand × Realizability)
```

Three MAI variants are computed:
- `MAI_Overall` = geometric mean of Demand_Overall and Realizability_Overall
- `MAI_Chronic` = geometric mean of Demand_Chronic and Realizability_Chronic
- `MAI_Acute` = geometric mean of Demand_Acute and Realizability_Acute

**Why geometric mean?** Unlike a weighted sum, the geometric mean penalizes imbalance. A district with high demand but zero realizability (or vice versa) gets a low MAI — which is the correct business signal. You can't sell drugs where you can't reach patients.

### 5.3 Quadrant Classification

Districts are classified into a 2×2 grid using **within-state median splits** (not national medians):

```
For each state:
  demand_median = median(Demand)  within that state
  real_median   = median(Realizability)  within that state

  High Demand = Demand >= demand_median
  High Real   = Realizability >= real_median

  High/High  → "Star"
  High/Low   → "Emerging"
  Low/High   → "Underserved"
  Low/Low    → "Deprioritize"
```

**Why within-state?** National medians would lump together Kerala (high baseline) and Bihar (low baseline). Within-state splits ensure each district is compared to peers in the same state context.

Three quadrant columns are produced: `quadrant_overall`, `quadrant_chronic`, `quadrant_acute`.

### 5.4 Alpha Sensitivity Analysis

The pipeline tests how sensitive rankings are to the Demand/Realizability weight (α):

| α Value | Interpretation |
|---------|---------------|
| 0.4 | Realizability-weighted (infrastructure matters more) |
| 0.5 | Equal weight (default) |
| 0.6 | Demand-weighted (disease burden matters more) |

For each α, the pipeline reports:
- **Top-20 overlap** — how many of the top-20 districts at α=0.5 remain in the top-20
- **Bottom-20 overlap** — same for the bottom-20
- **Spearman rank correlation** — overall rank correlation vs the baseline (α=0.5)

---

## 6. Validation

**Script:** `pipeline/06_validate/validate_proxies.py`

### 6.1 Entropy-Weighted Sensitivity Check

As an alternative to AHP (expert-driven), **Shannon Entropy** produces data-driven weights. The comparison tests whether the AHP weights produce materially different rankings.

**Entropy weighting formula:**

```
1. p_ij = x_ij / Σ_i(x_ij)                    (proportion of district i in variable j)
2. k    = 1 / ln(n)                             (n = 785 districts)
3. e_j  = -k × Σ_i( p_ij × ln(p_ij + 1e-12) )  (entropy of variable j)
4. d_j  = 1 - e_j                               (degree of diversification)
5. w_j  = d_j / Σ(d_j)                          (entropy weight)
```

If `Σ(d_j) == 0`, weights default to uniform `1/len(variables)`.

Entropy composites use the same weighted-sum formula as AHP but with entropy-derived weights. The resulting MAI rankings are compared via **Spearman rank correlation**.

### 6.2 Proxy Validation Against External Datasets

The MAI is validated against 4 external datasets as a face-validity check:

| Proxy | Level | What It Measures |
|-------|-------|-----------------|
| PMJAY Claims | State | Government health insurance utilization |
| Jan Aushadhi Kendra | District | Generic pharmacy availability |
| HMIS Footfall | District | Hospital patient volume |
| NSSO OOP Expenditure | District | Out-of-pocket health spending |

**Density normalization:**

```
jan_aushadhi_density = jan_aushadhi_count / (population / 100,000)
hmis_opd_per_capita  = hmis_opd_footfall / population
hmis_ipd_per_capita  = hmis_ipd_footfall / population
pmjay_volume_per_1k  = pmjay_claims_volume / (state_pop / 1,000)
pmjay_value_per_capita = pmjay_claims_value / state_pop
```

**Correlation tests (Spearman rho):**

| Test | Method |
|------|--------|
| MAI_Overall × Jan Aushadhi density | District-level Spearman |
| MAI_Overall × HMIS OPD/capita | District-level Spearman |
| MAI_Overall × HMIS IPD/capita | District-level Spearman |
| MAI_Overall × NSSO OOP/capita | District-level Spearman |
| MAI_Chronic × NSSO OOP/capita | District-level Spearman |
| MAI_Acute × HMIS OPD/capita | District-level Spearman |
| MAI_state × PMJAY volume/1k | State-level Spearman |
| MAI_state × PMJAY value/capita | State-level Spearman |

**Bonferroni correction:** `p_corrected = min(p × 6, 1.0)` for the 6 district-level tests.

### 6.3 Actual Validation Results

| Test | Spearman rho | p_corrected | Interpretation |
|------|-------------|-------------|----------------|
| Entropy vs AHP (Overall) | 0.918 | — | Strong agreement |
| Entropy vs AHP (Chronic) | 0.912 | — | Strong agreement |
| Entropy vs AHP (Acute) | 0.842 | — | Good agreement |
| MAI_Overall × Jan Aushadhi density | 0.455 | 0.0000 | Moderate positive — expected |
| MAI_Overall × HMIS OPD/capita | 0.036 | 1.0000 | Not significant |
| MAI_Overall × HMIS IPD/capita | 0.058 | 0.6422 | Not significant |
| MAI_Overall × NSSO OOP/capita | 0.728 | 0.0000 | Strong positive — validates demand |
| MAI_Chronic × NSSO OOP/capita | 0.782 | 0.0000 | Strong — chronic drives OOP |
| MAI_Acute × HMIS OPD/capita | 0.213 | 0.0000 | Weak positive |
| PMJAY vol/1k × MAI_state | 0.509 | 0.0015 | Moderate — state-level validation |
| PMJAY val/capita × MAI_state | -0.157 | 0.3612 | Not significant |

**Key insight:** The NSSO out-of-pocket expenditure correlation (0.728) is the strongest validator — districts with higher MAI indeed have higher health spending, confirming the index captures real market demand.

---

## 7. Future Opportunity Index

**Script:** `pipeline/07_future/build_future_index.py`

The Future Index extrapolates current MAI forward using historical trends.

### 7.1 Historical Reconstruction

A historical baseline is built from ~2015 data:

- **NFHS-4 indicators** (2015-16 survey) for health variables
- **VIIRS 2015 nightlight values** for economic proxy
- **Census 2011 demographics** carried forward (no alternative)

Variables without NFHS-4 counterparts (tobacco, alcohol, literacy, nightlight_growth_rate) carry forward their current values (delta = 0).

The historical data undergoes the same cleaning pipeline:
1. Hierarchical imputation (district → state → national)
2. Winsorization at 1st/99th percentile
3. **Normalization using CURRENT variable bounds** (not historical) to ensure a consistent scale
4. Historical subdomain composites using the **same AHP weights**
5. Historical axis scores (same 50/50 blend)
6. Historical MAI: geometric mean with α=0.5

### 7.2 Trend Slope

```
TrendSlope_MAI = (Current_MAI - Historical_MAI) / TIME_DELTA
```

where `TIME_DELTA = 4.0` years (gap between NFHS-4 ~2015-16 and NFHS-5 ~2019-21).

The same formula applies to all axes:
```
slope_demand_overall     = (Demand_Overall     - Demand_Overall_Hist)     / 4.0
slope_real_overall       = (Realizability_Overall - Real_Overall_Hist) / 4.0
slope_demand_chronic     = (Demand_Chronic     - Demand_Chronic_Hist)     / 4.0
slope_real_chronic       = (Realizability_Chronic - Real_Chronic_Hist) / 4.0
slope_demand_acute       = (Demand_Acute       - Demand_Acute_Hist)       / 4.0
slope_real_acute         = (Realizability_Acute - Real_Acute_Hist)     / 4.0
```

### 7.3 Future MAI

```
Future_MAI = Current_MAI + β × TrendSlope_MAI
```

Default **β = 0.3** — a conservative dampening factor. The full trend is not extrapolated because:
1. Government interventions (e.g., Swachh Bharat, Jal Jeevan) may accelerate WASH improvements
2. NFHS-5 includes medicated individuals, inflating chronic disease rates relative to NFHS-4
3. A 30% trend capture is a realistic "business as usual" projection

### 7.4 Beta Sensitivity

| β Value | Interpretation |
|---------|---------------|
| 0.2 | Conservative — only 20% of trend materializes |
| 0.3 | Base case — moderate projection |
| 0.4 | Optimistic — 40% of trend materializes |

For each β, the pipeline reports top-20 overlap with the current MAI top-20.

### 7.5 Future Quadrant Reassignment

The same within-state median split is applied to future axis scores, producing:
- `quadrant_overall_future`
- `quadrant_chronic_future`
- `quadrant_acute_future`

### 7.6 MAI Gain

```
mai_gain = Future_MAI_Overall - MAI_Overall
```

Positive gain = improving market attractiveness. Negative gain = declining.

---

## 8. Complete Variable Reference

| # | Variable | Source | Year | Domain | Therapy Applicable | Key Limitation |
|---|----------|--------|------|--------|-------------------|----------------|
| 1 | census_total_population | Census 2011 | 2011 | Demographics | No | Static decennial |
| 2 | literacy_rate | Census 2011 | 2011 | Demographics | No | Static decennial |
| 3 | sex_ratio | Census 2011 | 2011 | Demographics | No | Static decennial |
| 4 | latrine_access_rate | Census 2011 HLPCA | 2011 | WASH | No | Pre-Swachh Bharat |
| 5 | tap_water_rate | Census 2011 HLPCA | 2011 | WASH | No | Pre-Jal Jeevan Mission |
| 6 | nfhs5_high_blood_sugar_pct | NFHS-5 | 2019-21 | Chronic disease | Yes | Women only; includes medicated |
| 7 | nfhs5_elevated_bp_pct | NFHS-5 | 2019-21 | Chronic disease | Yes | Women only |
| 8 | nfhs5_women_overweight_pct | NFHS-5 | 2019-21 | Nutrition | Yes | Women only |
| 9 | nfhs5_women_tobacco_pct | NFHS-5 | 2019-21 | Risk factors | Yes | |
| 10 | nfhs5_men_tobacco_pct | NFHS-5 | 2019-21 | Risk factors | Yes | |
| 11 | nfhs5_women_alcohol_pct | NFHS-5 | 2019-21 | Risk factors | Yes | |
| 12 | nfhs5_men_alcohol_pct | NFHS-5 | 2019-21 | Risk factors | Yes | |
| 13 | nfhs5_child_diarrhoea_pct | NFHS-5 | 2019-21 | Child morbidity | Yes | |
| 14 | nfhs5_child_ari_pct | NFHS-5 | 2019-21 | Child morbidity | Yes | |
| 15 | nfhs5_improved_sanitation_pct | NFHS-5 | 2019-21 | WASH | No | |
| 16 | nfhs5_improved_water_pct | NFHS-5 | 2019-21 | WASH | No | |
| 17 | nfhs5_child_underweight_pct | NFHS-5 | 2019-21 | Nutrition | Yes | |
| 18 | nightlight_log_mean | NASA VIIRS | 2019-21 | Income proxy | No | Formal-sector only |
| 19 | nightlight_growth_rate | NASA VIIRS | 2014-19 | Income proxy | No | Noisy for small districts |

**Domain counts:** Demographics = 3, WASH = 4, Chronic disease = 2, Nutrition = 2, Risk factors = 4, Child morbidity = 2, Income proxy = 2. **Total = 19.**

---

## 9. Master Formula Cheat Sheet

```
STEP 1:  x_norm = (x - min) / (max - min)                    [per variable, per domain]

STEP 2:  composite_k = Σ(x_norm_i × ahp_weight_i)            [per domain k, AHP-weighted]

STEP 3:  Demand_Overall      = 0.5 × DC + 0.5 × DA
         Realizability_Overall = 0.5 × RC + 0.5 × RA

STEP 4:  MAI = Demand^0.5 × Realizability^0.5                  [geometric mean]

STEP 5:  Quadrant = f(Demand >= state_median,
                      Realizability >= state_median)

STEP 6:  TrendSlope = (MAI_current - MAI_historical) / 4.0

STEP 7:  Future_MAI = MAI_current + 0.3 × TrendSlope

Confidence:  score = 1 - fraction_imputed
Validation:  Spearman(MAI_rank, proxy_rank)
Sensitivity: Spearman(MAI_AHP_rank, MAI_entropy_rank)
```

---

## 10. Pipeline Orchestration

**Script:** `pipeline/run_all.py`

| Stage | Script | Input | Output |
|-------|--------|-------|--------|
| 1 | `02_reconcile/build_district_master.py` | Raw LGD data | `district_master.csv` |
| 2 | `03_clean/clean_and_impute.py` | Raw sources + master | `district_variables_clean.csv` |
| 3 | `04_construct/build_subdomain_composites.py` | Cleaned variables | `subdomain_composites.csv`, `ahp_weights.csv` |
| 4 | `05_index/build_index.py` | Composites | `district_index_scores.csv`, `alpha_sensitivity_report.csv` |
| 5 | `06_validate/validate_proxies.py` | Scores + raw proxies | `validation_report.md` |
| 6 | `07_future/build_future_index.py` | Scores + NFHS-4 + nightlights | `district_index_future.csv` |
| 7 | `08_export/export_final.py` | All processed data | `district_index_final.csv`, `.geojson` |

Stage 01 (ingestion) is excluded from the automated pipeline because government portals are unstable; raw data is committed to the repo.

If any stage fails, the pipeline **halts immediately**.

---

*Document generated for DistrictDx — Pharmaceutical Market Attractiveness Index*
*Pipeline version: IIM Calcutta PGDBA Conclave 2026*
