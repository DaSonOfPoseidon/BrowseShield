"""
feature_extractor.py
-----------
Extracts phishing detection features from URLs for BrowseShield.

These features are used by the risk scoring engine to determine the
likelihood that a URL is associated with a phishing attack.
"""

import re
from urllib.parse import urlparse

SUSPICIOUS_KEYWORDS = [
    "login",
    "secure",
    "verify",
    "account",
    "update",
    "bank",
    "confirm",
    "signin",
    "password"
]

SUSPICIOUS_TLDS = [
    "ru",
    "cn",
    "tk",
    "xyz",
    "top",
    "gq",
    "ml"
]

def extract_features(url: str) -> dict:

    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    features = {
        "url_length": get_url_length(url),
        "num_subdomains": count_subdomains(domain),
        "has_ip_address": has_ip(domain),
        "https_present": uses_https(parsed),
        "suspicious_keywords": count_suspicious_keywords(url),
        "hyphen_count": count_hyphens(domain),
        "encoding_count": count_url_encoding(url),
        "suspicious_tld": has_suspicious_tld(domain)
    }

    return features

# -----------------------------
# Individual Feature Functions
# -----------------------------

def get_url_length(url: str) -> int:
    """Return total URL length."""
    return len(url)

def count_subdomains(domain: str) -> int:
    """Return number of subdomains."""
    parts = domain.split(".")
    if len(parts) <= 2:
        return 0
    return len(parts) - 2

def has_ip(domain: str) -> int:
    """
    Detect if domain is an IP address.
    Returns 1 if true, else 0.
    """
    ip_pattern = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
    return 1 if re.match(ip_pattern, domain) else 0

def uses_https(parsed_url) -> int:
    """Return 1 if HTTPS is used, else 0."""
    return 1 if parsed_url.scheme == "https" else 0

def count_suspicious_keywords(url: str) -> int:
    """Count suspicious phishing keywords in URL."""
    url_lower = url.lower()
    count = 0

    for keyword in SUSPICIOUS_KEYWORDS:
        if keyword in url_lower:
            count += 1

    return count

def count_hyphens(domain: str) -> int:
    """Count hyphens in the domain."""
    return domain.count("-")

def count_url_encoding(url: str) -> int:
    """Count encoded characters like %20."""
    return url.count("%")

def has_suspicious_tld(domain: str) -> int:
    """Return 1 if domain ends with suspicious TLD."""
    parts = domain.split(".")
    if len(parts) < 2:
        return 0

    tld = parts[-1]
    return 1 if tld in SUSPICIOUS_TLDS else 0