"""
feature_extractor.py
-----------
Extract phishing detection features from URLs
"""

from urllib.parse import urlparse


def extract_features(url: str):

    parsed = urlparse(url)
    domain = parsed.netloc

    features = {
        "url_length": len(url),
        "num_subdomains": count_subdomains(domain),
        "has_ip_address": contains_ip(domain),
        "https_present": 1 if parsed.scheme == "https" else 0,
        "hyphen_count": domain.count("-"),
    }

    return features


def count_subdomains(domain):

    parts = domain.split(".")

    if len(parts) <= 2:
        return 0

    return len(parts) - 2


def contains_ip(domain):

    parts = domain.split(".")

    if len(parts) != 4:
        return 0

    try:
        return 1 if all(0 <= int(p) <= 255 for p in parts) else 0
    except ValueError:
        return 0