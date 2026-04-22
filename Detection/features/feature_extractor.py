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


def extract_features(url, page_data=None, training_mode=True):

    features = {}

    # ==============================
    # URL-based features (SAFE)
    # ==============================
    features.update(extract_url_features(url))

    # ==============================
    # DOMAIN features (NETWORK → DISABLE DURING TRAINING)
    # ==============================
    if not training_mode:
        try:
            features.update(extract_domain_features(url))
        except Exception:
            # fallback values if lookup fails
            features.update({
                "domain_age": 0,
                "dns_record": 0,
                "domain_validity": 0
            })
    else:
        # training-safe defaults
        features.update({
            "domain_age": 0,
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
        features.update(extract_form_features(page_data, url))

    # ==============================
    # HEURISTIC FEATURES 
    # ==============================
    features.update(extract_heuristic_features(url))

    return features