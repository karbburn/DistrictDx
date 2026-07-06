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

from download import download_file

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

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


def try_pmgsy_portal(out_dir, session):
    """Try PMGSY MIS for progress reports."""
    if BeautifulSoup is None:
        return False
    try:
        urls = [
            "https://pmgsy.nic.in/pmgsy1/districtwiseperformance.php",
            "https://pmgsy.nic.in/DistrictWise/DistrictWiseProgress.aspx",
        ]
        for url in urls:
            resp = session.get(url, timeout=30)
            if resp.status_code == 200:
                dest = out_dir / "pmgsy_portal_response.html"
                dest.write_text(resp.text, encoding="utf-8")
                log.info("Got PMGSY portal response from %s", url)

                soup = BeautifulSoup(resp.text, "lxml")
                tables = soup.find_all("table")
                if tables:
                    dfs = pd.read_html(str(tables[0]))
                    if dfs:
                        dfs[0].to_csv(out_dir / "pmgsy_district_progress.csv", index=False)
                        log.info("Extracted table: %d rows", len(dfs[0]))
                        return True
    except Exception as e:
        log.debug("PMGSY portal failed: %s", e)
    return False


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "pmgsy"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (research pipeline)"})

    log.info("=== PMGSY / Road Connectivity Ingestion ===")

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
        if try_pmgsy_portal(out_dir, session):
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
        log.info("Downloaded %d files to %s", len(downloaded), out_dir)


if __name__ == "__main__":
    main()
