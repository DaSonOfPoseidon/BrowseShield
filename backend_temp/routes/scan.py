"""
scan.py
-------
API endpoint for analyzing URLs using the BrowseShield detection engine.
"""

from flask import Blueprint, request, jsonify

from backend.services.feature_extractor import extract_features
from backend.services.risk_engine import evaluate_risk
from backend.db.connection import get_db_connection


# Blueprint definition
scan_bp = Blueprint("scan", __name__)


@scan_bp.route("/scan", methods=["POST"])
def scan_url():
    """
    Analyze a URL and return phishing classification.
    """

    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "URL is required"}), 400

    url = data["url"]

    # Run feature extraction
    features = extract_features(url)

    # Run risk scoring
    result = evaluate_risk(features)

    # Save results to database
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO analysis_requests (url, source)
                VALUES (%s, %s)
                RETURNING id;
                """,
                (url, "api_test")
            )

            analysis_id = cursor.fetchone()[0]

            for feature_name, value in features.items():
                cursor.execute(
                    """
                    INSERT INTO extracted_features
                    (analysis_id, feature_name, feature_value)
                    VALUES (%s, %s, %s)
                    """,
                    (analysis_id, feature_name, value)
                )

            cursor.execute(
                """
                INSERT INTO detection_results
                (analysis_id, heuristic_score, ml_score, final_score, classification)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    analysis_id,
                    result["heuristic_score"],
                    result["ml_score"],
                    result["final_score"],
                    result["classification"]
                )
            )

            conn.commit()

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(result)