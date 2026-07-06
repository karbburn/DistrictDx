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

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/census_2011")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

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
    log.info("=== Census 2011 Ingestion ===")

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
        log.error("No Census 2011 files downloaded.")
    else:
        log.info("Downloaded %d files to %s", len(downloaded), OUT_DIR)


if __name__ == "__main__":
    main()
