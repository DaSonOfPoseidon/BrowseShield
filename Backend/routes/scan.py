"""
scan.py
-------
API endpoint for analyzing URLs using the BrowseShield detection engine.
"""

from flask import Blueprint, request, jsonify

from Backend.config.feature_order import FEATURE_ORDER

# Detection engine imports
from Detection.features.feature_extractor import extract_features
from Detection.scoring.risk_engine import calculate_risk

# ML prediction
from Backend.ml.predictor import predict_phishing

# Score combination
from Backend.services.scoring_service import score_result

# Database
from Backend.db.connection import get_connection
from Backend.db.queries import (
    INSERT_ANALYSIS_REQUEST,
    INSERT_FEATURE,
    INSERT_DETECTION_RESULT
)

scan_bp = Blueprint("scan", __name__)


@scan_bp.route("/scan", methods=["POST"])
def scan_url():
    """
    Analyze a URL and return phishing classification.
    """

    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "URL required"}), 400

    url = data["url"]

    # Optional page data from extension
    page_data = data.get("page_data", {})

    # Extract phishing features
    features = extract_features(url, page_data, training_mode=False)

    # Heuristic analysis
    heuristic_score = calculate_risk(features)

    # ML prediction
    ml_result = predict_phishing(features)

    # Combine results
    result = score_result(
        heuristic_score,
        ml_result["probability"]
    )

    result["ml_score"] = round(ml_result["probability"], 3)
    result["heuristic_score"] = round(heuristic_score, 3)

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Insert request
        cursor.execute(
            INSERT_ANALYSIS_REQUEST,
            (url, "api")
        )

        analysis_id = cursor.fetchone()[0]

        # Insert extracted features
        for feature_name, value in features.items():
            cursor.execute(
                INSERT_FEATURE,
                (analysis_id, feature_name, value)
            )

        # Insert detection result
        cursor.execute(
            INSERT_DETECTION_RESULT,
            (
                analysis_id,
                heuristic_score,
                ml_result["probability"],
                result["final_score"],
                result["classification"],
            ),
        )

        conn.commit()

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if conn:
            conn.close()

    return jsonify(result)