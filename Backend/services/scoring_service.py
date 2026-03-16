"""
scoring_service.py
------------------
Combines heuristic and machine learning outputs
to produce a final phishing risk score.
"""


def combine_scores(heuristic_score, ml_probability):
    """
    Combine heuristic and ML scores into a final score.

    heuristic_score : float (0–1)
    ml_probability  : float (0–1)
    """

    # Weighting can be adjusted later
    heuristic_weight = 0.4
    ml_weight = 0.6

    final_score = (heuristic_score * heuristic_weight) + (ml_probability * ml_weight)

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


def score_result(heuristic_score, ml_probability):
    """
    Generate final detection result.
    """

    final_score = combine_scores(heuristic_score, ml_probability)

    classification = classify_score(final_score)

    return {
        "heuristic_score": heuristic_score,
        "ml_probability": ml_probability,
        "final_score": final_score,
        "classification": classification
    }