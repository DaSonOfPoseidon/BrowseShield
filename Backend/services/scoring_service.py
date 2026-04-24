"""
scoring_service.py
------------------
Combines heuristic and machine learning outputs
to produce a final phishing risk score.
"""

from Backend.config.config import Config


CLASSIFICATION_BOUNDARIES = (0.40, 0.75)
# Normalizer for margin-from-boundary. Max useful distance is about half the
# gap between boundaries; picking 0.25 means scores >=0.25 away from the
# nearest boundary are treated as "fully decisive".
_MARGIN_SCALE = 0.25


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


def compute_confidence(final_score, heuristic_score, ml_probability, coverage=1.0):
    """
    Return a 0-100 confidence number for a phishing verdict.

      margin    = how far final_score sits from the nearest classification
                  boundary (0.40 or 0.75), normalized into [0, 1]
      agreement = 1 - |heuristic_score - ml_probability|  (0.5 if heuristic
                  is unavailable — can't measure agreement)
      coverage  = fraction of expected heuristic features the caller was
                  actually able to evaluate

      raw       = 0.50 * margin + 0.30 * agreement + 0.20 * coverage
      returned  = clamp(int(raw * 100), 10, 95)

    Rationale:
    - Scores near 0.40 or 0.75 straddle a verdict change, so the number is
      inherently ambiguous — margin dominates the weight.
    - Heuristic/ML proximity is a genuine ensemble signal, but only
      meaningful when the heuristic ran.
    - Coverage makes a URL-only scan visibly less certain than one with
      full DOM data.
    """
    # margin — distance to nearest decision boundary
    boundary_distance = min(
        abs(final_score - b) for b in CLASSIFICATION_BOUNDARIES
    )
    margin = min(boundary_distance / _MARGIN_SCALE, 1.0)

    # agreement — drops as heuristic and ML diverge; neutral 0.5 when
    # heuristic couldn't be computed (no signals available).
    if heuristic_score is None:
        agreement = 0.5
    else:
        agreement = max(0.0, 1.0 - abs(ml_probability - heuristic_score))

    # coverage — caller-supplied, clamped defensively.
    coverage_clamped = max(0.0, min(1.0, coverage))

    raw = 0.50 * margin + 0.30 * agreement + 0.20 * coverage_clamped
    return max(10, min(95, int(raw * 100)))


def compute_final_result(heuristic_result, ml_result, coverage=1.0):
    """
    Combine heuristic engine output and ML prediction into a single
    result dict matching the Extension's expected format:
    { safety, confidence, reasons, assessed_at, heuristic_score, ml_score, final_score, classification }

    `coverage` is optional: callers that know what fraction of expected
    heuristic signals they were able to evaluate can pass it through so
    confidence reflects signal completeness. Defaults to 1.0 for callers
    that don't distinguish (backward-compatible with the previous
    two-argument signature).
    """
    heuristic_score = heuristic_result["heuristic_score"]
    ml_probability = ml_result["probability"]

    final_score = combine_scores(heuristic_score, ml_probability)
    classification = classify_score(final_score)

    # Map classification back to Extension's safety vocabulary
    safety_map = {"phishing": "unsafe", "suspicious": "suspicious", "safe": "safe"}
    safety = safety_map[classification]

    confidence = compute_confidence(
        final_score, heuristic_score, ml_probability, coverage
    )

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
