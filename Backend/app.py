"""
BrowseShield Backend Application Entry Point
"""

from flask import Flask

from Backend.db.connection import initialize_pool
from Backend.routes.scan import scan_bp
from Backend.routes.metrics import metrics_bp


def create_app():
    app = Flask(__name__)

    initialize_pool()

    app.register_blueprint(scan_bp, url_prefix="/api")
    app.register_blueprint(metrics_bp, url_prefix="/api")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
