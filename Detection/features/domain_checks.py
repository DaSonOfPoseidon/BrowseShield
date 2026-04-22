"""
domain_checks.py
----------------
Performs domain-level security checks used for phishing detection.
"""

import socket
import whois
from urllib.parse import urlparse
from datetime import datetime, timezone

def extract_domain_features(url):
    """
    Extract domain-based phishing indicators.
    """

    features = {}
    domain = urlparse(url).netloc

    # ==============================
    # DNS Check
    # ==============================
    features["dns_record"] = check_dns_record(domain)

    # ==============================
    # WHOIS Lookup (single call)
    # ==============================
    try:
        w = whois.whois(domain)

        creation_date = w.creation_date
        expiration_date = w.expiration_date

        # Handle list responses
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        if isinstance(expiration_date, list):
            expiration_date = expiration_date[0]

        # Normalize timezone
        now = datetime.now(timezone.utc)

        if creation_date:
            if creation_date.tzinfo is None:
                creation_date = creation_date.replace(tzinfo=timezone.utc)

            age_days = (now - creation_date).days

            # New domains are suspicious
            features["domain_age"] = -1 if age_days < 180 else 1
        else:
            features["domain_age"] = -1

        if expiration_date:
            if expiration_date.tzinfo is None:
                expiration_date = expiration_date.replace(tzinfo=timezone.utc)

            remaining_days = (expiration_date - now).days

            # Short registration period is suspicious
            features["domain_validity"] = -1 if remaining_days < 365 else 1
        else:
            features["domain_validity"] = -1

    except Exception:
        # Fallback values if WHOIS fails
        features["domain_age"] = -1
        features["domain_validity"] = -1

    return features


def check_dns_record(domain):
    """
    Determine whether the domain resolves to an IP.
    """

    try:
        socket.gethostbyname(domain)
        return 1
    except socket.error:
        return -1