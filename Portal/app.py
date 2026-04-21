from flask import Flask, render_template
from Portal.config import Config
from Portal.models import db, User
from Portal.utils.extensions import bcrypt, login_manager, csrf

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from Portal.routes.auth import auth
    from Portal.routes.debug import debug

    app.register_blueprint(auth)
    app.register_blueprint(debug)

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