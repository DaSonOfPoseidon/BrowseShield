"""
predictor.py
------------

Runs machine learning inference for phishing detection.
"""

import logging

import numpy as np

from ML.model_loader import model

logger = logging.getLogger(__name__)


# Feature order MUST match the dataset used to train the model.
# Dropped from original 30: web_traffic, Page_Rank, Google_Index,
# Statistical_report (no runtime data source), Prefix_Suffix (training
# data makes it toxic — all legit samples are -1, so model treats 1 as phishing).
FEATURE_ORDER = [
    "having_IP_Address",
    "URL_Length",
    "Shortining_Service",
    "having_At_Symbol",
    "double_slash_redirecting",
    "having_Sub_Domain",
    "SSLfinal_State",
    "Domain_registeration_length",
    "Favicon",
    "port",
    "HTTPS_token",
    "Request_URL",
    "URL_of_Anchor",
    "Links_in_tags",
    "SFH",
    "Submitting_to_email",
    "Abnormal_URL",
    "Redirect",
    "on_mouseover",
    "RightClick",
    "popUpWidnow",
    "Iframe",
    "age_of_domain",
    "DNSRecord",
    "Links_pointing_to_page",
]


def build_feature_vector(features):
    """
    Convert feature dictionary into ordered vector required by the ML model.
    """

    vector = []

    for feature in FEATURE_ORDER:
        if feature not in features:
            logger.warning("Feature '%s' missing from input, defaulting to 0", feature)
        value = float(features.get(feature, 0))
        vector.append(value)

    if len(vector) != len(FEATURE_ORDER):
        raise ValueError("Feature vector length mismatch")

    return np.array(vector).reshape(1, -1)


def predict_phishing(features):
    """
    Run ML prediction for phishing probability.
    """

    feature_vector = build_feature_vector(features)

    prediction = model.predict(feature_vector)[0]

    phishing_probability = model.predict_proba(feature_vector)[0][1]

    return {"prediction": int(prediction), "probability": float(phishing_probability)}
