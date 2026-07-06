"""
DistrictDx Pipeline Orchestrator
================================
Runs all pipeline stages sequentially to regenerate the final Attractiveness Index dataset
from raw inputs.

Pipeline Steps:
  1. Reconcile boundaries & build LGD master: pipeline/02_reconcile/build_district_master.py
  2. Cleaning & missing data imputation:    pipeline/03_clean/clean_and_impute.py
  3. Normalization, AHP weighting, composites: pipeline/04_construct/build_subdomain_composites.py
  4. Axis scores, MAI, 2x2 quadrants:       pipeline/05_index/build_index.py
  5. Proxy validation & sensitivity:         pipeline/06_validate/validate_proxies.py
  6. Future opportunity trend projections:    pipeline/07_future/build_future_index.py
  7. Final export (unified CSV and GeoJSON): pipeline/08_export/export_final.py
"""

import logging
import subprocess
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# Order of execution
PIPELINE_SCRIPTS = [
    "pipeline/02_reconcile/build_district_master.py",
    "pipeline/03_clean/clean_and_impute.py",
    "pipeline/04_construct/build_subdomain_composites.py",
    "pipeline/05_index/build_index.py",
    "pipeline/06_validate/validate_proxies.py",
    "pipeline/07_future/build_future_index.py",
    "pipeline/08_export/export_final.py"
]


def run_script(script_path: str) -> bool:
    """Executes a python script in a separate process."""
    log.info("=" * 80)
    log.info("Running stage: %s", script_path)
    log.info("=" * 80)
    
    try:
        # Run process synchronously, inherit stdout/stderr
        res = subprocess.run(
            [sys.executable, script_path],
            check=True
        )
        log.info("Stage COMPLETED successfully: %s", script_path)
        return True
    except subprocess.CalledProcessError as e:
        log.error("Stage FAILED with exit code %d: %s", e.returncode, script_path)
        return False
    except Exception as e:
        log.error("Stage FAILED with exception: %s — %s", script_path, e)
        return False


def main():
    log.info("=== Starting DistrictDx Unified Pipeline Orchestrator ===")
    
    # Check if we should run ingestion scripts
    # (Ingestion is omitted by default because government portals are often unstable/timed out,
    # but they can be run manually if needed. The pipeline runs from cached/raw files.)
    
    success = True
    failed_stage = None
    
    for script in PIPELINE_SCRIPTS:
        p = Path(script)
        if not p.exists():
            log.error("Pipeline script not found: %s", script)
            success = False
            failed_stage = script
            break
            
        stage_success = run_script(script)
        if not stage_success:
            success = False
            failed_stage = script
            break
            
    if success:
        log.info("=" * 80)
        log.info("DistrictDx Pipeline executed successfully!")
        log.info("All final files regenerated in outputs/ and copied to dashboard/public/data/")
        log.info("=" * 80)
        sys.exit(0)
    else:
        log.error("=" * 80)
        log.error("DistrictDx Pipeline halted! Failed stage: %s", failed_stage)
        log.error("=" * 80)
        sys.exit(1)


if __name__ == "__main__":
    main()
