"""
advanced_features.py
--------------------
Additional high-value phishing detection features.
"""

import math
import re
from collections import Counter
from urllib.parse import urlparse
from datetime import datetime

import whois


# ----------------------------------------
# FEATURE 1: Domain Age
# ----------------------------------------
def get_domain_age(url):
    """
    Returns domain age in days.
    If lookup fails, return -1.
    """
    try:
        domain = urlparse(url).netloc
        w = whois.whois(domain)

        creation_date = w.creation_date

        # Handle list case (some WHOIS responses return list)
        if isinstance(creation_date, list):
            creation_date = creation_date[0]

        if creation_date is None:
            return -1

        age = (datetime.now() - creation_date).days
        return age

    except Exception:
        return -1


# ----------------------------------------
# FEATURE 2: URL Entropy
# ----------------------------------------
def calculate_entropy(url):
    """
    Calculates Shannon entropy of the URL string.
    Higher entropy = more randomness (suspicious).
    """
    if not url:
        return 0

    counts = Counter(url)
    probabilities = [count / len(url) for count in counts.values()]

    entropy = -sum(p * math.log2(p) for p in probabilities)
    return entropy


# ----------------------------------------
# FEATURE 3: Suspicious Keywords in Path
# ----------------------------------------
SUSPICIOUS_KEYWORDS = [
    "login", "verify", "secure", "account",
    "update", "banking", "confirm", "password"
]


def keyword_in_url(url):
    """
    Returns 1 if suspicious keywords appear in URL path.
    """
    parsed = urlparse(url)
    path = parsed.path.lower()

    for keyword in SUSPICIOUS_KEYWORDS:
        if keyword in path:
            return 1

    return 0