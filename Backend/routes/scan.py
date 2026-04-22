"""
scan.py
-------
API endpoint for analyzing URLs using the BrowseShield detection engine.
"""

from flask import Blueprint, request, jsonify

# Detection
from Detection.features.feature_extractor import extract_features
from Detection.scoring.risk_engine import calculate_risk

# ML
from ML.predictor import predict_phishing

# Scoring
from Backend.services.scoring_service import compute_final_result

scan_bp = Blueprint("scan", __name__)


@scan_bp.route("/scan", methods=["POST"])
def scan_url():

    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "URL required"}), 400

    url = data["url"]
    page_data = data.get("page_data", {})

    try:
        # ==============================
        # FEATURE EXTRACTION
        # ==============================
        features = extract_features(url, page_data, training_mode=False)

        # ==============================
        # HEURISTIC
        # ==============================
        heuristic_score = calculate_risk(features)

        # ==============================
        # ML
        # ==============================
        ml_result = predict_phishing(features)

        # ==============================
        # CONFIDENCE (IMPROVED)
        # ==============================
        confidence = int((1 - abs(ml_result["probability"] - heuristic_score)) * 100)

        heuristic_result = {
            "heuristic_score": heuristic_score,
            "safety": (
                "safe" if heuristic_score < 0.4
                else "suspicious" if heuristic_score < 0.75
                else "unsafe"
            ),
            "confidence": confidence,
            "reasons": [],
            "assessed_at": "now"
        }

        # ==============================
        # FINAL SCORING
        # ==============================
        result = compute_final_result(heuristic_result, ml_result)

        result["ml_score"] = round(ml_result["probability"], 3)
        result["heuristic_score"] = round(heuristic_score, 3)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500