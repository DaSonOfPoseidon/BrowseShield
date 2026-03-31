from flask import Blueprint, jsonify, g

from Backend.db.connection import get_db_connection
from Backend.utils.auth import jwt_required

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/user-data", methods=["GET"])
@jwt_required
def get_user_data():
    user_id = g.user_id

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT ar.url, dr.final_score, dr.classification, dr.created_at
                FROM analysis_requests ar
                JOIN detection_results dr ON ar.id = dr.analysis_id
                WHERE ar.user_id = %s
                ORDER BY dr.created_at DESC
            """, (user_id,))
            rows = cursor.fetchall()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    data = []
    for row in rows:
        data.append({
            "url": row[0],
            "score": row[1],
            "classification": row[2],
            "timestamp": row[3],
        })

    return jsonify(data)