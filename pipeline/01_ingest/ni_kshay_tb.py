"""
Ingest TB notification data from Ni-kshay Reports portal.

Source: https://reports.nikshay.in (Ni-kshay TB Reporting System)
Accessed: 2026-07-06

Downloads district-level TB notification counts (notifications = new cases reported).
Used as infectious disease burden proxy for acute demand potential.
Writes to data/raw/ni_kshay_tb/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/ni_kshay_tb")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})

BASE_URL = "https://reports.nikshay.in"


def get_state_list():
    """Fetch available states from the Ni-kshay portal."""
    try:
        resp = SESSION.get(f"{BASE_URL}/Dashboard/FilterData", timeout=30)
        resp.raise_for_status()
        # Portal may use AJAX — try common API patterns
        return resp.json() if resp.headers.get("content-type", "").startswith("application/json") else None
    except Exception as e:
        log.warning("Could not fetch state list: %s", e)
        return None


def download_district_tb_data():
    """Try to download district-level TB notification data."""
    # Ni-kshay has a reports section that allows filtering by state/district
    # The exact URL pattern may vary — try common endpoints
    report_urls = [
        f"{BASE_URL}/Reports/TBNotificationDistrictWise",
        f"{BASE_URL}/Dashboard/DistrictWiseData",
        f"{BASE_URL}/Report/GetDistrictData",
    ]

    for url in report_urls:
        try:
            resp = SESSION.get(url, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                dest = OUT_DIR / "ni_kshay_response.html"
                dest.write_text(resp.text, encoding="utf-8")
                log.info("Got response from %s (%d bytes)", url, len(resp.content))

                if "application/json" in resp.headers.get("content-type", ""):
                    json_dest = OUT_DIR / "ni_kshay_district_tb.json"
                    json_dest.write_bytes(resp.content)
                    log.info("Saved JSON response")
                    return True

                soup = BeautifulSoup(resp.text, "lxml")
                tables = soup.find_all("table")
                if tables:
                    dfs = pd.read_html(str(tables[0]))
                    if dfs:
                        dfs[0].to_csv(OUT_DIR / "ni_kshay_district_tb.csv", index=False)
                        log.info("Extracted table: %d rows", len(dfs[0]))
                        return True
        except Exception as e:
            log.debug("  %s failed: %s", url, e)
            continue

    return False


def try_nikshay_api():
    """Try Ni-kshay's internal API endpoints."""
    api_endpoints = [
        f"{BASE_URL}/api/Dashboard/GetStateWiseData",
        f"{BASE_URL}/api/Reports/GetDistrictNotifications",
    ]

    for url in api_endpoints:
        try:
            resp = SESSION.get(url, timeout=30)
            if resp.status_code == 200 and "json" in resp.headers.get("content-type", ""):
                dest = OUT_DIR / "ni_kshay_api_data.json"
                dest.write_bytes(resp.content)
                log.info("Got API data from %s", url)
                return True
        except Exception as e:
            log.debug("  API %s failed: %s", url, e)
    return False


def main():
    log.info("=== Ni-kshay TB Ingestion ===")

    if try_nikshay_api():
        log.info("API data downloaded")
    elif download_district_tb_data():
        log.info("District TB data downloaded")
    else:
        log.error(
            "Could not automatically download Ni-kshay TB data.\n"
            "Manual steps:\n"
            "  1. Visit https://reports.nikshay.in\n"
            "  2. Navigate to TB Notification reports\n"
            "  3. Filter by each state, download district-level Excel\n"
            "  4. Place files in data/raw/ni_kshay_tb/\n"
            "Alternative: Use TB India annual reports from nikshay.in for state-level data."
        )


if __name__ == "__main__":
    main()
