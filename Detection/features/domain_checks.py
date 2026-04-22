"""
domain_checks.py
----------------
Performs domain-level security checks used for phishing detection.
"""

import socket
import whois
from urllib.parse import urlparse
from datetime import datetime


def extract_domain_features(url):
    features = {}
    domain = urlparse(url).netloc

    # DNS
    features["dns_record"] = check_dns_record(domain)

    # WHOIS (single call)
    try:
        w = whois.whois(domain)

        creation_date = w.creation_date
        expiration_date = w.expiration_date

        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        if isinstance(expiration_date, list):
            expiration_date = expiration_date[0]

        # Domain age
        if creation_date:
            age_days = (datetime.now() - creation_date).days
            features["domain_age"] = -1 if age_days < 180 else 1
        else:
            features["domain_age"] = -1

        # Expiration
        if expiration_date:
            remaining_days = (expiration_date - datetime.now()).days
            features["domain_validity"] = -1 if remaining_days < 365 else 1
        else:
            features["domain_validity"] = -1

    except Exception:
        features["domain_age"] = -1
        features["domain_validity"] = -1

    # Placeholder reputation features (optional)
    features["web_traffic"] = -1
    features["page_rank"] = -1
    features["google_index"] = -1

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


def check_domain_age(domain):
    """
    Determine if the domain is newly registered.
    """

    try:
        w = whois.whois(domain)

        creation_date = w.creation_date

        if isinstance(creation_date, list):
            creation_date = creation_date[0]

        age_days = (datetime.now() - creation_date).days

        # phishing domains are often very new
        if age_days < 180:
            return -1
        else:
            return 1

    except Exception:
        return -1


def check_domain_expiration(domain):
    """
    Determine whether the domain has a short registration period.
    """

    try:
        w = whois.whois(domain)

        expiration_date = w.expiration_date

        if isinstance(expiration_date, list):
            expiration_date = expiration_date[0]

        remaining_days = (expiration_date - datetime.now()).days

        if remaining_days < 365:
            return -1
        else:
            return 1

    except Exception:
        return -1