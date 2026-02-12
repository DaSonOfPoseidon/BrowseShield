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

Author: Michael McClanahan
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

from flask import Flask
from backend.db.connection import initialize_db
from backend.routes.scan import scan_blueprint

def create_app():
    app = Flask(__name__)
    app.config.from_object("backend.config.Config")

    # Initialize database
    initialize_db(app)

    # Register routes
    app.register_blueprint(scan_blueprint, url_prefix="/api")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)


