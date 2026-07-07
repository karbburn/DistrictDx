# DistrictDx — Project Overview

*Pharmaceutical Market Attractiveness Index for India's 785 Districts*

---

## The Problem

India's pharmaceutical market is projected to reach $130 billion by 2030. Yet the industry's ability to allocate resources efficiently at the district level — where prescriptions are written, pharmacies are stocked, and patients make purchasing decisions — remains surprisingly primitive.

Today, most market allocation decisions rely on three inputs: state-level population data, historical sales figures, and regional manager intuition. All three have fundamental flaws:

- **State-level data is too coarse.** Uttar Pradesh and Kerala are both "states" — but Lucknow and Munnar have nothing in common. Aggregating to the state level masks the district-level variation that actually drives prescribing patterns and product adoption.

- **Sales history is backward-looking.** Past performance reflects past resource allocation, not future opportunity. A district with low sales may simply be underinvested, not unattractive. Using sales history to allocate future budgets perpetuates the status quo.

- **Intuition doesn't scale.** A regional manager may know their territory, but no one holds a mental model of 785 districts simultaneously. As portfolios expand and teams turn over, institutional knowledge walks out the door.

The data to solve this exists. India's Census provides demographic baselines. The National Family Health Survey (NFHS) captures disease prevalence and risk factors at the district level. NASA satellite imagery proxies for economic activity. Government health records document infrastructure and utilization. But these sources live in different formats, different years, different agencies, and different file types.

No one had stitched them together into a single, comparable score for every district in the country.

That is what DistrictDx does.

---

## The Solution

DistrictDx produces a **Market Attractiveness Index (MAI)** — a single score for each of India's 785 districts that quantifies how attractive that district is for pharmaceutical market entry or expansion.

The index rests on a core insight: market attractiveness is not a single number. It is the intersection of two dimensions.

**Demand** measures how much health-related need exists. Higher disease burden, larger at-risk populations, and greater prevalence of chronic conditions all signal stronger potential consumption of pharmaceutical products.

**Realizability** measures whether that need can be converted into actual market activity. Districts with better healthcare infrastructure, higher literacy rates, and stronger economic conditions are more likely to translate health needs into prescriptions, pharmacy visits, and product adoption.

Consider two hypothetical districts. District A has high diabetes prevalence but no endocrinologists, limited pharmacy access, and low per-capita income. The need is real, but the market cannot serve it today. District B has excellent hospitals and pharmacies but relatively low disease burden. The infrastructure exists, but the demand is thin. The most attractive markets are those where both dimensions align — where need meets capability.

This dual-axis framework produces a score between 0 and 1 for every district, along with a classification into one of four strategic quadrants.

---

## How It Works

### Data Foundation

The index draws from seven primary data sources:

| Source | Coverage | What It Provides |
|--------|----------|-----------------|
| Census of India 2011 | 785 districts | Population, literacy, sex ratio, sanitation, water access |
| NFHS-5 (2019-21) | 707 districts | Disease prevalence, risk factors, nutrition, WASH indicators |
| NFHS-4 (2015-16) | 640 districts | Historical baseline for trend analysis |
| NASA VIIRS Nightlights | 785 districts | Economic activity proxy via satellite imagery |
| Local Government Directory | 785 districts | Canonical district codes and boundaries |

For districts where NFHS-5 data is unavailable, the pipeline imputes values using a tiered hierarchy: first attempting a trend-adjusted estimate from NFHS-4 data, then falling back to state averages, and finally national averages. Every imputation is flagged, and each district carries a confidence score reflecting what proportion of its data was directly observed versus estimated.

### Nineteen Indicators

Nineteen variables capture the full picture across six domains:

- **Demographics** — population size, literacy rate, sex ratio
- **Chronic Disease** — blood sugar, blood pressure, overweight prevalence
- **Risk Factors** — tobacco use, alcohol consumption (by gender)
- **Child Health** — diarrhoea, acute respiratory infection, underweight prevalence
- **WASH** — latrine access, tap water, improved sanitation, improved water
- **Economic Conditions** — nightlight intensity (level and growth trajectory)

These are organized into four domain groups — Chronic Demand, Acute Demand, Chronic Realizability, Acute Realizability — each capturing a distinct market dynamic.

### Weighting and Scoring

Within each domain, indicators are weighted using a structured expert judgment method. Disease prevalence indicators receive higher weights in the Demand domains; infrastructure indicators receive higher weights in the Realizability domains. These weights are validated for internal consistency — if the pairwise judgments are too contradictory, the system flags the issue and halts.

The weighted indicators combine into four composite scores, which then blend into two axis scores: **Demand** and **Realizability**.

### The Geometric Mean

The final MAI is the **geometric mean** of Demand and Realizability:

```
MAI = √(Demand × Realizability)
```

This is a deliberate choice. A simple average would treat a district with 0.8 Demand and 0.2 Realizability the same as one with 0.5 and 0.5. The geometric mean does not. It penalizes imbalance — a district strong on one axis but weak on the other receives a lower score than one balanced across both.

The business implication: a district with high disease burden but no infrastructure to serve it is not an attractive market today. The geometric mean captures this reality.

---

## What the Numbers Mean

Each district receives an MAI score between 0 and 1. Higher scores indicate more attractive markets.

Three variants are produced:

| Index | What It Captures | Use Case |
|-------|-----------------|----------|
| **MAI Overall** | Combined attractiveness across all therapy areas | Portfolio-level allocation |
| **MAI Chronic** | Attractiveness for chronic therapy (diabetes, hypertension, cardiovascular) | Chronic franchise strategy |
| **MAI Acute** | Attractiveness for acute therapy (infections, child health) | Acute franchise strategy |

The distinction matters. Chronic markets are driven by lifestyle diseases, aging populations, and long-term treatment adherence. Acute markets are driven by infection prevalence, child health outcomes, and healthcare access speed. A district may be highly attractive for one therapy class but not the other.

---

## The Four Quadrants

Each district is classified into one of four strategic quadrants based on its Demand and Realizability scores. The classification uses **within-state medians** — each district is compared to other districts in its own state, ensuring contextually meaningful comparisons rather than a national average that would systematically favor large states.

### Star — High Demand, High Realizability

Both dimensions are strong. These districts have significant health needs and the infrastructure to serve them. They represent the most attractive markets for immediate investment.

**Action:** Deploy sales teams, expand distribution, defend market share.

### Emerging — High Demand, Low Realizability

Strong health needs exist, but infrastructure gaps limit market conversion. These are long-term growth opportunities where investment in access should precede aggressive sales deployment.

**Action:** Build pharmacy networks, establish hospital partnerships, invest in distribution before scaling sales.

### Underserved — Low Demand, High Realizability

Infrastructure is adequate but disease burden or population at risk is relatively lower. These districts are suitable for maintenance-level presence.

**Action:** Maintain efficient operations, optimize existing coverage, monitor for demand shifts.

### Deprioritize — Low Demand, Low Realizability

Both dimensions are weak. These districts warrant monitoring but not immediate resource allocation.

**Action:** Monitor only. Revisit as infrastructure improves or disease patterns shift.

---

## Looking Ahead: The Future Index

Beyond current attractiveness, DistrictDx projects where each district is heading.

Using historical data from NFHS-4 (2015-16) and VIIRS nightlights (2015), the pipeline reconstructs a baseline snapshot from approximately six years prior. Trend slopes are computed for each axis, and the Future Index extrapolates current scores forward using a conservative dampening factor.

The dampening factor of 0.3 captures 30% of the historical trend as a realistic "business as usual" projection. This reflects two realities: government interventions (Swachh Bharat, Jal Jeevan Mission) may accelerate infrastructure improvements beyond historical rates, and some observed trends may not sustain at past trajectories.

The Future Index produces a **gain score** — the difference between projected and current MAI. Districts with high positive gain are improving rapidly and may warrant early investment ahead of competitors. Districts with high current MAI but low gain may be mature markets where growth has plateaued.

---

## Reading the Dashboard

The DistrictDx dashboard provides four views for exploring the data:

### Map View
A choropleth map of India color-coded by MAI score. Click any district to see its full profile — quadrant classification, axis scores, confidence level, and data sources. The map supports state-level filtering and zooming.

### Scatter View
A demand-versus-realizability scatter plot with all 785 districts. Each point is color-coded by quadrant classification. State-level filtering allows focus on specific geographies. The chart reveals where districts cluster and where outliers sit.

### Rankings
A sortable table of all 785 districts ranked by MAI score. Filter by state, sort by any axis or the overall index. Each row shows the district's quadrant classification and confidence score.

### District Profile
Click any district on the map or rankings to see a detailed profile: MAI scores across all variants, quadrant placement, chronic versus acute therapy breakdown, and data confidence indicators.

---

## Validation and Limitations

The index has been validated against four external benchmarks:

- **Jan Aushadhi pharmacy density** — Spearman correlation of 0.45 (moderate positive, statistically significant)
- **NSSO out-of-pocket health expenditure** — Spearman correlation of 0.73 (strong positive)
- **PMJAY insurance claims volume** — Spearman correlation of 0.51 at state level (moderate positive)
- **Entropy-weighted alternative** — Spearman correlation of 0.92 against the AHP-weighted index (strong agreement between expert-driven and data-driven weighting)

The strongest validator is the NSSO expenditure correlation: districts with higher MAI indeed have higher health spending, confirming the index captures real market demand.

### Known Limitations

- **Census 2011 data is a decade old.** Demographics have shifted. Until Census 2021 data is released, this remains the most comprehensive district-level baseline available.
- **NFHS-5 covers 707 of 785 districts.** The remaining 78 districts rely on imputed values, reducing confidence in those scores.
- **Nightlights proxy for formal-sector economic activity only.** Rural subsistence economies may be underrepresented.
- **The index is descriptive, not predictive.** It quantifies current attractiveness and extrapolates trends, but does not model market dynamics, competitive entry, or regulatory changes.
- **Within-state median splits may obscure cross-state variation.** A "Star" in Bihar may have lower absolute scores than an "Emerging" district in Maharashtra.

---

## Key Takeaways

**The index replaces intuition with evidence.** Every score is derived from publicly available datasets, processed through a transparent pipeline, and reproducible by anyone with the same inputs.

**Both demand and infrastructure matter.** A district with high disease burden but poor access is not automatically attractive. The geometric mean ensures both dimensions must be present.

**Therapy-specific views enable targeted strategy.** Chronic and acute indices reveal different opportunity landscapes, allowing teams to tailor their approach by franchise.

**The future index adds a forward-looking dimension.** Current attractiveness tells you where to invest today. The gain score tells you where the market is heading.

**Confidence scores ensure transparency.** Every district carries a confidence indicator reflecting data quality, enabling informed decisions about where estimates are reliable and where they should be treated cautiously.

---

*DistrictDx — Pharmaceutical Market Attractiveness Index*
*IIM Calcutta PGDBA Conclave 2026*
*Written by Sourabh*
