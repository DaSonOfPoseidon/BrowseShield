"""
scoring_service.py
------------------
Combines heuristic and machine learning outputs
to produce a final phishing risk score.
"""

from Backend.config.config import Config


def combine_scores(heuristic_score, ml_probability):
    """
    Combine heuristic and ML scores using configured weights.
    """
    final_score = (
        heuristic_score * Config.HEURISTIC_WEIGHT
        + ml_probability * Config.ML_WEIGHT
    )
    return round(final_score, 4)


def classify_score(score):
    """
    Convert risk score into a classification label.
    """
    if score >= 0.75:
        return "phishing"
    elif score >= 0.40:
        return "suspicious"
    else:
        return "safe"


def compute_final_result(heuristic_result, ml_result):
    """
    Combine heuristic engine output and ML prediction into a single
    result dict matching the Extension's expected format:
    { safety, confidence, reasons, assessed_at, heuristic_score, ml_score, final_score, classification }
    """
    heuristic_score = heuristic_result["heuristic_score"]
    ml_probability = ml_result["probability"]

    final_score = combine_scores(heuristic_score, ml_probability)
    classification = classify_score(final_score)

    # Map classification back to Extension's safety vocabulary
    safety_map = {"phishing": "unsafe", "suspicious": "suspicious", "safe": "safe"}
    safety = safety_map[classification]

    # Confidence: boost when both engines agree, reduce when they disagree
    heuristic_agrees = heuristic_result["safety"] == safety
    confidence = int((1 - abs(ml_probability - heuristic_score)) * 100)
    if heuristic_agrees:
        confidence = min(95, confidence + 10)
    else:
        confidence = max(30, confidence - 15)

    return {
        "safety": safety,
        "confidence": confidence,
        "reasons": heuristic_result["reasons"],
        "heuristic_score": heuristic_score,
        "ml_score": ml_probability,
        "final_score": final_score,
        "classification": classification,
        "assessed_at": heuristic_result["assessed_at"],
    }
