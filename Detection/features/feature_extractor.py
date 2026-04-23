"""
feature_extractor.py
--------------------

Coordinates feature extraction for BrowseShield.

This module aggregates phishing indicators from:
- URL analysis
- Domain reputation checks
- Page DOM indicators

The result is a complete feature vector used by both the
heuristic risk engine and the machine learning model.
"""

from Detection.features.url_features import extract_url_features
from Detection.features.domain_checks import extract_domain_features
from Detection.features.form_features import extract_form_features
from Detection.features.heuristic_features import extract_heuristic_features
from Detection.features.advanced_features import (
    get_domain_age,
    calculate_entropy,
    keyword_in_url
)

def extract_features(url, page_data=None, training_mode=True):

    features = {}

    # ==============================
    # URL-based features
    # ==============================
    features.update(extract_url_features(url))

    # ==============================
    # DOMAIN features
    # ==============================
    if not training_mode:
        try:
            domain_features = extract_domain_features(url)
            features.update(domain_features)
        except Exception:
            features.update({
                "dns_record": 0,
                "domain_validity": 0
            })
    else:
        features.update({
            "dns_record": 0,
            "domain_validity": 0
        })

    # ==============================
    # FORM / PAGE features 
    # ==============================
    if page_data:
        try:
            features.update(extract_form_features(page_data))
        except Exception:
            pass

    # ==============================
    # HEURISTIC FEATURES 
    # ==============================
    features.update(extract_heuristic_features(url))

    # ==============================
    # ADVANCED FEATURES
    # ==============================
    
    # URL entropy (safe for training)
    features["url_entropy"] = calculate_entropy(url)

    # Suspicious keywords (safe for training)
    features["has_suspicious_keyword"] = keyword_in_url(url)

    # Domain age (network-based → respect training_mode)
    if not training_mode:
        try:
            features["domain_age"] = get_domain_age(url)
        except Exception:
            features["domain_age"] = 0
    else:
        # keep training consistent (no external calls)
        features["domain_age"] = 0

    return features