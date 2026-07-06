"""
Ingest Jan Aushadhi Kendra counts per district.

Source: https://janaushadhi.gov.in (Pradhan Bhartiya Janaushadhi Pariyojana)
Accessed: 2026-07-06

Scrapes the "Locate Kendra" store locator to count Jan Aushadhi pharmacies
per district. Strong differentiator variable — genuinely underused by other teams.
Writes to data/raw/jan_aushadhi/.
"""

import json
import logging
import os
import time
from pathlib import Path

import pandas as pd
import requests

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = "https://janaushadhi.gov.in"


def get_state_list(session):
    """Get list of states from the store locator."""
    if BeautifulSoup is None:
        return []
    try:
        resp = session.get(f"{BASE_URL}/Locator.aspx", timeout=30)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            state_select = soup.find("select", {"id": lambda x: x and "state" in x.lower()})
            if state_select:
                options = state_select.find_all("option")
                states = [(o.get("value", ""), o.get_text(strip=True)) for o in options if o.get("value")]
                log.info("Found %d states", len(states))
                return states
    except Exception as e:
        log.debug("State list fetch failed: %s", e)
    return []


def scrape_kendras_by_state(state_name, state_code, session):
    """Scrape Jan Aushadhi kendra count for a state/district."""
    if BeautifulSoup is None:
        return None
    try:
        resp = session.get(
            f"{BASE_URL}/Locator.aspx",
            params={"state": state_code},
            timeout=30,
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            tables = soup.find_all("table")
            if tables:
                dfs = pd.read_html(str(tables[0]))
                if dfs:
                    return dfs[0]
    except Exception as e:
        log.debug("Scrape failed for %s: %s", state_name, e)
    return None


def try_api_endpoints(out_dir, session):
    """Try internal API endpoints for store search."""
    api_urls = [
        f"{BASE_URL}/api/Store/GetStoreList",
        f"{BASE_URL}/api/Locator/SearchStores",
        f"{BASE_URL}/Handler/StoreLocator.ashx",
        f"{BASE_URL}/StoreLocator.aspx/GetStores",
    ]

    for url in api_urls:
        try:
            resp = session.post(
                url,
                json={"stateCode": "", "districtName": ""},
                timeout=30,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "json" in content_type:
                    dest = out_dir / "jan_aushadhi_api_data.json"
                    dest.write_bytes(resp.content)
                    log.info("Got API data from %s", url)
                    return True
        except Exception as e:
            log.debug("  %s failed: %s", url, e)

        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 200 and len(resp.content) > 500:
                dest = out_dir / "jan_aushadhi_api_data.json"
                dest.write_bytes(resp.content)
                log.info("Got data from %s", url)
                return True
        except Exception as e:
            log.debug("  GET %s failed: %s", url, e)

    return False


def try_bulk_listing(out_dir, session):
    """Try to find a bulk store listing."""
    bulk_urls = [
        f"{BASE_URL}/all-stores",
        f"{BASE_URL}/StoreList",
        f"{BASE_URL}/download/stores",
    ]

    for url in bulk_urls:
        try:
            resp = session.get(url, timeout=30, allow_redirects=True)
            if resp.status_code == 200 and len(resp.content) > 1000:
                content_type = resp.headers.get("content-type", "")
                if "json" in content_type:
                    dest = out_dir / "jan_aushadhi_stores.json"
                elif "csv" in content_type or "excel" in content_type:
                    dest = out_dir / "jan_aushadhi_stores.csv"
                else:
                    dest = out_dir / "jan_aushadhi_stores.html"
                dest.write_bytes(resp.content)
                log.info("Got bulk listing from %s (%d bytes)", url, len(resp.content))
                return True
        except Exception as e:
            log.debug("  %s failed: %s", url, e)
    return False


def main():
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "jan_aushadhi"
    out_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
    })

    log.info("=== Jan Aushadhi Kendra Ingestion ===")

    if try_api_endpoints(out_dir, session):
        log.info("API data downloaded")
    elif try_bulk_listing(out_dir, session):
        log.info("Bulk listing downloaded")
    else:
        states = get_state_list(session)
        if states:
            all_kendras = []
            # ponytail: test with first 5 states, remove slice for full scrape
            max_states = int(os.environ.get("JAN_AUSHADHI_MAX_STATES", 5))
            for code, name in states[:max_states]:
                df = scrape_kendras_by_state(name, code, session)
                if df is not None:
                    df["state"] = name
                    all_kendras.append(df)
                time.sleep(1)

            if all_kendras:
                combined = pd.concat(all_kendras, ignore_index=True)
                combined.to_csv(out_dir / "jan_aushadhi_kendras_partial.csv", index=False)
                log.info("Scraped %d kendras from %d states (partial — first %d states)",
                         len(combined), len(all_kendras), max_states)
                return

        log.error(
            "If automatic scraping failed, manual steps:\n"
            "  1. Visit https://janaushadhi.gov.in → Locate Kendra\n"
            "  2. Search state by state, download/capture results\n"
            "  3. Place files in data/raw/jan_aushadhi/\n"
            "Total ~19,000+ stores nationally — worth the effort as differentiator."
        )


if __name__ == "__main__":
    main()
