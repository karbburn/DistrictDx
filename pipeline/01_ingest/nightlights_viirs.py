"""
Ingest VIIRS nightlights district-level data (2012–2024).

Source: https://github.com/yashveeeeeeer/india-district-nightlights-viirs
Accessed: 2026-07-06

Downloads pre-computed district-aggregated VIIRS annual panel:
  641 districts × 13 years (2012-2024), mean/median/sum/std radiance.
Used as income proxy and for nightlight growth rate.
Writes to data/raw/nightlights_viirs/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/nightlights_viirs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

# Pre-built dataset is already in the repo output/csv/
SOURCES = [
    {
        "name": "nightlights_district_panel",
        "url": "https://raw.githubusercontent.com/yashveeeeeeer/india-district-nightlights-viirs/main/output/csv/nightlights_district_panel.csv",
        "desc": "District-level VIIRS panel (641 districts × 13 years)",
    },
]


def download_file(url: str, dest: Path, timeout: int = 120) -> bool:
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
    log.info("=== VIIRS Nightlights Ingestion ===")

    for src in SOURCES:
        dest = OUT_DIR / f"{src['name']}.csv"
        if download_file(src["url"], dest):
            df = pd.read_csv(dest)
            log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
            log.info("  Columns: %s", list(df.columns))
            log.info("  Year range: %s to %s", df["year"].min(), df["year"].max())
            log.info("  Districts: %d", df["district_id"].nunique())
        else:
            log.error(
                "No nightlights data downloaded.\n"
                "Visit https://github.com/yashveeeeeeer/india-district-nightlights-viirs\n"
                "Download output/csv/nightlights_district_panel.csv manually."
            )


if __name__ == "__main__":
    main()
