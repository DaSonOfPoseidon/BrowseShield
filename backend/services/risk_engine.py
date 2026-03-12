"""
risk_engine.py
-----------
Calculates phishing risk scores based on extracted URL features.

The engine uses a weighted heuristic scoring model that evaluates
known phishing indicators and produces a final classification.
"""

# -----------------------------
# Feature Weights
# -----------------------------

FEATURE_WEIGHTS = {
    "url_length": 0.15,
    "num_subdomains": 0.15,
    "has_ip_address": 0.20,
    "https_present": -0.15, # Negative because https reduces risk
    "suspicious_keywords": 0.15,
    "hyphen_count": 0.10,
    "encoding_count": 0.10,
    "suspicious_tld": 0.20
}

# -----------------------------
# Classification Thresholds
# -----------------------------

PHISHING_THRESHOLD = 0.75
SUSPICIOUS_THRESHOLD = 0.40

def calculate_heuristic_score(features: dict) -> float:
    
    score = 0.0

    for feature, value in features.items():

        weight = FEATURE_WEIGHTS.get(feature, 0)

        # Normalize some features
        if feature == "url_length":
            value = min(value / 100, 1)

        elif feature == "num_subdomains":
            value = min(value / 3, 1)

        elif feature == "suspicious_keywords":
            value = min(value / 3, 1)

        elif feature == "hyphen_count":
            value = min(value / 3, 1)

        elif feature == "encoding_count":
            value = min(value / 3, 1)

        score += weight * value

    # Clamp score between 0 and 1
    score = max(0, min(score, 1))

    return score

def classify_score(score: float) -> str:

    if score >= PHISHING_THRESHOLD:
        return "phishing"

    elif score >= SUSPICIOUS_THRESHOLD:
        return "suspicious"

    return "safe"

def evaluate_risk(features: dict) -> dict:

    heuristic_score = calculate_heuristic_score(features)

    classification = classify_score(heuristic_score)

    return {
        "heuristic_score": heuristic_score,
        "ml_score": None,  # Placeholder for the ML model
        "final_score": heuristic_score,
        "classification": classification
    }