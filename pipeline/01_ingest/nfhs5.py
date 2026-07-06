"""
Ingest NFHS-5 (2019-21) district-level indicators.

Source: https://github.com/pratapvardhan/NFHS-5 (community-scraped from official PDFs)
Official: https://rchiips.org/nfhs (SSL expired — using community mirror)
Accessed: 2026-07-06

Downloads:
  - NFHS-5-Districts.csv (341 districts, 131 indicators)
  - NFHS-5-States.csv (28 states + 8 UTs)
  - Individual state-wise district CSVs
Covers: chronic risk factors, WASH, child morbidity, health expenditure.
Writes to data/raw/nfhs5/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

from download import download_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

NFHS5_BASE = "https://raw.githubusercontent.com/pratapvardhan/NFHS-5/master"

SOURCES = [
    {"name": "NFHS-5-Districts", "url": f"{NFHS5_BASE}/NFHS-5-Districts.csv"},
    {"name": "NFHS-5-States", "url": f"{NFHS5_BASE}/NFHS-5-States.csv"},
]

# Individual state files — these have richer district-level detail
STATE_FILES = [
    "NFHS-5-AN-Andaman-and-Nicobar-Island.csv",
    "NFHS-5-AP-Andhra-Pradesh.csv",
    "NFHS-5-AR-Arunachal-Pradesh.csv",
    "NFHS-5-AS-Assam.csv",
    "NFHS-5-BR-Bihar.csv",
    "NFHS-5-CH-Chandigarh.csv",
    "NFHS-5-CT-Chhattisgarh.csv",
    "NFHS-5-DD-Dadra-Nagar-Haveli-and-Daman-Diu.csv",
    "NFHS-5-DL-Delhi.csv",
    "NFHS-5-GA-Goa.csv",
    "NFHS-5-GJ-Gujarat.csv",
    "NFHS-5-HP-Himachal-Pradesh.csv",
    "NFHS-5-HR-Haryana.csv",
    "NFHS-5-JH-Jharkhand.csv",
    "NFHS-5-JK-Jammu-and-Kashmir.csv",
    "NFHS-5-JL-Jammu-and-Kashmir.csv",
    "NFHS-5-KA-Karnataka.csv",
    "NFHS-5-KL-Kerala.csv",
    "NFHS-5-LA-Ladakh.csv",
    "NFHS-5-LH-Ladakh.csv",
    "NFHS-5-MP-Madhya-Pradesh.csv",
    "NFHS-5-MH-Maharashtra.csv",
    "NFHS-5-ML-Meghalaya.csv",
    "NFHS-5-MN-Manipur.csv",
    "NFHS-5-MZ-Mizoram.csv",
    "NFHS-5-NL-Nagaland.csv",
    "NFHS-5-OD-Odisha.csv",
    "NFHS-5-PB-Punjab.csv",
    "NFHS-5-PY-Puducherry.csv",
    "NFHS-5-RJ-Rajasthan.csv",
    "NFHS-5-SK-Sikkim.csv",
    "NFHS-5-TG-Telangana.csv",
    "NFHS-5-TN-Tamil-Nadu.csv",
    "NFHS-5-TR-Tripura.csv",
    "NFHS-5-UP-Uttar-Pradesh.csv",
    "NFHS-5-UT-Uttarakhand.csv",
    "NFHS-5-WB-West-Bengal.csv",
]


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "nfhs5"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

    log.info("=== NFHS-5 Ingestion ===")

    for src in SOURCES:
        dest = out_dir / f"{src['name']}.csv"
        if download_file(src["url"], dest, session=session):
            df = pd.read_csv(dest)
            log.info("  %s: %d rows, %d cols", src["name"], len(df), len(df.columns))

    state_downloaded = 0
    for fname in STATE_FILES:
        url = f"{NFHS5_BASE}/{fname}"
        dest = out_dir / fname
        if download_file(url, dest, session=session):
            state_downloaded += 1

    log.info("Downloaded %d state files", state_downloaded)

    files = list(out_dir.glob("*.csv"))
    log.info("Total files in %s: %d", out_dir, len(files))
    if not files:
        log.error(
            "No NFHS-5 files downloaded.\n"
            "Visit https://github.com/pratapvardhan/NFHS-5 and download CSVs manually."
        )


if __name__ == "__main__":
    main()
