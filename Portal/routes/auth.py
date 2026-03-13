from flask import Blueprint, render_template, redirect, url_for, request, flash
from Portal.models import db, User
from Portal.utils.extensions import bcrypt
from flask_login import login_user, logout_user, login_required, current_user

auth = Blueprint("auth", __name__)

@auth.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        existing_user = User.query.filter_by(email=email).first()
        
        if existing_user:
            flash("Email already exists")
            return redirect(url_for("auth.register"))
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        
        new_user = User(
            email=email,
            password=hashed_password
        )
        db.session.add(new_user)
        db.session.commit()
        
        return redirect(url_for("auth.login"))
    return render_template("register.html")

@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        user = User.query.filter_by(email=email).first()
    
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            return redirect("/dashboard")
        else:
            return redirect("/login")
    return render_template("login.html")

@auth.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return redirect("/")

@auth.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", email=current_user.email)