"""
BrowseShield Backend Application Entry Point
"""

from flask import Flask

from Backend.config import Config
from Backend.db.connection import initialize_pool
from Backend.routes.assess import assess_bp
from Backend.routes.auth import auth_bp
from Backend.routes.metrics import metrics_bp


def create_app():
    """
    Application factory for the BrowseShield backend.
    """

    app = Flask(__name__)
    app.config.from_object(Config)

    initialize_pool()

    app.register_blueprint(auth_bp, url_prefix="/v1")
    app.register_blueprint(assess_bp, url_prefix="/v1")
    app.register_blueprint(metrics_bp, url_prefix="/v1")

    return app


if __name__ == "__main__":

    app = create_app()
    app.run(debug=True)
