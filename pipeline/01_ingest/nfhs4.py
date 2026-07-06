"""
Ingest NFHS-4 (2015-16) district-level indicators for trend deltas.

Source: https://github.com/HindustanTimesLabs/nfhs-data (community-scraped)
Accessed: 2026-07-06

Downloads NFHS-4 district-level data to compute NFHS-4→NFHS-5 deltas
on chronic risk factors (diabetes, hypertension, obesity, tobacco).
Writes to data/raw/nfhs4/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

from download import download_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

NFHS4_BASE = "https://raw.githubusercontent.com/HindustanTimesLabs/nfhs-data/master"

SOURCES = [
    {
        "name": "nfhs4_district",
        "url": f"{NFHS4_BASE}/nfhs_district-wise.csv",
        "desc": "NFHS-4 district-level indicators (93 indicators)",
    },
    {
        "name": "nfhs4_states",
        "url": f"{NFHS4_BASE}/nfhs_state-wise.csv",
        "desc": "NFHS-4 state-level indicators (114 indicators)",
    },
    {
        "name": "nfhs4_indicator_lookup",
        "url": f"{NFHS4_BASE}/nfhs_indicator_lookup.csv",
        "desc": "Indicator name lookup table",
    },
]


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "nfhs4"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

    log.info("=== NFHS-4 Ingestion ===")

    downloaded = []
    for src in SOURCES:
        dest = out_dir / f"{src['name']}.csv"
        if download_file(src["url"], dest, session=session):
            downloaded.append(src["name"])
            try:
                df = pd.read_csv(dest)
                log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
            except Exception as e:
                log.warning("  %s: parse error: %s", src["name"], e)
                dest.unlink(missing_ok=True)

    if not downloaded:
        log.error(
            "No NFHS-4 files downloaded.\n"
            "Visit https://github.com/HindustanTimesLabs/nfhs-data and download manually."
        )
    else:
        log.info("Downloaded %d files to %s", len(downloaded), out_dir)


if __name__ == "__main__":
    main()
