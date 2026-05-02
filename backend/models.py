from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

# ─── Association table: many-to-many between Project and User ───────────────
project_members = db.Table(
    'project_members',
    db.Column('project_id', db.Integer, db.ForeignKey('project.id'), primary_key=True),
    db.Column('user_id',    db.Integer, db.ForeignKey('user.id'),    primary_key=True),
)


class User(db.Model):
    """Represents a team member. Role is either 'admin' or 'member'."""
    __tablename__ = 'user'

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(150), unique=True, nullable=False)
    password   = db.Column(db.String(256), nullable=False)
    role       = db.Column(db.String(20), nullable=False, default='member')  # 'admin' | 'member'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Tasks assigned to this user
    assigned_tasks = db.relationship('Task', backref='assignee', lazy=True)

    def set_password(self, raw_password):
        """Hash and store the password."""
        self.password = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        """Verify a plain-text password against the stored hash."""
        return check_password_hash(self.password, raw_password)

    def to_dict(self):
        return {
            'id':         self.id,
            'name':       self.name,
            'email':      self.email,
            'role':       self.role,
            'created_at': self.created_at.isoformat(),
        }


class Project(db.Model):
    """A project groups tasks and has members assigned to it."""
    __tablename__ = 'project'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    owner_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Members assigned to this project (many-to-many)
    members = db.relationship('User', secondary=project_members, backref='projects', lazy=True)

    # Tasks belonging to this project
    tasks = db.relationship('Task', backref='project', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_members=False):
        data = {
            'id':          self.id,
            'name':        self.name,
            'description': self.description,
            'owner_id':    self.owner_id,
            'created_at':  self.created_at.isoformat(),
            'task_count':  len(self.tasks),
        }
        if include_members:
            data['members'] = [m.to_dict() for m in self.members]
        return data


class Task(db.Model):
    """A task belongs to a project and is optionally assigned to a user."""
    __tablename__ = 'task'

    id           = db.Column(db.Integer, primary_key=True)
    title        = db.Column(db.String(200), nullable=False)
    description  = db.Column(db.Text, default='')
    status       = db.Column(db.String(30), nullable=False, default='pending')  # pending | in_progress | completed
    due_date     = db.Column(db.DateTime, nullable=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    project_id   = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    assigned_to  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    def to_dict(self):
        return {
            'id':          self.id,
            'title':       self.title,
            'description': self.description,
            'status':      self.status,
            'due_date':    self.due_date.isoformat() if self.due_date else None,
            'created_at':  self.created_at.isoformat(),
            'project_id':  self.project_id,
            'assigned_to': self.assigned_to,
            'assignee':    self.assignee.to_dict() if self.assignee else None,
            'project_name': self.project.name if self.project else None,
        }
