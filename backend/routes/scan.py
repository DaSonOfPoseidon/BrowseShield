"""
scan.py
-------
API endpoint for analyzing URLs using the BrowseShield detection engine.
"""

from flask import Blueprint, request, jsonify

from backend.services.feature_extractor import extract_features
from backend.services.risk_engine import evaluate_risk

from backend.db.connection import get_db_connection
from backend.db.queries import (
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

    # Extract phishing features
    features = extract_features(url)

    # Evaluate risk
    result = evaluate_risk(features)

    try:
        with get_db_connection() as conn:

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
                    result["heuristic_score"],
                    result["ml_score"],
                    result["final_score"],
                    result["classification"],
                ),
            )

            conn.commit()

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(result)