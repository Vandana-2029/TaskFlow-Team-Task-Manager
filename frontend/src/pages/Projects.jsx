import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, authAPI } from '../services/api';
import Layout from '../components/Layout';

export default function Projects() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [projects, setProjects] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [showCreate,  setShowCreate]  = useState(false);
  const [showMembers, setShowMembers] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, uRes] = await Promise.all([projectsAPI.getAll(), authAPI.getUsers()]);
      setProjects(pRes.data);
      setUsers(uRes.data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await projectsAPI.delete(id);
      setProjects(ps => ps.filter(p => p.id !== id));
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <Layout><div className="loading">Loading projects</div></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Project
          </button>
        )}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◻</div>
          <h3>No projects yet</h3>
          <p>{isAdmin ? 'Create your first project to get started.' : "You haven't been added to any projects yet."}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={isAdmin}
              onManageMembers={() => setShowMembers(project)}
              onDelete={() => handleDelete(project.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setProjects([p, ...projects]); setShowCreate(false); }}
        />
      )}

      {showMembers && (
        <ManageMembersModal
          project={showMembers}
          allUsers={users}
          onClose={() => { setShowMembers(null); load(); }}
        />
      )}
    </Layout>
  );
}


function ProjectCard({ project, isAdmin, onManageMembers, onDelete }) {
  return (
    <div className="project-card">
      <div className="project-card-name">{project.name}</div>
      <div className="project-card-desc">{project.description || 'No description provided.'}</div>

      <div className="project-card-meta">
        <span className="meta-pill">◈ {project.task_count} task{project.task_count !== 1 ? 's' : ''}</span>
        <span className="meta-pill">◎ {project.members?.length || 0} member{project.members?.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Member avatars */}
      {project.members?.length > 0 && (
        <div className="flex gap-2" style={{ marginTop: 14 }}>
          {project.members.slice(0, 5).map(m => (
            <div
              key={m.id}
              title={m.name}
              style={{
                width: 28, height: 28, borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #f05030)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 700,
              }}
            >
              {m.name[0].toUpperCase()}
            </div>
          ))}
          {project.members.length > 5 && (
            <span className="text-sm text-muted" style={{ lineHeight: '28px' }}>
              +{project.members.length - 5}
            </span>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={onManageMembers}>
            Manage Members
          </button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}


function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Project name is required'); return; }
    setSaving(true);
    try {
      const res = await projectsAPI.create(form);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Project</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input className="form-input" placeholder="e.g. Q4 Launch Campaign"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="What is this project about?"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function ManageMembersModal({ project, allUsers, onClose }) {
  const [members, setMembers] = useState(project.members || []);
  const [loading, setLoading] = useState(false);

  const memberIds = new Set(members.map(m => m.id));
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  const addMember = async (userId) => {
    setLoading(true);
    try {
      const res = await projectsAPI.addMember(project.id, userId);
      setMembers(res.data.members);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId) => {
    setLoading(true);
    try {
      const res = await projectsAPI.removeMember(project.id, userId);
      setMembers(res.data.members);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Members — {project.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 700 }}>
          Current Members ({members.length})
        </h4>

        {members.length === 0 && <p className="text-muted text-sm">No members yet.</p>}

        {members.map(m => (
          <div key={m.id} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="flex gap-2">
              <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', borderRadius: '8px' }}>{m.name[0]}</div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{m.email}</div>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" disabled={loading} onClick={() => removeMember(m.id)}>
              Remove
            </button>
          </div>
        ))}

        {nonMembers.length > 0 && (
          <>
            <div className="divider" />
            <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 700 }}>
              Add Members
            </h4>
            {nonMembers.map(u => (
              <div key={u.id} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex gap-2">
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', borderRadius: '8px' }}>{u.name[0]}</div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => addMember(u.id)}>
                  + Add
                </button>
              </div>
            ))}
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
