"""
risk_engine.py
-----------
Risk scoring engine for BrowseShield
"""

def evaluate_risk(features):

    score = 0

    if features["url_length"] > 60:
        score += 0.2

    if features["num_subdomains"] >= 3:
        score += 0.2

    if features["has_ip_address"]:
        score += 0.3

    if features["https_present"] == 0:
        score += 0.2

    if features["hyphen_count"] >= 2:
        score += 0.1

    if score >= 0.7:
        classification = "phishing"
    elif score >= 0.4:
        classification = "suspicious"
    else:
        classification = "safe"

    return {
        "heuristic_score": score,
        "ml_score": None,
        "final_score": score,
        "classification": classification,
    }