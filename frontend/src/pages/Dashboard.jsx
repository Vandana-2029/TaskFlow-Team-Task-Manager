import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI } from '../services/api';
import Layout from '../components/Layout';
import { StatusBadge, DueDate } from '../components/StatusBadge';

const STAT_ICONS = {
  total:    { icon: '◼', cls: 'total' },
  pending:  { icon: '◷', cls: 'pending' },
  progress: { icon: '◑', cls: 'progress' },
  done:     { icon: '◉', cls: 'done' },
  overdue:  { icon: '⚠', cls: 'overdue' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    tasksAPI.dashboard()
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="loading">Loading dashboard</div></Layout>;
  if (error)   return <Layout><div className="auth-error">{error}</div></Layout>;

  const { summary, overdue_tasks, recent_tasks } = data;
  const pct = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Good to see you, {user?.name}</p>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="stats-grid">
        <StatCard k="total"    value={summary.total}       label="Total Tasks"   icon="◼" />
        <StatCard k="pending"  value={summary.pending}     label="Pending"       icon="◷" />
        <StatCard k="progress" value={summary.in_progress} label="In Progress"   icon="◑" />
        <StatCard k="done"     value={summary.completed}   label="Completed"     icon="◉" />
        <StatCard k="overdue"  value={summary.overdue}     label="Overdue"       icon="⚠" />
      </div>

      <div className="two-col">
        {/* ── Overdue Tasks ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--red)' }}>Overdue</h3>
            <span className="badge badge-overdue">{overdue_tasks.length}</span>
          </div>

          {overdue_tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 0' }}>
              <div className="empty-state-icon">✓</div>
              <p>No overdue tasks — great job!</p>
            </div>
          ) : (
            <div>
              {overdue_tasks.map(task => (
                <div key={task.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-between">
                    <span style={{ fontWeight: 600, fontSize: '0.87rem' }}>{task.title}</span>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="tag">{task.project_name}</span>
                    <DueDate date={task.due_date} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Tasks ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Tasks</h3>
          </div>

          {recent_tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 0' }}>
              <div className="empty-state-icon">📋</div>
              <p>No tasks yet</p>
            </div>
          ) : (
            <div>
              {recent_tasks.map(task => (
                <div key={task.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-between">
                    <span style={{ fontWeight: 600, fontSize: '0.87rem' }}>{task.title}</span>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="tag">{task.project_name}</span>
                    {task.assignee && (
                      <span className="text-sm text-muted">{task.assignee.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      {summary.total > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Overall Progress</h3>
            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: 'var(--bg-primary)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--coral))',
              borderRadius: 8,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            <span style={{ color: 'var(--green)'  }}>● Completed ({summary.completed})</span>
            <span style={{ color: 'var(--accent)' }}>● In Progress ({summary.in_progress})</span>
            <span style={{ color: 'var(--amber)'  }}>● Pending ({summary.pending})</span>
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ k, value, label, icon }) {
  return (
    <div className={`stat-card ${k}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
