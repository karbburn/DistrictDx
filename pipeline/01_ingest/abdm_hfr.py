"""
Ingest ABDM Health Facility Registry (HFR) data.

Source: https://facility.abdm.gov.in (Ayushman Bharat Digital Mission)
Accessed: 2026-07-06

Downloads facility counts per district as proxy for:
  - Diagnostic lab / pathology infrastructure (Realizability — Chronic)
  - Hospital/clinic density (Realizability — shared)
  - Chronic-care OPD availability (Realizability — Chronic)

The HFR provides a public listing of registered health facilities by district.
Writes to data/raw/abdm_hfr/.
"""

import json
import logging
import time
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/abdm_hfr")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/html, */*",
})

BASE_URL = "https://facility.abdm.gov.in"


def try_hfr_api():
    """Try HFR's internal API for facility search."""
    # HFR has a search API that returns facility listings
    # We can search by state and get district-level aggregations
    api_endpoints = [
        f"{BASE_URL}/api/v2/facility/search",
        f"{BASE_URL}/api/facility/searchByLocation",
        f"{BASE_URL}/hfr/facility/search",
    ]

    try:
        resp = SESSION.get(f"{BASE_URL}", timeout=30)
        if resp.status_code == 200:
            dest = OUT_DIR / "hfr_main_page.html"
            dest.write_text(resp.text, encoding="utf-8")
            log.info("Saved HFR main page")

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")
            scripts = soup.find_all("script", src=True)
            api_refs = [s["src"] for s in scripts if "api" in s.get("src", "").lower()]
            if api_refs:
                log.info("Found API script references: %s", api_refs[:5])
    except Exception as e:
        log.debug("HFR main page failed: %s", e)

    for url in api_endpoints:
        try:
            resp = SESSION.get(url, timeout=30)
            if resp.status_code == 200:
                dest = OUT_DIR / "hfr_api_response.json"
                dest.write_bytes(resp.content)
                log.info("Got API response from %s", url)
                return True
        except Exception as e:
            log.debug("  %s failed: %s", url, e)

    return False


def try_hfr_web_scrape():
    """Scrape facility listings from HFR web pages."""
    try:
        resp = SESSION.get(f"{BASE_URL}/facility/search", timeout=30)
        if resp.status_code == 200:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")

            selects = soup.find_all("select")
            tables = soup.find_all("table")

            if selects:
                log.info("Found %d select elements (state/district filters)", len(selects))
                for select in selects:
                    options = select.find_all("option")
                    if len(options) > 10:
                        states = [(o.get("value", ""), o.get_text(strip=True)) for o in options[1:]]
                        pd.DataFrame(states, columns=["code", "state_name"]).to_csv(
                            OUT_DIR / "hfr_state_list.csv", index=False
                        )
                        log.info("Extracted %d states from dropdown", len(states))

            if tables:
                log.info("Found %d tables", len(tables))

            dest = OUT_DIR / "hfr_search_page.html"
            dest.write_text(resp.text, encoding="utf-8")
            return True
    except Exception as e:
        log.debug("HFR scrape failed: %s", e)
    return False


def try_hfr_bulk_download():
    """Try to find bulk facility data downloads."""
    download_urls = [
        f"{BASE_URL}/download/facility-data",
        f"{BASE_URL}/api/v2/facility/bulk",
        f"{BASE_URL}/hfr/reports",
    ]

    for url in download_urls:
        try:
            resp = SESSION.get(url, timeout=30, allow_redirects=True)
            if resp.status_code == 200 and len(resp.content) > 1000:
                content_type = resp.headers.get("content-type", "")
                ext = ".json" if "json" in content_type else ".csv" if "csv" in content_type else ".html"
                dest = OUT_DIR / f"hfr_bulk{ext}"
                dest.write_bytes(resp.content)
                log.info("Got bulk data from %s (%d bytes)", url, len(resp.content))
                return True
        except Exception as e:
            log.debug("  %s failed: %s", url, e)
    return False


def main():
    log.info("=== ABDM Health Facility Registry Ingestion ===")

    if try_hfr_api():
        log.info("HFR API data downloaded")
    elif try_hfr_bulk_download():
        log.info("HFR bulk data downloaded")
    elif try_hfr_web_scrape():
        log.info("HFR web data scraped")
    else:
        log.error(
            "Could not automatically download HFR data. Manual steps:\n"
            "  1. Visit https://facility.abdm.gov.in\n"
            "  2. Use the search/browse feature to list facilities by state/district\n"
            "  3. Export/download facility listings\n"
            "  4. Place files in data/raw/abdm_hfr/\n"
            "Key: we need diagnostic labs, hospitals, OPD counts per district."
        )


if __name__ == "__main__":
    main()
