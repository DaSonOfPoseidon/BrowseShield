"""
scan.py
-------
Local debug harness for the BrowseShield detection pipeline.

This endpoint is NOT the production assessment path — see routes/assess.py
for the JWT-gated, DB-persisted endpoint that the extension calls. /scan is
a loopback-only diagnostic: it runs the same feature extraction and ML
inference as production and returns a transparent breakdown of every number
so we can answer "why did this URL get that score?".
"""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from Backend.config.config import Config
from Backend.config.feature_order import FEATURE_ORDER
from Backend.services.scoring_service import compute_confidence
from Detection.features.feature_extractor import extract_features
from Detection.scoring.risk_engine import (
    FEATURE_WEIGHTS,
    classify_score,
    calculate_risk,
)
from ML.predictor import predict_phishing

scan_bp = Blueprint("scan", __name__)

_LOOPBACK_ADDRS = ("127.0.0.1", "::1")


@scan_bp.before_request
def _restrict_to_loopback():
    # request.remote_addr is the direct peer. In Docker with published ports,
    # external clients arrive with the container-network source IP, not ::1,
    # so this gate holds even when the container exposes 8000 publicly.
    if request.remote_addr not in _LOOPBACK_ADDRS:
        return jsonify({"error": "scan endpoint is loopback-only"}), 403


@scan_bp.route("/scan", methods=["POST"])
def scan_url():
    data = request.get_json(silent=True) or {}
    if "url" not in data:
        return jsonify({"error": "URL required"}), 400

    url = data["url"]
    page_data = data.get("page_data", {})

    try:
        features = extract_features(url, page_data, training_mode=False)

        heuristic_score = calculate_risk(features)
        ml_result = predict_phishing(features)
        ml_probability = float(ml_result["probability"])

        # Final score: same arithmetic as services.scoring_service.combine_scores,
        # inlined to avoid pulling in compute_final_result's agreement-boost
        # confidence — this endpoint is supposed to show raw signals, not
        # post-adjusted ones.
        if heuristic_score is None:
            final_score = round(ml_probability, 4)
            classification = classify_score(final_score)
        else:
            final_score = round(
                heuristic_score * Config.HEURISTIC_WEIGHT
                + ml_probability * Config.ML_WEIGHT,
                4,
            )
            classification = classify_score(final_score)

        contributions = []
        missing_features = []
        for feature, weight in FEATURE_WEIGHTS.items():
            if feature not in features:
                missing_features.append(feature)
                continue
            value = features[feature]
            if value == -1:
                added = weight
            elif value == 0:
                added = weight * 0.5
            else:
                added = 0.0
            if added:
                contributions.append(
                    {
                        "feature": feature,
                        "value": value,
                        "weight": weight,
                        "added": round(added, 4),
                    }
                )

        scored_features = {
            k: features[k] for k in FEATURE_WEIGHTS if k in features
        }

        # Features computed by the extractor but unused by both the heuristic
        # scorer AND the ML model. Surfacing this makes it obvious which
        # signals are being wasted.
        ml_keys = set(FEATURE_ORDER)
        weight_keys = set(FEATURE_WEIGHTS)
        dead_features = sorted(
            k for k in features.keys() if k not in ml_keys and k not in weight_keys
        )

        coverage = len(scored_features) / len(FEATURE_WEIGHTS)
        confidence = compute_confidence(
            final_score, heuristic_score, ml_probability, coverage
        )

        response = {
            "mode": "debug",
            "url": url,
            "final_score": final_score,
            "classification": classification,
            "confidence": confidence,
            "heuristic": {
                "score": round(heuristic_score, 4) if heuristic_score is not None else None,
                "coverage": round(coverage, 3),
                "scored_features": scored_features,
                "contributions": contributions,
                "missing_features": missing_features,
                "dead_features_computed_but_unscored": dead_features,
            },
            "ml": {
                "probability": round(ml_probability, 4),
                "prediction": ml_result["prediction"],
                "feature_vector_keys": list(FEATURE_ORDER),
            },
            "weights": {
                "heuristic": Config.HEURISTIC_WEIGHT,
                "ml": Config.ML_WEIGHT,
            },
            "assessed_at": datetime.now(timezone.utc).isoformat(),
        }

        return jsonify(response)

    except Exception as e:
        # Loopback-only — stringifying the exception is acceptable.
        return jsonify({"error": str(e), "error_type": type(e).__name__}), 500
