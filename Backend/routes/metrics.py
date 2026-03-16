"""
metrics.py
----------
Metrics endpoint for BrowseShield detection statistics.
"""

from flask import Blueprint, jsonify

from Backend.db.connection import get_connection
from Backend.db.queries import (
    COUNT_TOTAL_SCANS,
    COUNT_PHISHING,
    COUNT_SAFE
)

metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.route("/metrics", methods=["GET"])
def metrics():
    """
    Return detection metrics summary.
    """

    try:

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(COUNT_TOTAL_SCANS)
        total_scans = cursor.fetchone()[0]

        cursor.execute(COUNT_PHISHING)
        phishing_detected = cursor.fetchone()[0]

        cursor.execute(COUNT_SAFE)
        safe_detected = cursor.fetchone()[0]

        conn.close()

        phishing_rate = (
            phishing_detected / total_scans if total_scans > 0 else 0
        )

        safe_rate = (
            safe_detected / total_scans if total_scans > 0 else 0
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "total_scans": total_scans,
        "phishing_detected": phishing_detected,
        "safe_detected": safe_detected,
        "phishing_rate": round(phishing_rate, 3),
        "safe_rate": round(safe_rate, 3)
    })