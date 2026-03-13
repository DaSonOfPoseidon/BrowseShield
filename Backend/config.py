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
