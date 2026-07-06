"""
Stage 9 — Final Export and Unified Output Generation
=====================================================

  1. Merges Current and Future Indices with Imputation Flags:
     - Loads cleaned variables and imputation flags from district_variables_clean.csv.
     - Loads current and future index scores from district_index_future.csv.
     - Loads district master to get boundary_inherited flag.
     - Merges them on lgd_district_code to create a single, unified dataset.
     - Writes to /outputs/district_index_final.csv.

  2. Generates Unified District GeoJSON using real LGD boundaries:
     - Loads LGD_Districts.parquet.
     - Matches districts based on lgd_district_code.
     - Resolves parent-child boundaries for Satna/Maihar and Chhindwara/Pandhurna.
     - Writes full GeoJSON to /outputs/district_index_final.geojson.
     - Writes light GeoJSON to /dashboard/public/data/india-districts-light.json.

  3. Synchronizes with Dashboard:
     - Copies final CSV and GeoJSON outputs to the Next.js public directory
       (/dashboard/public/data/) to prepare for frontend visualization.
"""

import json
import logging
import shutil
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.validation import make_valid
from shapely.geometry import mapping, shape

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
CLEAN_FILE = Path("data/processed/district_variables_clean.csv")
FUTURE_FILE = Path("data/processed/district_index_future.csv")
MASTER_FILE = Path("data/processed/district_master.csv")
PARQUET_BOUNDARIES = Path("scratch/LGD_Districts.parquet")

OUT_DIR = Path("outputs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

CSV_OUT = OUT_DIR / "district_index_final.csv"
GEOJSON_OUT = OUT_DIR / "district_index_final.geojson"

DASHBOARD_DIR = Path("dashboard/public/data")
LIGHT_GEOJSON_OUT = DASHBOARD_DIR / "india-districts-light.json"


# ── Real Geometry GeoJSON Generator ───────────────────────────────────────────

def generate_real_geojson(df: pd.DataFrame, dest_full: Path, dest_light: Path):
    """
    Loads LGD_Districts.parquet, merges it with the district index DataFrame,
    duplicates geometries for Maihar (784) and Pandhurna (785) from parents,
    quantizes geometry to reduce file size, and writes both full and light GeoJSON files.
    """
    if not PARQUET_BOUNDARIES.exists():
        log.error("LGD boundary parquet file not found at: %s", PARQUET_BOUNDARIES)
        sys.exit(1)

    log.info("Loading real LGD boundaries from parquet...")
    gdf_parquet = gpd.read_parquet(PARQUET_BOUNDARIES)
    
    # Cast to integer for matching
    gdf_parquet["dist_lgd"] = pd.to_numeric(gdf_parquet["dist_lgd"], errors="coerce").fillna(-1).astype(int)
    
    # Get parent geometries
    satna_rows = gdf_parquet[gdf_parquet["dist_lgd"] == 426]
    chhindwara_rows = gdf_parquet[gdf_parquet["dist_lgd"] == 399]
    
    if satna_rows.empty:
        log.error("Satna (LGD 426) geometry not found in LGD_Districts.parquet!")
        sys.exit(1)
    if chhindwara_rows.empty:
        log.error("Chhindwara (LGD 399) geometry not found in LGD_Districts.parquet!")
        sys.exit(1)
        
    satna_geom = satna_rows.iloc[0]["geometry"]
    chhindwara_geom = chhindwara_rows.iloc[0]["geometry"]
    
    # Create lookup map of code -> geometry
    geom_dict = {}
    for _, row in gdf_parquet.iterrows():
        code = int(row["dist_lgd"])
        if code > 0:
            geom_dict[code] = row["geometry"]
            
    # Assign parent geometries to children (Option 2)
    geom_dict[784] = satna_geom       # Maihar inherits Satna
    geom_dict[785] = chhindwara_geom  # Pandhurna inherits Chhindwara
    
    features_full = []
    features_light = []
    
    # Geometry quantizer (4 decimal places ~ 11m precision - matching prepare-light-geojson.mjs)
    def quantize_coord(coord):
        return [
            round(coord[0], 4),
            round(coord[1], 4)
        ]
        
    def quantize_geom(geom):
        if geom is None:
            return None
        geom = make_valid(geom)
        g_map = mapping(geom)
        
        if g_map["type"] == "Polygon":
            g_map["coordinates"] = [[quantize_coord(pt) for pt in ring] for ring in g_map["coordinates"]]
        elif g_map["type"] == "MultiPolygon":
            g_map["coordinates"] = [[[quantize_coord(pt) for pt in ring] for ring in poly] for poly in g_map["coordinates"]]
            
        return shape(g_map)

    log.info("Processing features and building GeoJSON outputs...")
    for _, row in df.iterrows():
        code = int(row["lgd_district_code"])
        geom = geom_dict.get(code)
        
        if geom is None:
            log.warning("No geometry found for LGD code %d (%s, %s)", code, row["district_name"], row["state_name"])
            continue
            
        # Quantize the geometry
        geom = quantize_geom(geom)
        g_json = mapping(geom)
        
        # Build properties for full GeoJSON
        props_full = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                props_full[col] = None
            elif isinstance(val, (np.integer, np.floating)):
                props_full[col] = float(val) if isinstance(val, np.floating) else int(val)
            elif isinstance(val, (bool, np.bool_)):
                props_full[col] = bool(val)
            else:
                props_full[col] = str(val)
                
        # Build properties for light GeoJSON (stripped properties to keep file size small)
        props_light = {
            "lgd_state_code": int(row["lgd_state_code"]),
            "lgd_district_code": code,
            "district_name": str(row["district_name"]),
            "state_name": str(row["state_name"])
        }
        
        features_full.append({
            "type": "Feature",
            "id": code,
            "properties": props_full,
            "geometry": g_json
        })
        
        features_light.append({
            "type": "Feature",
            "id": code,
            "properties": props_light,
            "geometry": g_json
        })
        
    geojson_full = {
        "type": "FeatureCollection",
        "features": features_full
    }
    geojson_light = {
        "type": "FeatureCollection",
        "features": features_light
    }
    
    # Save full GeoJSON
    with open(dest_full, "w", encoding="utf-8") as f:
        json.dump(geojson_full, f)
    log.info("Full GeoJSON saved to → %s", dest_full)
    
    # Save light GeoJSON
    dest_light.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_light, "w", encoding="utf-8") as f:
        json.dump(geojson_light, f)
    log.info("Light GeoJSON saved to → %s", dest_light)


# ── Main Stage 9 Orchestrator ──────────────────────────────────────────────────

def main():
    log.info("=== Stage 9: Final Export & Data Dictionary ===")

    if not Path("data/processed").exists():
        log.error("Run this script from the project root directory.")
        sys.exit(1)
    
    # ── Load inputs ───────────────────────────────────────────────────────────
    clean_df = pd.read_csv(CLEAN_FILE)
    future_df = pd.read_csv(FUTURE_FILE)
    master_df = pd.read_csv(MASTER_FILE)
    
    log.info("Cleaned variables shape: %s", clean_df.shape)
    log.info("Future index scores shape: %s", future_df.shape)
    log.info("Reconciled master shape: %s", master_df.shape)
    
    # ── Merge clean variables (flags, raw values) onto future scores ──────────
    # Exclude duplicate keys to prevent suffix collisions
    cols_to_drop = [
        "lgd_state_code", "district_name", "state_name",
        "census_2011_district_code", "notes", "confidence_score"
    ]
    
    final_df = future_df.merge(
        clean_df.drop(columns=cols_to_drop),
        on="lgd_district_code",
        how="left"
    )
    
    # Verify shape and nulls
    assert len(final_df) == len(future_df), "Row count mismatch after final merge!"
    
    # ── Merge boundary_inherited column from master ───────────────────────────
    master_df["boundary_inherited"] = master_df["notes"].str.contains("boundary_inherited", na=False)
    final_df = final_df.merge(
        master_df[["lgd_district_code", "boundary_inherited"]],
        on="lgd_district_code",
        how="left"
    )
    final_df["boundary_inherited"] = final_df["boundary_inherited"].fillna(False)
    
    log.info("Unified final export dataset created (shape: %s)", final_df.shape)
    log.info("Boundary-inherited districts: %d", final_df["boundary_inherited"].sum())

    # ── Verify district completeness ──────────────────────────────────────────
    missing = set(master_df["lgd_district_code"]) - set(final_df["lgd_district_code"])
    if missing:
        log.warning("Districts in master but missing from final output: %s", missing)
    
    # Write to final CSV
    final_df.to_csv(CSV_OUT, index=False)
    log.info("Saved unified CSV to → %s", CSV_OUT)
    
    # ── Generate GeoJSON ──────────────────────────────────────────────────────
    geojson_ok = False
    try:
        generate_real_geojson(final_df, GEOJSON_OUT, LIGHT_GEOJSON_OUT)
        geojson_ok = True
    except Exception as e:
        log.error("Failed to generate GeoJSON: %s", e, exc_info=True)

    # ── Copy to Dashboard ─────────────────────────────────────────────────────
    if geojson_ok:
        DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy(CSV_OUT, DASHBOARD_DIR / "district_index_final.csv")
        shutil.copy(GEOJSON_OUT, DASHBOARD_DIR / "district_index_final.geojson")
        log.info("Synchronized final files with dashboard directory → %s", DASHBOARD_DIR)
    else:
        log.warning("Skipping dashboard sync — GeoJSON generation failed")


if __name__ == "__main__":
    main()
