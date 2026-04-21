from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect

bcrypt = Bcrypt()
login_manager = LoginManager()
login_manager.login_view = "auth.login"
csrf = CSRFProtect()