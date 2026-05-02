import os
from datetime import timedelta

class Config:
    # Secret key for JWT signing — change this in production!
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-key-change-in-production')

    # SQLite database stored in the backend folder
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 'sqlite:///taskmanager.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT tokens expire after 24 hours
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
