"""
Shared download helper with retry logic and content validation.

Consolidates the download_file function duplicated across ingestion scripts.
"""

import logging
import time
from pathlib import Path

import requests

log = logging.getLogger(__name__)


def download_file(url: str, dest: Path, session: requests.Session | None = None, timeout: int = 60) -> bool:
    """Download a file with retry, content validation, and logging.

    Returns True on success, False on failure (file cleaned up).
    """
    s = session or requests.Session()
    retries = 3
    for attempt in range(retries):
        try:
            resp = s.get(url, timeout=timeout, allow_redirects=True)
            resp.raise_for_status()
            # Reject HTML error pages masquerading as CSV
            if dest.suffix == ".csv":
                first_line = resp.text.split("\n", 1)[0].lower()
                if "<html" in first_line or "<!doctype" in first_line:
                    log.warning("Downloaded HTML instead of CSV from %s", url)
                    return False
            dest.write_bytes(resp.content)
            log.info("Downloaded %s (%d bytes) -> %s", url.split("/")[-1], len(resp.content), dest.name)
            return True
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                wait = 2 ** attempt
                log.warning("Retry %d/%d for %s in %ds: %s", attempt + 1, retries, url.split("/")[-1], wait, e)
                time.sleep(wait)
            else:
                log.warning("Failed: %s — %s", url.split("/")[-1], e)
    return False
