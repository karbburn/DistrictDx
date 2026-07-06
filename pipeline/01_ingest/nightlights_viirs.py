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

from download import download_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# Pre-built dataset is already in the repo output/csv/
SOURCES = [
    {
        "name": "nightlights_district_panel",
        "url": "https://raw.githubusercontent.com/yashveeeeeeer/india-district-nightlights-viirs/main/output/csv/nightlights_district_panel.csv",
        "desc": "District-level VIIRS panel (641 districts × 13 years)",
    },
]


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "nightlights_viirs"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

    log.info("=== VIIRS Nightlights Ingestion ===")

    downloaded = []
    for src in SOURCES:
        dest = out_dir / f"{src['name']}.csv"
        if download_file(src["url"], dest, session=session):
            downloaded.append(src["name"])
            df = pd.read_csv(dest)
            log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
            if "year" in df.columns and "district_id" in df.columns:
                log.info("  Year range: %s to %s", df["year"].min(), df["year"].max())
                log.info("  Districts: %d", df["district_id"].nunique())
            else:
                log.warning("  Unexpected columns: %s", list(df.columns))

    if not downloaded:
        log.error(
            "No nightlights data downloaded.\n"
            "Visit https://github.com/yashveeeeeeer/india-district-nightlights-viirs\n"
            "Download output/csv/nightlights_district_panel.csv manually."
        )


if __name__ == "__main__":
    main()
