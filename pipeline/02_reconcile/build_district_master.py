"""
Build the reconciled district master crosswalk table.

Source: LGD District Codes + GitHub District Concordance Database
Output: data/processed/district_master.csv
Exact columns: lgd_state_code, lgd_district_code, district_name, state_name, census_2011_district_code, notes
"""

import logging
from pathlib import Path
import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# Output paths
OUT_DIR = Path("data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "district_master.csv"

# Source paths
LGD_CODES_FILE = Path("data/raw/lgd_directory/lgd_district_codes.csv")
CONCORDANCE_URL = "https://raw.githubusercontent.com/vijayshree-jayaraman/District-mapping-2001-2011-with-LGD-codes/main/District%20concordance_with%20LGD%20codes_parent.xlsx"
CONCORDANCE_RAW_FILE = Path("data/raw/lgd_directory/lgd_concordance_parent.xlsx")


def download_concordance() -> bool:
    """Download the concordance spreadsheet if it does not exist in raw data."""
    if CONCORDANCE_RAW_FILE.exists():
        log.info("Concordance file already exists locally: %s", CONCORDANCE_RAW_FILE)
        return True
    
    log.info("Downloading concordance Excel file from %s...", CONCORDANCE_URL)
    try:
        resp = requests.get(CONCORDANCE_URL, timeout=60)
        resp.raise_for_status()
        CONCORDANCE_RAW_FILE.write_bytes(resp.content)
        log.info("Successfully downloaded to %s", CONCORDANCE_RAW_FILE)
        return True
    except Exception as e:
        log.error("Failed to download concordance file: %s", e)
        return False


def main():
    log.info("=== Starting District Master Build ===")
    
    # 1. Ensure raw concordance data exists
    if not download_concordance():
        log.error("Missing concordance source data. Aborting.")
        return

    if not LGD_CODES_FILE.exists():
        log.error("Missing raw LGD district codes file: %s. Run ingestion first.", LGD_CODES_FILE)
        return

    # 2. Read input datasets
    log.info("Reading raw datasets...")
    df_lgd = pd.read_csv(LGD_CODES_FILE)
    df_conc = pd.read_excel(CONCORDANCE_RAW_FILE)

    log.info("Raw LGD list size: %d", len(df_lgd))
    log.info("Concordance list size: %d", len(df_conc))

    # Create mapping dictionaries from raw LGD file for checking
    lgd_codes = set(df_lgd["District Code"])
    lgd_census_2011_zero = set(df_lgd[df_lgd["Census 2011 Code"] == 0]["District Code"])

    # 3. Reconcile LGD codes and parent Census 2011 codes
    log.info("Processing crosswalk logic...")
    records = []
    
    for _, row in df_conc.iterrows():
        lgd_district_code = int(row["LGD District Code"])
        lgd_state_code = int(row["LGD State Code"])
        district_name = str(row["LGD District Name"]).strip()
        state_name = str(row["LGD State Name"]).strip()
        
        # Determine Census 2011 code (from concordance sheet, which maps post-2011 splits to parent)
        census_2011_code = row["Census 2011 Code"]
        census_2011_district_code = None
        notes_list = []
        
        if pd.notnull(census_2011_code):
            try:
                # Try to convert float/numeric strings to integer
                census_2011_district_code = int(float(str(census_2011_code).strip()))
            except ValueError:
                # Handle 'multiple' or other descriptive strings
                census_2011_district_code = None
                notes_list.append(f"parent_census_2011_code={census_2011_code}")
            
        comment = row["comment"]
        boundary_inherited = False


        # If it was 0 in raw LGD list, or has a comment, or is a new district not in the raw LGD list
        if lgd_district_code in lgd_census_2011_zero:
            boundary_inherited = True
            notes_list.append("boundary_inherited=True")
        elif lgd_district_code not in lgd_codes:
            boundary_inherited = True
            notes_list.append("boundary_inherited=True (new LGD district)")
        elif pd.notnull(comment) and any(word in str(comment).lower() for word in ["split", "created", "carved", "formed", "separated"]):
            boundary_inherited = True
            notes_list.append("boundary_inherited=True")

        if pd.notnull(comment):
            notes_list.append(str(comment).strip())
            
        notes = "; ".join(notes_list) if notes_list else ""
        
        records.append({
            "lgd_state_code": lgd_state_code,
            "lgd_district_code": lgd_district_code,
            "district_name": district_name,
            "state_name": state_name,
            "census_2011_district_code": census_2011_district_code,
            "notes": notes
        })

    # 4. Write output to district_master.csv
    df_master = pd.DataFrame(records)
    df_master = df_master[[
        "lgd_state_code", 
        "lgd_district_code", 
        "district_name", 
        "state_name", 
        "census_2011_district_code", 
        "notes"
    ]]

    df_master.to_csv(OUT_FILE, index=False)
    log.info("Successfully created reconciled district master: %s", OUT_FILE)
    log.info("Final master table size: %d rows", len(df_master))
    log.info("Bifurcated (boundary-inherited) districts: %d", df_master["notes"].str.contains("boundary_inherited").sum())


if __name__ == "__main__":
    main()
