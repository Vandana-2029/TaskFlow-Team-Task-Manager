import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI, projectsAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';
import { StatusBadge, DueDate } from '../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: '',            label: 'All Statuses'  },
  { value: 'pending',     label: 'Pending'       },
  { value: 'in_progress', label: 'In Progress'   },
  { value: 'completed',   label: 'Completed'     },
];

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tasks,    setTasks]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTask,   setEditTask]   = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus)  params.status     = filterStatus;
      if (filterProject) params.project_id = filterProject;
      if (filterOverdue) params.overdue    = 'true';

      const res = await tasksAPI.getAll(params);
      setTasks(res.data);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterProject, filterOverdue]);

  useEffect(() => {
    Promise.all([projectsAPI.getAll(), authAPI.getUsers()])
      .then(([pRes, uRes]) => { setProjects(pRes.data); setUsers(uRes.data); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      setTasks(ts => ts.filter(t => t.id !== id));
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const res = await tasksAPI.update(task.id, { status: newStatus });
      setTasks(ts => ts.map(t => t.id === task.id ? res.data : t));
    } catch (e) {
      alert(e.response?.data?.error || 'Update failed');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Tasks</h2>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} found</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Task
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto', flex: '1 1 140px' }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <select className="form-select" style={{ width: 'auto', flex: '1 1 160px' }}
            value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <label className="flex gap-2" style={{ alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
            <input type="checkbox" checked={filterOverdue}
              onChange={e => setFilterOverdue(e.target.checked)}
              style={{ accentColor: 'var(--red)', width: 15, height: 15 }} />
            Overdue only
          </label>

          <button className="btn btn-secondary btn-sm" onClick={() => {
            setFilterStatus(''); setFilterProject(''); setFilterOverdue(false);
          }}>
            Clear filters
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* ── Tasks Table ── */}
      {loading ? (
        <div className="loading">Loading tasks</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <h3>No tasks found</h3>
          <p>{isAdmin ? 'Create your first task to get started.' : 'No tasks match your filters.'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    currentUserId={user?.id}
                    onEdit={() => setEditTask(task)}
                    onDelete={() => handleDelete(task.id)}
                    onStatusChange={(s) => handleStatusChange(task, s)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <TaskModal
          projects={projects}
          users={users}
          onClose={() => setShowCreate(false)}
          onSaved={(t) => { setTasks([t, ...tasks]); setShowCreate(false); }}
        />
      )}

      {editTask && (
        <TaskModal
          task={editTask}
          projects={projects}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setEditTask(null)}
          onSaved={(t) => { setTasks(ts => ts.map(x => x.id === t.id ? t : x)); setEditTask(null); }}
        />
      )}
    </Layout>
  );
}


function TaskRow({ task, isAdmin, currentUserId, onEdit, onDelete, onStatusChange }) {
  const canChangeStatus = isAdmin || task.assigned_to === currentUserId;

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600 }}>{task.title}</div>
        {task.description && (
          <div className="text-sm text-muted" style={{ marginTop: 2 }}>
            {task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}
          </div>
        )}
      </td>
      <td><span className="tag">{task.project_name || '—'}</span></td>
      <td>
        {task.assignee ? (
          <div className="flex gap-2">
            <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.68rem', borderRadius: '7px' }}>
              {task.assignee.name[0]}
            </div>
            <span className="text-sm" style={{ fontWeight: 500 }}>{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-muted text-sm">Unassigned</span>
        )}
      </td>
      <td>
        {canChangeStatus ? (
          <select
            className="form-select"
            style={{ padding: '4px 28px 4px 8px', fontSize: '0.78rem', width: 'auto' }}
            value={task.status}
            onChange={e => onStatusChange(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        ) : (
          <StatusBadge status={task.status} />
        )}
      </td>
      <td><DueDate date={task.due_date} /></td>
      <td>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={onEdit}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={onDelete}>Del</button>
            </>
          )}
          {!isAdmin && canChangeStatus && (
            <button className="btn btn-secondary btn-sm" onClick={onEdit}>View</button>
          )}
        </div>
      </td>
    </tr>
  );
}


function TaskModal({ task, projects, users, isAdmin = true, onClose, onSaved }) {
  const isEditing = !!task;
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    status:      task?.status      || 'pending',
    due_date:    task?.due_date    ? task.due_date.slice(0, 10) : '',
    project_id:  task?.project_id  || (projects[0]?.id || ''),
    assigned_to: task?.assigned_to || '',
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };
      const res = isEditing
        ? await tasksAPI.update(task.id, payload)
        : await tasksAPI.create(payload);
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEditing ? 'Edit Task' : 'New Task'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="Task title…" value={form.title}
              onChange={set('title')} required disabled={!isAdmin} autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Describe the task…"
              value={form.description} onChange={set('description')} disabled={!isAdmin} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.project_id}
                onChange={set('project_id')} disabled={!isAdmin}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={set('status')}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-select" value={form.assigned_to}
                onChange={set('assigned_to')} disabled={!isAdmin}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.due_date}
                onChange={set('due_date')} disabled={!isAdmin} />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
