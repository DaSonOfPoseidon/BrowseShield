"""
predictor.py
------------

Runs machine learning inference for phishing detection.
"""

import numpy as np

from ML.model_loader import model


# Feature order MUST match the dataset used to train the model
FEATURE_ORDER = [
    "having_IP_Address",
    "URL_Length",
    "Shortining_Service",
    "having_At_Symbol",
    "double_slash_redirecting",
    "Prefix_Suffix",
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
    "web_traffic",
    "Page_Rank",
    "Google_Index",
    "Links_pointing_to_page",
    "Statistical_report"
]


def build_feature_vector(features):
    """
    Convert feature dictionary into ordered vector required by the ML model.
    """

    vector = []

    for feature in FEATURE_ORDER:
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

    return {
        "prediction": int(prediction),
        "probability": float(phishing_probability)
    }