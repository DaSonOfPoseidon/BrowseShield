"""
Metrics endpoint for detection performance
"""

from flask import Blueprint, jsonify

from Backend.db.connection import get_db_connection
from Backend.db.queries import (
    COUNT_TOTAL_SCANS,
    COUNT_PHISHING,
    COUNT_SAFE,
)

metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.route("/metrics", methods=["GET"])
def metrics():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(COUNT_TOTAL_SCANS)
            total_scans = cursor.fetchone()[0]

            cursor.execute(COUNT_PHISHING)
            phishing_detected = cursor.fetchone()[0]

            cursor.execute(COUNT_SAFE)
            safe_detected = cursor.fetchone()[0]

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "total_scans": total_scans,
        "phishing_detected": phishing_detected,
        "safe_detected": safe_detected,
    })
