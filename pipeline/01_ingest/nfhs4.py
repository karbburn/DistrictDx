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

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/nfhs4")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

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
    log.info("=== NFHS-4 Ingestion ===")

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
            "No NFHS-4 files downloaded.\n"
            "Visit https://github.com/HindustanTimesLabs/nfhs-data and download manually."
        )
    else:
        log.info("Downloaded %d files to %s", len(downloaded), OUT_DIR)


if __name__ == "__main__":
    main()
