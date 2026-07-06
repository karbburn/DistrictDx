## Data Availability Audit

**Date:** 2026-07-06  
**Author:** Sourabh  
**Purpose:** Verify every data source is reachable, free, and available at the claimed granularity before building pipeline code around assumptions.

---

## Legend

| Field | Meaning |
|---|---|
| **Reachable** | Can the portal/URL be accessed without login/paywall? |
| **Granularity Found** | Actual granularity confirmed (district / state / national / gridded-raster) |
| **Year/Vintage** | Most recent year available |
| **Format** | CSV, Excel, PDF, NetCDF, Shapefile, etc. |
| **Flags** | WARN = needs attention, OK = good to go, WIP = usable with workaround |

---

## 1. District Master & Boundary Reconciliation

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| LGD codes (master key) | `lgdirectory.gov.in` | Yes | District, Sub-district, Village | Current (live) | XLS download | OK | "Download Directory" section provides Excel. GitHub mirrors (e.g. `planemad/india-local-government-directory`) provide CSV. ~780+ districts confirmed. |
| Census 2011 → LGD crosswalk | Census + LGD | Yes | District | 2011 / current | Excel + manual | WIP | No single official crosswalk file. Community repos on GitHub provide Census-2011-to-LGD mappings. Will need manual verification for bifurcated districts (e.g., Andhra Pradesh/Telangana split). |

---

## 2. Demand Potential — Shared/Base

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| Population, pop density, sex ratio, literacy rate | Census 2011 (`censusindia.gov.in`) | Yes | District | 2011 | Excel/XLS | OK | Census Tables section → Primary Census Abstract. Also available as cleaned CSV on Kaggle/GitHub. |
| Urbanization rate | Census 2011 | Yes | District | 2011 | Excel | OK | Derived from urban/rural population in PCA tables. |
| Urbanization growth rate (2001→2011 delta) | Census 2001 & 2011 | Yes | District | 2001, 2011 | Excel | WIP | Census 2001 district-level data is available but district boundaries changed between 2001 and 2011. Need Census 2001→2011 district concordance (available via academic repos). Extra reconciliation work required. |
| Nightlights-as-income-proxy (VIIRS) | NASA Black Marble / EOG (`eogdata.mines.edu`) | Yes | Gridded raster (needs zonal stats) | 2012–2024 annual | GeoTIFF/NetCDF | WIP | **Not pre-aggregated to district.** Options: (a) Use `yashveeeeeeer/india-district-nightlights-viirs` GitHub repo — provides pre-computed district CSV for 641 districts, 2012–2024. (b) Bhuvan NTL portal (ISRO/NRSC) provides state/district summaries. (c) Process raw rasters via GEE/QGIS with district shapefiles. **Recommend option (a) as primary, cross-checked against Bhuvan.** Free Earthdata login required for raw NASA data. |
| Per-capita OOP health expenditure | NSSO Health Survey / NFHS-5 | Partially | **State-level** (NSSO); district-level partial (NFHS-5) | NSSO: 2017-18 (75th Round); NFHS-5: 2019-21 | NSSO: unit-level microdata (registration required at `microdata.gov.in`); NFHS-5: PDF fact sheets | WIP | **NSSO microdata requires free registration at microdata.gov.in** — not paywalled but not instant download. Provides state-level estimates natively; district-level requires custom aggregation from unit records (sample size concerns). NFHS-5 has a household health expenditure indicator at district level in fact sheets. **Recommend: use NFHS-5 district-level OOP indicator as primary, NSSO state-level as cross-check.** |

---

## 3. Demand Potential — Chronic-Specific

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| Diabetes prevalence (self-reported/tested) | NFHS-5 District Fact Sheets (`rchiips.org/nfhs`) | Yes (with workaround) | District | 2019-21 | **PDF** (official); CSV via community repos | WIP | Official site `rchiips.org` has expired SSL certificate — may block automated HTTPS access. **Workaround:** Use community-scraped CSVs: (a) GitHub `pratapvardhan/NFHS-5` — clean district-level CSV; (b) Mendeley dataset `t3s358sfzg` — consolidated Excel. Both derived from official PDFs. Cross-verify key values against original PDFs. |
| Hypertension prevalence | NFHS-5 | Same as above | District | 2019-21 | Same | WIP | Same source and workaround as diabetes. Indicator present in district fact sheets. |
| Overweight/obesity prevalence | NFHS-5 | Same as above | District | 2019-21 | Same | WIP | Same source. Indicator: "Women/Men who are overweight or obese (BMI ≥ 25.0 kg/m²)". |
| Population aged 60+/65+ share | Census 2011 age tables (`censusindia.gov.in`) | Yes | District | 2011 | Excel | OK | C-series tables (Social & Cultural tables) → age breakdown by 5-year cohorts at district level. Sum 60+ cohorts. Available on Census Digital Library. |
| Tobacco/alcohol use prevalence | NFHS-5 | Same as diabetes | District | 2019-21 | Same | WIP | Indicators present: "Men who use any kind of tobacco", "Women/Men who consume alcohol". Available in community-scraped CSVs. |

---

## 4. Demand Potential — Acute-Specific

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| Malaria incidence | NVBDCP / NCVBDC (`nvbdcp.gov.in`) | WARN Partially | **State-level** (public); district-level restricted | Various | Internal dashboard (IHIP) | WARN **FLAG** | **District-level malaria/dengue data is NOT freely downloadable.** Public reports from NCVBDC are typically state-level aggregates. District-level data is managed internally via IHIP (Integrated Health Information Platform) and requires authorized access. **Options:** (a) Use state-level data with `granularity_flag = "state_level_proxy"`; (b) Check if Dataful.in has aggregated district-level IDSP data; (c) Use academic datasets (e.g., EpiClim). **Recommend accepting state-level fallback and flagging.** |
| Dengue incidence | NVBDCP / NCVBDC | Same as malaria | **State-level** | Various | Same | WARN **FLAG** | Same issue as malaria. State-level fallback required. |
| TB incidence | NCDC / Ni-kshay (`reports.nikshay.in`) | Yes | **District-level** (notification data) | 2020–2025 | Excel download | OK | Ni-kshay Reports portal allows filtering by state/district and downloading Excel. Provides "notification" counts (not modeled incidence), which is sufficient for our proxy purposes. |
| Diarrheal disease / child morbidity | NFHS-5 | Yes (community CSVs) | District | 2019-21 | CSV (community) / PDF (official) | WIP | NFHS-5 has under-5 morbidity indicators (diarrhea in last 2 weeks, ARI symptoms) at district level. Available via community-scraped datasets. |
| Open defecation rate | NFHS-5 / Census | Yes | District | NFHS-5: 2019-21; Census: 2011 | CSV/Excel | OK | NFHS-5 has "Households using improved sanitation" at district level. Census 2011 has latrine access data. |
| Safe drinking water access | NFHS-5 / Census | Yes | District | 2019-21 / 2011 | CSV/Excel | OK | NFHS-5: "Households with an improved drinking water source". Census: similar indicator. |
| Rainfall/monsoon intensity | IMD gridded rainfall (`imdpune.gov.in`) | Yes | **Gridded raster (0.25° × 0.25°)** | 1901–present | NetCDF/Binary | WIP | **Not pre-aggregated to district.** Requires zonal stats with district shapefiles. IMD also publishes "All India District Rainfall Statistics" which may have pre-computed district totals. Python library `imdlib` can automate download and extraction. Free but requires processing. **Alternative:** IMD's district rainfall monitoring page (imd.gov.in) has some pre-computed district stats. |

---

## 5. Realizability / Access — Shared/Base

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| Doctors per 1,000 pop, PHC/CHC density | Rural Health Statistics / "Health Dynamics of India", MoHFW (`mohfw.gov.in`) | Yes | **State-level** (official publication); some district-level in annexures | 2022-23 (latest) | PDF (primary); some Excel tables | WIP | The official publication ("Health Dynamics of India") provides state-wise infrastructure and manpower tables. District-level PHC/CHC counts are available in annexures but not always as clean downloadable tables. **Workaround:** Dataful.in and Kaggle host cleaned versions. NITI for States portal also has some district health infra data. Doctors per 1,000 at district level may need derivation from PHC/CHC staffing tables. |
| Hospital bed density | Rural Health Statistics / NHP | Yes | State-level (primary); some district in annexures | 2022-23 | PDF/Excel | WIP | Same source as above. Bed counts per facility type available. District-level derivation possible from facility-wise annexures. |
| Road connectivity / village connectivity | PMGSY (`pmgsy.nic.in`) / GeoSadak | Yes | District | Current | Shapefile (GeoSadak); MIS reports (pmgsy.nic.in) | OK | GeoSadak Open Data Portal provides district-level road network shapefiles under Government Open Data License. PMGSY MIS has progress reports by district. Can derive connectivity index from habitation connectivity percentage. |

---

## 6. Realizability — Chronic-Specific

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| Diagnostic lab / pathology infra | HMIS facility registry (NHM portal) | WARN Partially | Facility-level (restricted); aggregated district may be available | Various | Dashboard / restricted downloads | WARN **FLAG** | **HMIS portal (`hmis.mohfw.gov.in`) has aggregated district-level indicators in its public dashboard**, but raw facility-level data requires authorized access. **Alternative:** ABDM Health Facility Registry (`facility.abdm.gov.in`) provides public listing of registered facilities by district including labs. Can scrape/count diagnostic facilities per district. **Recommend: Use HFR facility counts as proxy.** |
| Chronic-care OPD availability | HMIS | WARN Partially | District (aggregated indicators) | Various | Dashboard | WARN **FLAG** | HMIS dashboard shows OPD indicators at district level, but may not be directly downloadable. **Workaround:** Use HMIS dashboard to manually extract or use HMIS API if available. Alternatively, derive from HFR facility type counts (CHCs with specialist availability). |

---

## 7. Realizability — Acute-Specific

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| Ambulance density, emergency/trauma centers | Rural Health Statistics | Partially | State-level (primary) | 2022-23 | PDF | WIP | Ambulance density not separately tabulated in RHS. Emergency/trauma centers partially covered under district hospital listings. **May need to derive from facility counts in RHS annexures or use 108/102 ambulance service data if available from state NHM sites.** State-level fallback likely necessary. |
| PHC/CHC per capita | Rural Health Statistics | Yes | State + some district | 2022-23 | PDF/Excel | WIP | PHC/CHC counts per state are well-documented. District-level facility counts available in RHS annexures. Per-capita derivation requires combining with Census population. |

---

## 8. Trend / Future Indicators

| Variable | Source (TECHSPEC) | Reachable | Granularity Found | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|---|
| Urbanization growth rate (2001→2011) | Census 2001 & 2011 | Yes | District | 2001, 2011 | Excel | WIP | Same boundary reconciliation issue as §2. Doable but requires concordance table. |
| NFHS-4 → NFHS-5 deltas (chronic risk factors) | `rchiips.org/nfhs` | Yes (community repos) | District | NFHS-4: 2015-16, NFHS-5: 2019-21 | CSV (GitHub: `HindustanTimesLabs/nfhs-data` for NFHS-4, `pratapvardhan/NFHS-5` for NFHS-5) | WIP | Both rounds have district-level fact sheets. Community-scraped CSVs available for both. **Key concern:** District boundaries may have changed between NFHS-4 and NFHS-5 — need LGD concordance. Some indicators may have different definitions across rounds — verify indicator names match. |
| Population growth rate | Census 2001 & 2011 | Yes | District | 2001, 2011 | Excel | WIP | Same as urbanization growth — needs concordance. Decadal growth rate is standard Census output. |
| Nightlight growth rate | VIIRS time series | Yes | District (via community repo) | 2012–2024 | CSV (GitHub) | WIP | `yashveeeeeeer/india-district-nightlights-viirs` provides multi-year district-level data. Growth rate = simple annual trend from time series. |

---

## 9. Validation Sources (TECHSPEC §6)

| Source | Reachable | Granularity | Year | Format | Status | Notes |
|---|---|---|---|---|---|---|
| PMJAY claims volume/value (`nha.gov.in` / `pmjay.gov.in`) | WARN Partially | **State-level** (public dashboard); district-level restricted | Current | Dashboard (no CSV download) | WARN **FLAG** | **District-level PMJAY claims data is NOT publicly downloadable.** The public dashboard at pmjay.gov.in shows state-level aggregates. District-level data requires authorized access or formal data request to NHA. **Options:** (a) Use state-level aggregates for validation correlation; (b) Request data from NHA (may not arrive in time); (c) Drop as validation source and rely on others. **Recommend state-level fallback — reduces validation power but is honest.** |
| HMIS OPD/IPD footfall | `hmis.mohfw.gov.in` | District (aggregated) | Various | Dashboard | WIP | HMIS dashboard shows district-level OPD/IPD indicators. Manual extraction or API access needed. Some state portals provide downloadable reports. |
| Jan Aushadhi Kendra count per district | `janaushadhi.gov.in` | Yes | District (via "Locate Kendra") | Current | Website listing (no bulk CSV) | WIP | No direct bulk CSV download available. Store locator allows state+district search. **Workaround:** Scrape the "Locate Kendra" results per state/district, or use older scraped lists from Scribd/Slideshare (verify currency). Total count is ~19,000+ stores nationally. This is a strong differentiator variable — worth the scraping effort. |
| NSSO/NFHS OOP health expenditure | `microdata.gov.in` / NFHS-5 | Yes | State (NSSO) / District (NFHS-5) | NSSO: 2017-18; NFHS-5: 2019-21 | Microdata / CSV | WIP | Covered in §2 above. |

---

## Summary of Flags Requiring Decision

| # | Variable/Source | Issue | Recommended Action |
|---|---|---|---|
| 1 | **Malaria/Dengue incidence (NVBDCP/NCVBDC)** | District-level data not publicly downloadable; state-level only in public domain | Accept state-level fallback with `granularity_flag = "state_level_proxy"`. Check Dataful.in for any district-level aggregation. If unavailable, use NFHS-5 malaria testing indicators as partial proxy. |
| 2 | **HMIS diagnostic lab / OPD data** | Granular facility data restricted; public dashboard has district aggregates but no bulk download | Use ABDM Health Facility Registry (`facility.abdm.gov.in`) counts as primary proxy for diagnostic infra. For OPD, attempt HMIS dashboard extraction or accept state-level. |
| 3 | **PMJAY district-level claims** (validation) | District-level data restricted | Downgrade to state-level correlation for validation. Reduces granularity of validation but stays honest. |
| 4 | **NFHS-5 official site SSL** | `rchiips.org` certificate expired | Use community-scraped CSVs from GitHub (pratapvardhan/NFHS-5) and Mendeley. Cross-verify samples against original PDFs. |
| 5 | **Ambulance density** | Not separately tabulated in RHS | Derive from RHS facility annexures or drop in favor of PHC/CHC density (already covered). State-level fallback acceptable. |
| 6 | **Jan Aushadhi Kendra counts** (validation) | No bulk CSV — website search only | Write a simple scraper for the "Locate Kendra" page, or use a cached list. Worth the effort as a strong differentiator. |
| 7 | **Census 2001→2011 boundary concordance** | District boundaries changed; no official single concordance file | Use academic/community concordance tables (several exist on GitHub). Requires manual QA for split/merged districts. |
| 8 | **Nightlights / IMD Rainfall** | Gridded raster, not pre-aggregated to district | Use community pre-processed repos (nightlights) or Python zonal stats (rainfall). Both doable but add processing time. |

---

## Overall Assessment

**Core feasibility: YES.** The vast majority of variables can be sourced from free public data, though many require community-scraped CSVs rather than pristine government API downloads. The two genuinely problematic areas are:

1. **Vector-borne disease incidence at district level** — malaria/dengue from NVBDCP is effectively restricted. State-level fallback is the honest path.
2. **HMIS facility-level data** — restricted access. The ABDM Health Facility Registry is a viable free alternative for infrastructure counts.

No paid data source is needed for any variable. The NSSO microdata portal requires free registration (not a paywall). All other sources are either directly downloadable or available through well-established community repositories (GitHub, Mendeley, Kaggle) that derived their data from the original government publications.
