from flask import Blueprint, render_template, redirect, url_for, request, flash, session
from Portal.models import db, User
from Portal.utils.extensions import bcrypt, limiter
from flask_login import login_user, logout_user, login_required, current_user
import requests

auth = Blueprint("auth", __name__)

@auth.route("/register", methods=["GET", "POST"])
@limiter.limit("3 per minute", methods=["POST"])
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
@limiter.limit("5 per minute", methods=["POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        user = User.query.filter_by(email=email).first()
    
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)

            try:
                response = requests.post(
                    "https://browseshield.dev/v1/auth/login",
                    json={
                        "email": email,
                        "password": password
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    session["jwt_token"] = data.get("access_token")
                    session["refresh_token"] = data.get("refresh_token")
                else:
                    flash("Backend login failed")
                    print("Backend login failed:", response.text)

            except Exception as e:
                flash("Could not connect to backend")
                print("Backend connection error:", e)

            #Test for token | still need to iron this out
            print("JWT:", session.get("jwt_token"))
            return redirect("/dashboard")
        else:
            flash("Invalid email or password")
            return redirect("/login")
            
    return render_template("login.html")

@auth.route("/logout", methods=["POST"])
@login_required
def logout():
    session.pop("jwt_token", None)
    session.pop("refresh_token", None)
    logout_user()
    return redirect("/")

@auth.route("/dashboard")
@login_required
def dashboard():
    token = session.get("jwt_token")
    scans = []
    average_score = None

    limit = request.args.get("limit", "5")

    if token:
        try:
            response = requests.get(
                "https://browseshield.dev/v1/user-data",
                headers={
                    "Authorization": f"Bearer {token}"
                },
                timeout=10
            )

            if response.status_code == 200:
                scans = response.json()
                if limit != "all":
                    scans = scans[:int(limit)]
                if scans:
                    total = sum((1 - item["score"]) for item in scans if item.get("score") is not None)
                    count = sum(1 for item in scans if item.get("score") is not None)

                    if count > 0:
                        average_score = round(total / count, 4)
            else:
                print("Failed to fetch scan data:", response.text)

        except Exception as e:
            print("Error connecting to backend:", e)

    return render_template("dashboard.html", email=current_user.email, scans=scans, average_score=average_score, selected_limit=limit)