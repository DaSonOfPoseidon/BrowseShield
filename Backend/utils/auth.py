"""
auth.py
-------
JWT token utilities and authentication decorator.
"""

import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from functools import wraps

import jwt
import bcrypt
from flask import request, jsonify, g

from Backend.config.config import Config


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password, hashed):
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id):
    payload = {
        "sub": str(user_id),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=Config.JWT_ACCESS_EXPIRES),
        "type": "access",
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def create_refresh_token():
    return secrets.token_urlsafe(48)


def hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "authorization_required", "message": "Bearer token required"}), 401

        token = auth_header[7:]

        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token_expired", "message": "Access token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid_token", "message": "Invalid access token"}), 401

        if payload.get("type") != "access":
            return jsonify({"error": "invalid_token", "message": "Invalid token type"}), 401

        g.user_id = int(payload["sub"])
        return f(*args, **kwargs)

    return decorated
