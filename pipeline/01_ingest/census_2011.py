"""
Ingest Census 2011 district-level data.

Source: https://github.com/pigshell/india-census-2011 (scraped from censusindia.gov.in)
Kaggle mirror: https://www.kaggle.com/datasets/danofer/india-census
Accessed: 2026-07-06

Downloads:
  - pca-total.csv (Primary Census Abstract — pop, density, sex ratio, literacy, urbanization)
  - hlpca-total.csv (Housing + age data — for 60+ population share)
Writes raw untouched files to data/raw/census_2011/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

from download import download_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

SOURCES = [
    {
        "name": "census2011_pca_total",
        "url": "https://raw.githubusercontent.com/pigshell/india-census-2011/master/pca-total.csv",
        "desc": "PCA total (rural+urban) — pop, density, sex ratio, literacy by district",
    },
    {
        "name": "census2011_hlpca_total",
        "url": "https://raw.githubusercontent.com/pigshell/india-census-2011/master/hlpca-total.csv",
        "desc": "Houselisting PCA total — housing + age data by district",
    },
    {
        "name": "census2011_pca_colnames",
        "url": "https://raw.githubusercontent.com/pigshell/india-census-2011/master/pca-colnames.csv",
        "desc": "PCA column name mapping (code → readable name)",
    },
]


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "census_2011"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

    log.info("=== Census 2011 Ingestion ===")

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
        log.error("No Census 2011 files downloaded.")
    else:
        log.info("Downloaded %d files to %s", len(downloaded), out_dir)


if __name__ == "__main__":
    main()
