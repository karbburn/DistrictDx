"""
Ingest PMGSY / GeoSadak road connectivity data.

Source: https://pmgsy.nic.in (Pradhan Mantri Gram Sadak Yojana)
Alternative: https://geosadak.in (GeoSadak Open Data Portal)
Accessed: 2026-07-06

Downloads district-level road connectivity metrics:
  - Habitation connectivity percentage
  - Road network length
  - Village connectivity index
Writes to data/raw/pmgsy/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/pmgsy")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

SOURCES = [
    {
        "name": "pmgsy_progress",
        "url": "https://raw.githubusercontent.com/india-in-data/roads-and-highways/main/data/pmgsy_district_progress.csv",
        "desc": "PMGSY district-level road construction progress",
    },
    {
        "name": "geosadak_roads",
        "url": "https://raw.githubusercontent.com/india-in-data/roads-and-highways/main/data/district_road_network.csv",
        "desc": "District-level road network statistics",
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


def try_pmgsy_portal():
    """Try PMGSY MIS for progress reports."""
    try:
        # PMGSY has a reports section — try to get district-wise progress
        urls = [
            "https://pmgsy.nic.in/pmgsy1/districtwiseperformance.php",
            "https://pmgsy.nic.in/DistrictWise/DistrictWiseProgress.aspx",
        ]
        for url in urls:
            resp = SESSION.get(url, timeout=30)
            if resp.status_code == 200:
                dest = OUT_DIR / "pmgsy_portal_response.html"
                dest.write_text(resp.text, encoding="utf-8")
                log.info("Got PMGSY portal response from %s", url)

                from bs4 import BeautifulSoup
                soup = BeautifulSoup(resp.text, "lxml")
                tables = soup.find_all("table")
                if tables:
                    dfs = pd.read_html(str(tables[0]))
                    if dfs:
                        dfs[0].to_csv(OUT_DIR / "pmgsy_district_progress.csv", index=False)
                        log.info("Extracted table: %d rows", len(dfs[0]))
                        return True
    except Exception as e:
        log.debug("PMGSY portal failed: %s", e)
    return False


def main():
    log.info("=== PMGSY / Road Connectivity Ingestion ===")

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
        if try_pmgsy_portal():
            downloaded.append("pmgsy_portal")

    if not downloaded:
        log.error(
            "No PMGSY/road connectivity files downloaded. Manual options:\n"
            "  1. Visit https://pmgsy.nic.in → Reports → District-wise progress\n"
            "  2. Or visit https://geosadak.in for road network shapefiles\n"
            "  3. Or use Kaggle 'India roads dataset' for cleaned road data\n"
            "Place files in data/raw/pmgsy/."
        )
    else:
        log.info("Downloaded %d files to %s", len(downloaded), OUT_DIR)


if __name__ == "__main__":
    main()
