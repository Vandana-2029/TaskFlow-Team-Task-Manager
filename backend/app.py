from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config
from models import db, User, Project, Task
from routes.auth import auth_bp
from routes.projects import projects_bp
from routes.tasks import tasks_bp
from datetime import datetime, timedelta


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    JWTManager(app)

    # CORS (allow all for now, can restrict later)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')

    # Health check route
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'API running'}

    return app


# 🔥 IMPORTANT FOR GUNICORN (DO NOT REMOVE)
app = create_app()


# Optional: create tables + seed (runs once)
with app.app_context():
    db.create_all()


def seed_sample_data():
    with app.app_context():
        if User.query.count() > 0:
            return

        print("🌱 Seeding sample data...")

        admin = User(name='Admin User', email='admin@demo.com', role='admin')
        admin.set_password('admin123')

        alice = User(name='Alice Johnson', email='alice@demo.com', role='member')
        alice.set_password('alice123')

        bob = User(name='Bob Smith', email='bob@demo.com', role='member')
        bob.set_password('bob123')

        db.session.add_all([admin, alice, bob])
        db.session.commit()

        print("✅ Sample users created!")


# Optional seed call
seed_sample_data()