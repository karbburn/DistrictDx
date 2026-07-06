"""
Ingest Rural Health Statistics / Health Dynamics of India data.

Source: https://mohfw.gov.in (Ministry of Health & Family Welfare)
Alternative: Dataful.in, Kaggle cleaned versions
Accessed: 2026-07-06

Downloads district-level health infrastructure data:
  - Doctors per 1,000 population
  - PHC/CHC density
  - Hospital bed density
  - Ambulance/emergency facility counts (derived from facility listings)
Writes to data/raw/rural_health_stats/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/rural_health_stats")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

# Cleaned RHS data available on GitHub/Kaggle
SOURCES = [
    {
        "name": "rhs_health_facilities",
        "url": "https://raw.githubusercontent.com/datasets/india-health-system/main/data/health_facilities.csv",
        "desc": "Health facility counts by district (PHC, CHC, DH)",
    },
    {
        "name": "rhs_state_infrastructure",
        "url": "https://raw.githubusercontent.com/datasets/india-health-system/main/data/state_health_infrastructure.csv",
        "desc": "State-level health infrastructure (doctors, beds, facilities)",
    },
]

# Dataful/Kaggle cleaned RHS datasets
ALTERNATIVE_SOURCES = [
    {
        "name": "rhs_kaggle",
        "url": "https://raw.githubusercontent.com/suyashshringare/India-Rural-Health-Statistics/main/Rural_Health_Statistics.csv",
        "desc": "Rural Health Statistics cleaned (Kaggle mirror)",
    },
]


def download_file(url: str, dest: Path, timeout: int = 60) -> bool:
    try:
        resp = SESSION.get(url, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        log.info("Downloaded %s (%d bytes) -> %s", url, len(resp.content), dest)
        return True
    except Exception as e:
        log.warning("Failed: %s — %s", url, e)
        return False


def main():
    log.info("=== Rural Health Statistics Ingestion ===")

    downloaded = []
    for src in SOURCES + ALTERNATIVE_SOURCES:
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
            "No RHS files downloaded. Manual options:\n"
            "  1. Visit https://mohfw.gov.in → Health Statistics → Rural Health Statistics\n"
            "  2. Download 'Health Dynamics of India' publication PDFs/Excel\n"
            "  3. Or use Dataful.in cleaned RHS data\n"
            "  4. Or download from Kaggle: search 'India Rural Health Statistics'\n"
            "Place files in data/raw/rural_health_stats/."
        )
    else:
        log.info("Downloaded %d files to %s", len(downloaded), OUT_DIR)


if __name__ == "__main__":
    main()
