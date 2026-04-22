"""
heuristic_features.py
---------------------

Additional phishing indicators used only by the heuristic engine.
These signals are not used by the ML model.
"""

import math
import re
from urllib.parse import urlparse

from Backend.config.config import Config

def extract_heuristic_features(url: str) -> dict:

    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    return {
        "suspicious_keyword_count": count_keywords(url),
        "url_encoding_count": count_encoding(url),
        "hyphen_count": domain.count("-"),
        "suspicious_tld": check_suspicious_tld(domain),
        "digit_ratio": calculate_digit_ratio(domain)
    }


def count_keywords(url: str) -> int:

    url_lower = url.lower()
    count = 0

    for keyword in Config.SUSPICIOUS_KEYWORDS:
        if keyword in url_lower:
            count += 1

    return count


def count_encoding(url: str) -> int:
    return url.count("%")


def check_suspicious_tld(domain: str) -> int:

    parts = domain.split(".")
    if len(parts) < 2:
        return 0

    tld = parts[-1]
    return 1 if tld in Config.SUSPICIOUS_TLDS else 0


def calculate_digit_ratio(domain: str) -> float:

    digits = sum(c.isdigit() for c in domain)

    if len(domain) == 0:
        return 0

    return digits / len(domain)