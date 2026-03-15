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


def extract_features(url: str, page_data: dict | None = None) -> dict:

    features = {}

    # ML features
    features.update(extract_url_features(url))
    features.update(extract_domain_features(url))

    if page_data:
        features.update(extract_form_features(page_data))

    # Heuristic-only features
    features.update(extract_heuristic_features(url))

    return features