"""
Team Task Manager - Flask Backend
Run: python app.py
"""

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

    # ── Extensions ──────────────────────────────────────────────────────────
    db.init_app(app)
    JWTManager(app)

    # Allow requests from the React dev server (port 3000) and Vite (5173)
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}},
         supports_credentials=True)

    # ── Blueprints (URL prefixes) ────────────────────────────────────────────
    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(tasks_bp,    url_prefix='/api/tasks')

    # ── Health check ────────────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'Team Task Manager API is running'}

    return app


def seed_sample_data(app):
    """
    Creates sample admin + member users and demo projects/tasks
    so you can log in immediately without creating accounts manually.

    Admin login:  admin@demo.com  / admin123
    Member login: alice@demo.com  / alice123
                  bob@demo.com    / bob123
    """
    with app.app_context():
        # Only seed when the database is empty
        if User.query.count() > 0:
            return

        print("🌱  Seeding sample data...")

        # ── Users ────────────────────────────────────────────────────────────
        admin = User(name='Admin User', email='admin@demo.com', role='admin')
        admin.set_password('admin123')

        alice = User(name='Alice Johnson', email='alice@demo.com', role='member')
        alice.set_password('alice123')

        bob = User(name='Bob Smith', email='bob@demo.com', role='member')
        bob.set_password('bob123')

        db.session.add_all([admin, alice, bob])
        db.session.flush()  # get IDs before commit

        # ── Projects ─────────────────────────────────────────────────────────
        website = Project(name='Website Redesign', description='Redesign the company website with modern UI', owner_id=admin.id)
        website.members = [admin, alice, bob]

        mobile = Project(name='Mobile App', description='Build a cross-platform mobile application', owner_id=admin.id)
        mobile.members = [admin, bob]

        db.session.add_all([website, mobile])
        db.session.flush()

        # ── Tasks ─────────────────────────────────────────────────────────────
        now = datetime.utcnow()
        tasks = [
            Task(title='Design new homepage mockups', description='Create Figma designs for the new homepage', status='completed',
                 due_date=now - timedelta(days=5), project_id=website.id, assigned_to=alice.id),
            Task(title='Implement responsive navbar', description='Build responsive navigation component', status='in_progress',
                 due_date=now + timedelta(days=3), project_id=website.id, assigned_to=alice.id),
            Task(title='Write API documentation', description='Document all REST API endpoints', status='pending',
                 due_date=now + timedelta(days=7), project_id=website.id, assigned_to=bob.id),
            Task(title='Setup CI/CD pipeline', description='Configure GitHub Actions for automated deployment', status='pending',
                 due_date=now - timedelta(days=2), project_id=website.id, assigned_to=admin.id),  # overdue!
            Task(title='Design app wireframes', description='Create wireframes for all app screens', status='completed',
                 due_date=now - timedelta(days=10), project_id=mobile.id, assigned_to=bob.id),
            Task(title='Implement login screen', description='Build authentication UI for mobile app', status='in_progress',
                 due_date=now + timedelta(days=5), project_id=mobile.id, assigned_to=bob.id),
            Task(title='Integrate push notifications', description='Add push notification support', status='pending',
                 due_date=now - timedelta(days=1), project_id=mobile.id, assigned_to=admin.id),  # overdue!
        ]
        db.session.add_all(tasks)
        db.session.commit()
        print("✅  Sample data created!")
        print("   Admin:  admin@demo.com / admin123")
        print("   Member: alice@demo.com / alice123")
        print("   Member: bob@demo.com   / bob123")


if __name__ == '__main__':
    app = create_app()

    with app.app_context():
        db.create_all()  # Creates tables if they don't exist

    seed_sample_data(app)

    print("\n🚀  Backend running at http://localhost:5000")
    print("📖  Health check: http://localhost:5000/api/health\n")
    app.run(debug=True, port=5000)
