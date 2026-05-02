from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from models import db, Task, Project, User

tasks_bp = Blueprint('tasks', __name__)

VALID_STATUSES = ('pending', 'in_progress', 'completed')


def current_user():
    return User.query.get(int(get_jwt_identity()))


def parse_date(date_str):
    """Parse ISO-format date string into a datetime object."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        return None


@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    """
    Return tasks visible to the current user.
    Admins see all tasks; members see only tasks in their projects.
    Optional query params: project_id, status, overdue
    """
    user = current_user()
    query = Task.query

    # Filter by project
    project_id = request.args.get('project_id', type=int)
    if project_id:
        query = query.filter_by(project_id=project_id)

    # Filter by status
    status = request.args.get('status')
    if status and status in VALID_STATUSES:
        query = query.filter_by(status=status)

    # Filter overdue tasks (due_date in the past and not completed)
    overdue = request.args.get('overdue')
    if overdue == 'true':
        query = query.filter(
            Task.due_date < datetime.utcnow(),
            Task.status != 'completed'
        )

    # Members only see tasks in their own projects
    if user.role != 'admin':
        member_project_ids = [p.id for p in user.projects]
        query = query.filter(Task.project_id.in_(member_project_ids))

    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks]), 200


@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    """Create a new task inside a project. Admins only."""
    user = current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can create tasks'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    title      = data.get('title', '').strip()
    project_id = data.get('project_id')

    if not title:
        return jsonify({'error': 'Task title is required'}), 400
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400

    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    status = data.get('status', 'pending')
    if status not in VALID_STATUSES:
        status = 'pending'

    task = Task(
        title=title,
        description=data.get('description', ''),
        status=status,
        due_date=parse_date(data.get('due_date')),
        project_id=project_id,
        assigned_to=data.get('assigned_to'),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    task = Task.query.get_or_404(task_id)
    return jsonify(task.to_dict()), 200


@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """
    Update task fields.
    Members can only update the status of tasks assigned to them.
    Admins can update everything.
    """
    user = current_user()
    task = Task.query.get_or_404(task_id)
    data = request.get_json() or {}

    if user.role == 'admin':
        # Admins can change everything
        if 'title' in data and data['title'].strip():
            task.title = data['title'].strip()
        if 'description' in data:
            task.description = data['description']
        if 'status' in data and data['status'] in VALID_STATUSES:
            task.status = data['status']
        if 'due_date' in data:
            task.due_date = parse_date(data['due_date'])
        if 'assigned_to' in data:
            task.assigned_to = data['assigned_to']
        if 'project_id' in data:
            task.project_id = data['project_id']
    else:
        # Members can only update status of tasks assigned to them
        if task.assigned_to != user.id:
            return jsonify({'error': 'You can only update tasks assigned to you'}), 403
        if 'status' in data and data['status'] in VALID_STATUSES:
            task.status = data['status']
        else:
            return jsonify({'error': 'Members can only update task status'}), 403

    db.session.commit()
    return jsonify(task.to_dict()), 200


@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    """Delete a task. Admins only."""
    user = current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can delete tasks'}), 403

    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200


@tasks_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """
    Return summary data for the dashboard:
    - total / pending / in_progress / completed task counts
    - list of overdue tasks
    - recent tasks
    """
    user = current_user()

    # Scope tasks to what this user can see
    if user.role == 'admin':
        base_query = Task.query
    else:
        member_project_ids = [p.id for p in user.projects]
        base_query = Task.query.filter(Task.project_id.in_(member_project_ids))

    all_tasks = base_query.all()
    overdue   = [t for t in all_tasks if t.due_date and t.due_date < datetime.utcnow() and t.status != 'completed']
    recent    = base_query.order_by(Task.created_at.desc()).limit(5).all()

    return jsonify({
        'summary': {
            'total':       len(all_tasks),
            'pending':     sum(1 for t in all_tasks if t.status == 'pending'),
            'in_progress': sum(1 for t in all_tasks if t.status == 'in_progress'),
            'completed':   sum(1 for t in all_tasks if t.status == 'completed'),
            'overdue':     len(overdue),
        },
        'overdue_tasks': [t.to_dict() for t in overdue],
        'recent_tasks':  [t.to_dict() for t in recent],
    }), 200
