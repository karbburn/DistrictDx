"""
Ingest Census 2001 district-level data (for 2001→2011 growth rates).

Source: https://censusindia.gov.in (Census 2001)
Accessed: 2026-07-06

Downloads district-level population and urbanization from Census 2001.
Used later to compute urbanization growth rate and population growth rate deltas.
Writes raw untouched files to data/raw/census_2001/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/census_2001")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

SOURCES = [
    {
        "name": "census2001_population",
        "url": "https://raw.githubusercontent.com/datasets/india-census/master/data/population-census-2001.csv",
        "desc": "District population Census 2001",
    },
    {
        "name": "census2001_district",
        "url": "https://raw.githubusercontent.com/datasets/india-census/master/data/districts-2001.csv",
        "desc": "District-level Census 2001 data",
    },
]


def download_file(url: str, dest: Path, timeout: int = 60) -> bool:
    try:
        resp = SESSION.get(url, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        log.info("Downloaded %s (%d bytes) -> %s", url.split("/")[-1], len(resp.content), dest.name)
        return True
    except Exception as e:
        log.warning("Failed: %s — %s", url.split("/")[-1], e)
        return False


def main():
    log.info("=== Census 2001 Ingestion ===")

    downloaded = []
    for src in SOURCES:
        dest = OUT_DIR / f"{src['name']}.csv"
        if download_file(src["url"], dest):
            downloaded.append(src["name"])
            try:
                df = pd.read_csv(dest)
                log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
            except Exception as e:
                log.warning("  %s: parse error: %s", src["name"], e)

    if not downloaded:
        log.error(
            "No Census 2001 files downloaded.\n"
            "Manual: visit https://censusindia.gov.in → Census 2001 → District tables.\n"
            "Place Excel files in data/raw/census_2001/."
        )
    else:
        log.info("Downloaded %d files to %s", len(downloaded), OUT_DIR)


if __name__ == "__main__":
    main()
