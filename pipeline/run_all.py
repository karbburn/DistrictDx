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

Note: Ingestion scripts (pipeline/01_ingest/) are excluded because government portals
are often unstable. Raw data is committed to the repository. Run ingestion separately
if fresh downloads are needed.
"""

import logging
import subprocess
import sys
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

PIPELINE_SCRIPTS = [
    "pipeline/02_reconcile/build_district_master.py",
    "pipeline/03_clean/clean_and_impute.py",
    "pipeline/04_construct/build_subdomain_composites.py",
    "pipeline/05_index/build_index.py",
    "pipeline/06_validate/validate_proxies.py",
    "pipeline/07_future/build_future_index.py",
    "pipeline/08_export/export_final.py",
]


def run_script(script_path: str) -> bool:
    """Executes a python script in a separate process."""
    log.info("=" * 80)
    log.info("Running: %s", script_path)
    log.info("=" * 80)

    try:
        res = subprocess.run(
            [sys.executable, script_path],
            check=True,
        )
        log.info("OK: %s", script_path)
        return True
    except subprocess.CalledProcessError as e:
        log.error("FAILED (exit %d): %s", e.returncode, script_path)
        return False
    except Exception as e:
        log.error("FAILED: %s — %s", script_path, e)
        return False


def main():
    log.info("=== DistrictDx Pipeline ===")

    start = time.time()
    success = True
    failed_stage = None
    timings = []

    for script in PIPELINE_SCRIPTS:
        p = Path(script)
        if not p.exists():
            log.error("Script not found: %s", script)
            success = False
            failed_stage = script
            break

        t0 = time.time()
        stage_ok = run_script(script)
        elapsed = time.time() - t0
        timings.append((script, elapsed))

        if not stage_ok:
            success = False
            failed_stage = script
            break

    total = time.time() - start

    log.info("=" * 80)
    log.info("Pipeline %s", "completed" if success else "halted")
    if failed_stage:
        log.info("Failed stage: %s", failed_stage)
    log.info("Total time: %.1fs", total)
    for script, t in timings:
        log.info("  %.1fs  %s", t, script)
    log.info("=" * 80)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
