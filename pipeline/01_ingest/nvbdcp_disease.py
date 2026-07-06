"""
Ingest NVBDCP malaria/dengue state-level data.

Source: https://nvbdcp.gov.in (National Vector Borne Disease Control Programme)
Alternative: https://idsp.nic.in (Integrated Disease Surveillance Programme)
Accessed: 2026-07-06

NOTE: District-level malaria/dengue data is NOT publicly downloadable.
Public reports are state-level aggregates. We accept state-level fallback
with granularity_flag = "state_level_proxy" per user decision.

Writes to data/raw/nvbdcp_disease/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/nvbdcp_disease")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})

BASE_URLS = [
    "https://nvbdcp.gov.in",
    "https://idsp.nic.in",
]


def try_nvbdcp():
    """Try NVBDCP portal for malaria/dengue state-level reports."""
    for base in BASE_URLS:
        try:
            resp = SESSION.get(base, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")

                links = soup.find_all("a", href=True)
                report_links = [
                    a for a in links
                    if any(kw in a.get("href", "").lower() or kw in a.get_text().lower()
                           for kw in ["malaria", "dengue", "report", "pdf", "state", "district"])
                ]

                if report_links:
                    dest = OUT_DIR / "nvbdcp_report_links.csv"
                    pd.DataFrame([{
                        "text": a.get_text(strip=True),
                        "href": a["href"],
                        "source": base,
                    } for a in report_links[:50]]).to_csv(dest, index=False)
                    log.info("Found %d report links from %s", len(report_links), base)

                tables = soup.find_all("table")
                if tables:
                    for i, table in enumerate(tables[:3]):
                        try:
                            dfs = pd.read_html(str(table))
                            if dfs and len(dfs[0]) > 5:
                                dfs[0].to_csv(OUT_DIR / f"nvbdcp_table_{i}.csv", index=False)
                                log.info("Extracted table %d: %d rows", i, len(dfs[0]))
                        except Exception:
                            continue

                dest = OUT_DIR / f"nvbdcp_{base.split('//')[1].replace('/', '_')}.html"
                dest.write_text(resp.text, encoding="utf-8")
                return True
        except Exception as e:
            log.warning("Failed to access %s: %s", base, e)
    return False


def try_idsp_surveillance():
    """Try IDSP portal for disease surveillance data."""
    try:
        resp = SESSION.get("https://idsp.nic.in/Index4.php", timeout=30)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            links = soup.find_all("a", href=True)
            data_links = [a for a in links if "data" in a.get("href", "").lower()
                          or "report" in a.get("href", "").lower()]
            log.info("IDSP: found %d data/report links", len(data_links))
            if data_links:
                return True
    except Exception as e:
        log.debug("IDSP failed: %s", e)
    return False


def main():
    log.info("=== NVBDCP Disease Ingestion (State-Level) ===")
    log.info("NOTE: District-level malaria/dengue not publicly available.")
    log.info("Accepting state-level fallback with granularity_flag = state_level_proxy")

    if try_nvbdcp():
        log.info("NVBDCP data/links saved")
    elif try_idsp_surveillance():
        log.info("IDSP data saved")
    else:
        log.error(
            "Could not access NVBDCP/IDSP portals. Manual steps:\n"
            "  1. Visit https://nvbdcp.gov.in → State-wise malaria/dengue data\n"
            "  2. Visit https://idsp.nic.in → Weekly Outbreak Reports\n"
            "  3. Download state-level tables and place in data/raw/nvbdcp_disease/\n"
            "  4. Include 'granularity_flag = state_level_proxy' column in output"
        )


if __name__ == "__main__":
    main()
