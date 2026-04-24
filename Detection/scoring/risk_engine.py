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

    # URL structure
    "having_IP_Address": 0.20,
    "URL_Length": 0.10,
    "Shortining_Service": 0.10,
    "having_At_Symbol": 0.10,
    "double_slash_redirecting": 0.10,
    "Prefix_Suffix": 0.10,
    "having_Sub_Domain": 0.05,
    "HTTPS_token": 0.05,

    # Page / resource composition
    "Request_URL": 0.05,
    "URL_of_Anchor": 0.05,
    "Links_in_tags": 0.05,

    # Form action
    "Submitting_to_email": 0.10,
    "SFH": 0.10,

    # Page behavior / anti-analysis
    "Iframe": 0.05,
    "Redirect": 0.05,
    "popUpWidnow": 0.05,
    "RightClick": 0.05,
    "on_mouseover": 0.05,
}


PHISHING_THRESHOLD = 0.75
SUSPICIOUS_THRESHOLD = 0.40


def calculate_risk(features: dict):
    """
    Calculate heuristic risk score.

    Returns a float in [0, 1] when at least one scorable feature is present,
    or None if no feature in FEATURE_WEIGHTS was supplied (caller can then
    distinguish "no signal" from "clean").

    Dataset encoding for feature values:
      -1 = phishing, 0 = suspicious, 1 = legitimate.
    Missing keys are treated as "not evaluated" and contribute nothing —
    previously .get(k, 0) conflated absence with the "suspicious" sentinel,
    which added a silent ~0.15 floor to every request without page_data.
    """

    score = 0.0
    scored = 0

    for feature, weight in FEATURE_WEIGHTS.items():

        if feature not in features:
            continue

        value = features[feature]
        scored += 1

        if value == -1:
            score += weight

        elif value == 0:
            score += weight * 0.5

    if scored == 0:
        return None

    return min(score, 1.0)


def classify_score(score: float) -> str:

    if score >= PHISHING_THRESHOLD:
        return "phishing"

    elif score >= SUSPICIOUS_THRESHOLD:
        return "suspicious"

    return "safe"


def evaluate_risk(features: dict) -> dict:

    heuristic_score = calculate_risk(features)

    classification = (
        classify_score(heuristic_score) if heuristic_score is not None else "unknown"
    )

    return {
        "heuristic_score": heuristic_score,
        "classification": classification
    }