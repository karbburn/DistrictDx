"""
Ingest Local Government Directory (LGD) district master list.

Source: https://ckandev.indiadataportal.com (India Data Portal — LGD Codes)
Official: https://lgdirectory.gov.in
Accessed: 2026-07-06

Downloads district LGD codes from the India Data Portal open data API.
Writes to data/raw/lgd_directory/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/lgd_directory")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

# India Data Portal direct CSV downloads for LGD codes
SOURCES = [
    {
        "name": "lgd_district_codes",
        "url": "https://ckandev.indiadataportal.com/dataset/a7419751-ac37-46ad-b938-638cda7b7b60/resource/19df978a-675e-4ff5-8015-d0e1de447319/download/district-lgd-codes.csv",
        "desc": "District LGD codes with state mapping",
    },
    {
        "name": "lgd_state_codes",
        "url": "https://ckandev.indiadataportal.com/dataset/a7419751-ac37-46ad-b938-638cda7b7b60/resource/19df978a-675e-4ff5-8015-d0e1de447319/download/state-lgd-codes.csv",
        "desc": "State LGD codes",
    },
    {
        "name": "lgd_subdistrict_codes",
        "url": "https://ckandev.indiadataportal.com/dataset/a7419751-ac37-46ad-b938-638cda7b7b60/resource/19df978a-675e-4ff5-8015-d0e1de447319/download/sub-district-lgd-codes.csv",
        "desc": "Sub-district LGD codes",
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
    log.info("=== LGD Directory Ingestion ===")

    downloaded = []
    for src in SOURCES:
        dest = OUT_DIR / f"{src['name']}.csv"
        if download_file(src["url"], dest):
            downloaded.append(src["name"])
            try:
                df = pd.read_csv(dest)
                log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))
                log.info("  Columns: %s", list(df.columns))
            except Exception as e:
                log.warning("  %s: parse error: %s", src["name"], e)

    if not downloaded:
        log.error("No LGD files downloaded.")
    else:
        log.info("Downloaded %d files to %s", len(downloaded), OUT_DIR)


if __name__ == "__main__":
    main()
