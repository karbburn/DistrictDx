"""
Ingest Local Government Directory (LGD) district master list.

Source: https://github.com/planemad/india-local-government-directory (stable mirror)
Official: https://lgdirectory.gov.in
Accessed: 2026-07-06

Downloads district, state, and sub-district LGD codes from the stable GitHub mirror.
Writes to data/raw/lgd_directory/.
"""

import logging
from pathlib import Path
import pandas as pd
import requests

from download import download_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# Stable GitHub mirror for LGD codes
SOURCES = [
    {
        "name": "lgd_district_codes",
        "url": "https://raw.githubusercontent.com/planemad/india-local-government-directory/main/administrative/2-district.csv",
        "desc": "District LGD codes with state and Census mapping",
    },
    {
        "name": "lgd_state_codes",
        "url": "https://raw.githubusercontent.com/planemad/india-local-government-directory/main/administrative/1-state.csv",
        "desc": "State LGD codes",
    },
    {
        "name": "lgd_subdistrict_codes",
        "url": "https://raw.githubusercontent.com/planemad/india-local-government-directory/main/administrative/3-subdistrict.csv",
        "desc": "Sub-district LGD codes",
    },
]


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "lgd_directory"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

    log.info("=== LGD Directory Ingestion ===")

    downloaded = []
    for src in SOURCES:
        dest = out_dir / f"{src['name']}.csv"
        if download_file(src["url"], dest, session=session):
            downloaded.append(src["name"])
            try:
                df = pd.read_csv(dest)
                log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
                log.info("  Columns: %s", list(df.columns))
            except Exception as e:
                log.warning("  %s: parse error: %s", src["name"], e)
                dest.unlink(missing_ok=True)

    if not downloaded:
        log.error("No LGD files downloaded.")
    else:
        log.info("Downloaded %d files to %s", len(downloaded), out_dir)


if __name__ == "__main__":
    main()
