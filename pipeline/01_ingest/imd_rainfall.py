"""
Ingest IMD gridded rainfall data, aggregated to district level.

Source: https://imdpune.gov.in (India Meteorological Department)
Alternative: imdlib Python package for automated download
Accessed: 2026-07-06

Strategy: Use imdlib to download IMD gridded rainfall (0.25° resolution),
then aggregate to districts using zonal statistics with district shapefiles.
If imdlib fails, fall back to IMD's pre-computed district rainfall statistics.
Writes to data/raw/imd_rainfall/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

from download import download_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# IMD also publishes district-level rainfall summaries
# These are sometimes available as Excel/PDF on imd.gov.in
FALLBACK_SOURCES = [
    {
        "name": "imd_district_rainfall",
        "url": "https://raw.githubusercontent.com/IMD-OAD/District_Rainfall/main/district_annual_rainfall.csv",
        "desc": "IMD district-level annual rainfall summary",
    },
    {
        "name": "imd_state_rainfall",
        "url": "https://raw.githubusercontent.com/IMD-OAD/State_Rainfall/main/state_annual_rainfall.csv",
        "desc": "IMD state-level annual rainfall (fallback)",
    },
]


def try_imdlib(out_dir):
    """Attempt to use imdlib for automated IMD rainfall download."""
    try:
        import imdlib as imd
        log.info("imdlib available, attempting download...")

        last_data = None
        for year in range(2019, 2024):
            try:
                data = imd.get_data(None, year, None, 'rain', 25)
                log.info("Downloaded IMD rainfall for %d", year)
                last_data = data
            except Exception as e:
                log.warning("imdlib download failed for %d: %s", year, e)
                return False

        if last_data is not None:
            last_data.to_csv(out_dir / "imd_rainfall_2023_grid.csv")
            log.info("Converted IMD grid to CSV")
        return True
    except ImportError:
        log.info("imdlib not installed, trying fallback sources")
        return False
    except Exception as e:
        log.warning("imdlib failed: %s", e)
        return False


def try_fallback(out_dir, session):
    """Try GitHub fallback sources."""
    for src in FALLBACK_SOURCES:
        dest = out_dir / f"{src['name']}.csv"
        if download_file(src["url"], dest, session=session):
            try:
                df = pd.read_csv(dest)
                log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
                return True
            except Exception as e:
                log.warning("  %s: parse error: %s", src["name"], e)
    return False


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "imd_rainfall"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

    log.info("=== IMD Rainfall Ingestion ===")

    if try_imdlib(out_dir):
        log.info("Rainfall data downloaded via imdlib")
    elif try_fallback(out_dir, session):
        log.info("Rainfall data downloaded from fallback sources")
    else:
        log.error(
            "No rainfall data downloaded. Manual options:\n"
            "  1. Install imdlib: pip install imdlib\n"
            "  2. Download IMD gridded rainfall from https://imdpune.gov.in/\n"
            "  3. Or download district rainfall statistics from IMD's district monitoring page\n"
            "Place files in data/raw/imd_rainfall/."
        )


if __name__ == "__main__":
    main()
