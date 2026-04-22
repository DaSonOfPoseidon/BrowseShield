"""
auth.py
-------
Authentication endpoints: login, logout, refresh.
"""

from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify

from Backend.config.config import Config
from Backend.db.connection import get_db_connection
from Backend.db.queries import (
    GET_USER_BY_EMAIL,
    GET_USER_BY_ID,
    INSERT_REFRESH_TOKEN,
    GET_REFRESH_TOKEN,
    DELETE_REFRESH_TOKEN,
    DELETE_USER_REFRESH_TOKENS,
)
from Backend.utils.auth import (
    check_password,
    create_access_token,
    create_refresh_token,
    hash_token,
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "validation_error", "message": "Email and password required"}), 400

    email = data["email"].strip().lower()
    password = data["password"]

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(GET_USER_BY_EMAIL, (email,))
            row = cursor.fetchone()

            if not row or not check_password(password, row[2]):
                return jsonify({"error": "invalid_credentials", "message": "Invalid email or password"}), 401

            user_id, user_email, _, user_name = row

            access_token = create_access_token(user_id)
            refresh_token = create_refresh_token()

            expires_at = datetime.now(timezone.utc) + timedelta(seconds=Config.JWT_REFRESH_EXPIRES)
            cursor.execute(INSERT_REFRESH_TOKEN, (user_id, hash_token(refresh_token), expires_at))
            conn.commit()

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": Config.JWT_ACCESS_EXPIRES,
        "user": {
            "id": user_id,
            "email": user_email,
            "name": user_name,
        },
    })


@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    data = request.get_json() or {}
    refresh_token = data.get("refresh_token")

    if refresh_token:
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(DELETE_REFRESH_TOKEN, (hash_token(refresh_token),))
                conn.commit()
        except Exception:
            pass

    return jsonify({"message": "Logged out"})


@auth_bp.route("/auth/refresh", methods=["POST"])
def refresh():
    data = request.get_json()

    if not data or "refresh_token" not in data:
        return jsonify({"error": "validation_error", "message": "Refresh token required"}), 400

    old_token = data["refresh_token"]
    old_hash = hash_token(old_token)

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(GET_REFRESH_TOKEN, (old_hash,))
            row = cursor.fetchone()

            if not row:
                return jsonify({"error": "invalid_token", "message": "Invalid refresh token"}), 401

            token_id, user_id, expires_at = row

            if expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                cursor.execute(DELETE_REFRESH_TOKEN, (old_hash,))
                conn.commit()
                return jsonify({"error": "token_expired", "message": "Refresh token has expired"}), 401

            # Rotate: delete old, create new
            cursor.execute(DELETE_REFRESH_TOKEN, (old_hash,))

            new_access = create_access_token(user_id)
            new_refresh = create_refresh_token()
            new_expires = datetime.now(timezone.utc) + timedelta(seconds=Config.JWT_REFRESH_EXPIRES)

            cursor.execute(INSERT_REFRESH_TOKEN, (user_id, hash_token(new_refresh), new_expires))
            conn.commit()

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "access_token": new_access,
        "refresh_token": new_refresh,
        "expires_in": Config.JWT_ACCESS_EXPIRES,
    })
