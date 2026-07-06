"""
Ingest PMJAY (Ayushman Bharat) claims data for validation.

Source: https://pmjay.gov.in / https://nha.gov.in (National Health Authority)
Accessed: 2026-07-06

NOTE: District-level PMJAY claims data is NOT publicly downloadable.
We accept state-level fallback per user decision.

Downloads state-level claims volume/value for proxy validation
correlation against MAI indices.
Writes to data/raw/pmjay_validation/.
"""

import logging
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT_DIR = Path("data/raw/pmjay_validation")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})

PMJAY_URLS = [
    "https://pmjay.gov.in",
    "https://dashboard.pmjay.gov.in",
    "https://nha.gov.in",
]


def try_pmjay_dashboard():
    """Try PMJAY dashboard for state-level claims data."""
    for base in PMJAY_URLS:
        try:
            resp = SESSION.get(base, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")

                dest = OUT_DIR / f"pmjay_{base.split('//')[1].replace('/', '_').replace('.', '_')}.html"
                dest.write_text(resp.text, encoding="utf-8")

                links = soup.find_all("a", href=True)
                data_links = [
                    a for a in links
                    if any(kw in a.get("href", "").lower() or kw in a.get_text().lower()
                           for kw in ["dashboard", "data", "report", "claim", "state", "beneficiar"])
                ]
                if data_links:
                    log.info("Found %d data links from %s", len(data_links), base)
                    pd.DataFrame([{
                        "text": a.get_text(strip=True)[:100],
                        "href": a["href"],
                    } for a in data_links[:30]]).to_csv(
                        OUT_DIR / "pmjay_data_links.csv", index=False
                    )

                tables = soup.find_all("table")
                for i, table in enumerate(tables[:3]):
                    try:
                        dfs = pd.read_html(str(table))
                        if dfs and len(dfs[0]) > 3:
                            dfs[0].to_csv(OUT_DIR / f"pmjay_table_{i}.csv", index=False)
                            log.info("Extracted table %d from %s: %d rows", i, base, len(dfs[0]))
                    except Exception:
                        continue

                return True
        except Exception as e:
            log.warning("Failed to access %s: %s", base, e)
    return False


def try_pmjay_api():
    """Try PMJAY internal API endpoints."""
    api_urls = [
        "https://dashboard.pmjay.gov.in/api/stateWiseData",
        "https://dashboard.pmjay.gov.in/api/claims",
        "https://pmjay.gov.in/api/dashboard",
    ]

    for url in api_urls:
        try:
            resp = SESSION.get(url, timeout=30)
            if resp.status_code == 200 and "json" in resp.headers.get("content-type", ""):
                dest = OUT_DIR / "pmjay_api_data.json"
                dest.write_bytes(resp.content)
                log.info("Got API data from %s", url)
                return True
        except Exception as e:
            log.debug("  %s failed: %s", url, e)
    return False


def main():
    log.info("=== PMJAY Validation Ingestion (State-Level) ===")
    log.info("NOTE: District-level PMJAY claims not publicly available.")
    log.info("Accepting state-level fallback for validation correlations.")

    if try_pmjay_api():
        log.info("PMJAY API data downloaded")
    elif try_pmjay_dashboard():
        log.info("PMJAY dashboard data scraped")
    else:
        log.error(
            "Could not automatically download PMJAY data. Manual steps:\n"
            "  1. Visit https://pmjay.gov.in → Dashboard\n"
            "  2. Or visit https://dashboard.pmjay.gov.in\n"
            "  3. Capture state-wise claims volume and value\n"
            "  4. Place files in data/raw/pmjay_validation/\n"
            "State-level is sufficient for proxy validation (reduced granularity but honest)."
        )


if __name__ == "__main__":
    main()
