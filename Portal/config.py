import os


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-fallback-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 'sqlite:///browseshield.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False