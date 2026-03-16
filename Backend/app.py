"""
BrowseShield Backend Application Entry Point
--------------------------------------------

This module initializes the Flask application for BrowseShield,
a privacy-first phishing detection and awareness browser extension.

Responsibilities:
- Create and configure the Flask application instance
- Initialize database connections (PostgreSQL for evaluation metrics only)
- Register API routes
- Wire together backend services

Important Design Notes:
- No real user browsing data is stored.
- PostgreSQL is used strictly for evaluation and analytics metrics.
- Live phishing detection logic resides in the services layer.
- The extension communicates with this backend via JSON-based REST APIs.

Backend Author: Michael McClanahan
Project: BrowseShield (Capstone)

References:
- https://flask.palletsprojects.com/en/stable/
- https://flask-sqlalchemy.readthedocs.io/en/stable/
- https://www.postgresql.org/docs/
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/
- https://developer.chrome.com/docs/extensions/
- https://csrc.nist.gov/projects/risk-management
- https://scikit-learn.org/stable/modules/model_evaluation.html
"""

from flask import Flask, jsonify
from dotenv import load_dotenv

from Backend.db.connection import initialize_pool
from Backend.routes.scan import scan_bp
from Backend.routes.metrics import metrics_bp

load_dotenv()


def create_app():
    """
    Application factory for the BrowseShield backend.
    """

    app = Flask(__name__)

    # Configure Flask settings
    app.config["JSON_SORT_KEYS"] = False

    # Initialize PostgreSQL connection pool
    initialize_pool()

    # Register API routes
    app.register_blueprint(scan_bp, url_prefix="/api")
    app.register_blueprint(metrics_bp, url_prefix="/api")

    # Simple health check endpoint
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "service": "BrowseShield Backend"
        })

    return app


if __name__ == "__main__":

    app = create_app()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )