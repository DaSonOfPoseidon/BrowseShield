"""
assess.py
-------
API endpoints for analyzing URLs and emails using the BrowseShield detection engine.
"""

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from Backend.services.risk_engine import evaluate_risk
from Backend.db.connection import get_db_connection
from Backend.db.queries import (
    INSERT_ANALYSIS_REQUEST,
    INSERT_FEATURE,
    INSERT_DETECTION_RESULT,
)

assess_bp = Blueprint("assess", __name__)


@assess_bp.route("/assess", methods=["POST"])
def assess_url():
    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "URL required"}), 400

    url = data["url"]
    scan_data = data.get("scan_data", {})

    features = scan_data if scan_data else {
        "url_length": len(url),
        "num_subdomains": 0,
        "has_ip_address": 0,
        "https_present": 1 if url.startswith("https") else 0,
        "hyphen_count": 0,
    }

    result = evaluate_risk(features)

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(INSERT_ANALYSIS_REQUEST, (url, "api"))
            analysis_id = cursor.fetchone()[0]

            for feature_name, value in features.items():
                cursor.execute(
                    INSERT_FEATURE,
                    (analysis_id, feature_name, float(value) if value is not None else 0.0),
                )

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


@assess_bp.route("/assess/email", methods=["POST"])
def assess_email():
    data = request.get_json()

    if not data:
        return jsonify({"error": "validation_error", "message": "Request body required"}), 400

    # TODO: Mike — add email processing logic
    return jsonify({
        "safety": "suspicious",
        "confidence": 50,
        "reasons": ["Email analysis not yet implemented"],
        "phishingIndicators": {},
        "assessed_at": datetime.now(timezone.utc).isoformat(),
    })
