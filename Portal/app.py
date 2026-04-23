from flask import Flask, render_template
from Portal.config import Config
from Portal.models import db, User
from Portal.utils.extensions import bcrypt, login_manager, csrf, limiter

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from Portal.routes.auth import auth
    from Portal.routes.debug import debug

    app.register_blueprint(auth)
    app.register_blueprint(debug)

    @app.after_request
    def add_security_headers(response):
        if app.config.get("SECURITY_HEADERS_ENABLED", True):
            response.headers["Content-Security-Policy"] = app.config["CSP_POLICY"]
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

            if not app.debug:
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

    @app.route("/")
    def index():
        return render_template("index.html")
    
    @app.route("/wiki")
    def wiki():
        return render_template("wiki.html")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)