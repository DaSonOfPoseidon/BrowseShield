"""
config.py
---------
Backend configuration loaded from environment variables.
"""

import os


class Config:
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_EXPIRES = int(os.environ.get("JWT_ACCESS_EXPIRES", 900))  # 15 min
    JWT_REFRESH_EXPIRES = int(os.environ.get("JWT_REFRESH_EXPIRES", 604800))  # 7 days

    # ML model path
    MODEL_PATH = os.getenv("MODEL_PATH", "Backend/ml/model.pkl")

    # Detection scoring weights
    HEURISTIC_WEIGHT = float(os.getenv("HEURISTIC_WEIGHT", 0.4))
    ML_WEIGHT = float(os.getenv("ML_WEIGHT", 0.6))

    SUSPICIOUS_TLDS = {
        "tk", "ml", "ga", "cf", "xyz", "top", "buzz", "icu", "gq", "click", "link", "work",
    }

    SHORTENER_DOMAINS = {
        "bit.ly", "t.co", "tinyurl.com", "is.gd", "goo.gl", "ow.ly", "buff.ly", "rb.gy",
    }

    KNOWN_BRANDS = {
        "paypal", "apple", "google", "microsoft", "amazon", "netflix", "facebook",
        "instagram", "chase", "wellsfargo", "bankofamerica",
    }

    SUSPICIOUS_KEYWORDS = {
        "login", "secure", "verify", "account", "update", "bank", "confirm",
        "signin", "password",
    }
