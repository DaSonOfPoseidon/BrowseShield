"""
config.py
---------

Centralized configuration for the BrowseShield backend.

This module loads environment variables and defines application
settings used across the backend services.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """
    Base configuration shared across environments.
    """

    # Flask settings
    DEBUG = False
    TESTING = False

    # JSON behavior
    JSON_SORT_KEYS = False

    # ML model path
    MODEL_PATH = os.getenv("MODEL_PATH", "Backend/ml/model.pkl")

    # Database pool configuration
    DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", 1))
    DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", 5))

    # Detection scoring weights
    HEURISTIC_WEIGHT = float(os.getenv("HEURISTIC_WEIGHT", 0.4))
    ML_WEIGHT = float(os.getenv("ML_WEIGHT", 0.6))


class DevelopmentConfig(Config):
    """
    Development environment configuration.
    """

    DEBUG = True


class ProductionConfig(Config):
    """
    Production environment configuration.
    """

    DEBUG = False


def get_config():
    """
    Select configuration based on environment variable.
    """

    env = os.getenv("FLASK_ENV", "development")

    if env == "production":
        return ProductionConfig

    return DevelopmentConfig