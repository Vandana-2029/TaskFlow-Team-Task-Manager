from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Project, User

projects_bp = Blueprint('projects', __name__)


def current_user():
    """Helper: fetch the logged-in user from the JWT identity."""
    return User.query.get(int(get_jwt_identity()))


@projects_bp.route('/', methods=['GET'])
@jwt_required()
def get_projects():
    """
    Admins see all projects.
    Members see only projects they belong to.
    """
    user = current_user()
    if user.role == 'admin':
        projects = Project.query.order_by(Project.created_at.desc()).all()
    else:
        projects = user.projects

    return jsonify([p.to_dict(include_members=True) for p in projects]), 200


@projects_bp.route('/', methods=['POST'])
@jwt_required()
def create_project():
    """Create a new project. Only admins can create projects."""
    user = current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can create projects'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Project name is required'}), 400

    project = Project(
        name=name,
        description=data.get('description', ''),
        owner_id=user.id,
    )
    # Owner is automatically a member
    project.members.append(user)
    db.session.add(project)
    db.session.commit()

    return jsonify(project.to_dict(include_members=True)), 201


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Get a single project with its members and tasks."""
    project = Project.query.get_or_404(project_id)
    data = project.to_dict(include_members=True)
    data['tasks'] = [t.to_dict() for t in project.tasks]
    return jsonify(data), 200


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Update project name / description. Admins only."""
    user = current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can update projects'}), 403

    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}

    if 'name' in data and data['name'].strip():
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description']

    db.session.commit()
    return jsonify(project.to_dict(include_members=True)), 200


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete a project and all its tasks. Admins only."""
    user = current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can delete projects'}), 403

    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted'}), 200


@projects_bp.route('/<int:project_id>/members', methods=['POST'])
@jwt_required()
def add_member(project_id):
    """Add a user to a project. Admins only."""
    user = current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can manage members'}), 403

    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}
    member_id = data.get('user_id')

    if not member_id:
        return jsonify({'error': 'user_id is required'}), 400

    member = User.query.get(member_id)
    if not member:
        return jsonify({'error': 'User not found'}), 404

    if member not in project.members:
        project.members.append(member)
        db.session.commit()

    return jsonify(project.to_dict(include_members=True)), 200


@projects_bp.route('/<int:project_id>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(project_id, user_id):
    """Remove a user from a project. Admins only."""
    user = current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can manage members'}), 403

    project = Project.query.get_or_404(project_id)
    member = User.query.get_or_404(user_id)

    if member in project.members:
        project.members.remove(member)
        db.session.commit()

    return jsonify(project.to_dict(include_members=True)), 200
