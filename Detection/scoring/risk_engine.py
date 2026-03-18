"""
risk_engine.py
--------------

Calculates heuristic phishing risk scores using extracted features.
This complements the ML model by providing explainable rule-based signals.
"""


# -----------------------------
# Feature Weights
# -----------------------------

FEATURE_WEIGHTS = {

    "having_IP_Address": 0.20,
    "URL_Length": 0.10,
    "Shortining_Service": 0.10,
    "having_At_Symbol": 0.10,
    "double_slash_redirecting": 0.10,
    "Prefix_Suffix": 0.10,
    "having_Sub_Domain": 0.05,
    "HTTPS_token": 0.05,

    "Request_URL": 0.05,
    "URL_of_Anchor": 0.05,
    "Links_in_tags": 0.05,

    "Submitting_to_email": 0.10,
    "Iframe": 0.05
}


PHISHING_THRESHOLD = 0.75
SUSPICIOUS_THRESHOLD = 0.40


def calculate_risk(features: dict) -> float:
    """
    Calculate heuristic risk score.
    """

    score = 0.0

    for feature, weight in FEATURE_WEIGHTS.items():

        value = features.get(feature, 0)

        # Dataset encoding:
        # -1 = phishing
        #  0 = suspicious
        #  1 = legitimate

        if value == -1:
            score += weight

        elif value == 0:
            score += weight * 0.5

    return min(score, 1.0)


def classify_score(score: float) -> str:

    if score >= PHISHING_THRESHOLD:
        return "phishing"

    elif score >= SUSPICIOUS_THRESHOLD:
        return "suspicious"

    return "safe"


def evaluate_risk(features: dict) -> dict:

    heuristic_score = calculate_risk(features)

    classification = classify_score(heuristic_score)

    return {
        "heuristic_score": heuristic_score,
        "classification": classification
    }