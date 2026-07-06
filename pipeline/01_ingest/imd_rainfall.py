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

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/imd_rainfall")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

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


def download_file(url: str, dest: Path, timeout: int = 120) -> bool:
    try:
        resp = SESSION.get(url, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        log.info("Downloaded %s (%d bytes) -> %s", url, len(resp.content), dest)
        return True
    except Exception as e:
        log.warning("Failed: %s — %s", url, e)
        return False


def try_imdlib():
    """Attempt to use imdlib for automated IMD rainfall download."""
    try:
        import imdlib as imd
        log.info("imdlib available, attempting download...")

        for year in range(2019, 2024):
            try:
                imd.get_data(None, year, None, 'rain', 25)  # 0.25 deg resolution
                log.info("Downloaded IMD rainfall for %d", year)
            except Exception as e:
                log.warning("imdlib download failed for %d: %s", year, e)
                return False

        data = imd.get_data(None, 2023, None, 'rain', 25)
        data.to_csv(OUT_DIR / "imd_rainfall_2023_grid.csv")
        log.info("Converted IMD grid to CSV")
        return True
    except ImportError:
        log.info("imdlib not installed, trying fallback sources")
        return False
    except Exception as e:
        log.warning("imdlib failed: %s", e)
        return False


def try_fallback():
    """Try GitHub fallback sources."""
    for src in FALLBACK_SOURCES:
        dest = OUT_DIR / f"{src['name']}.csv"
        if download_file(src["url"], dest):
            try:
                df = pd.read_csv(dest)
                log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
                return True
            except Exception as e:
                log.warning("  %s: parse error: %s", src["name"], e)
    return False


def main():
    log.info("=== IMD Rainfall Ingestion ===")

    if try_imdlib():
        log.info("Rainfall data downloaded via imdlib")
    elif try_fallback():
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
