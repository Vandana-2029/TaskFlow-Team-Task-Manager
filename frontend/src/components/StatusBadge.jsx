/**
 * Renders a coloured pill badge for task statuses and user roles.
 */
export function StatusBadge({ status }) {
  const map = {
    pending:     { cls: 'badge-pending',   label: 'Pending'     },
    in_progress: { cls: 'badge-progress',  label: 'In Progress' },
    completed:   { cls: 'badge-completed', label: 'Completed'   },
    overdue:     { cls: 'badge-overdue',   label: 'Overdue'     },
  };
  const { cls, label } = map[status] || { cls: '', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function RoleBadge({ role }) {
  const cls = role === 'admin' ? 'badge-admin' : 'badge-member';
  return <span className={`badge ${cls}`}>{role}</span>;
}

export function DueDate({ date }) {
  if (!date) return <span className="text-muted text-sm">—</span>;
  const d   = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / 86400000);

  let cls = 'due-ok';
  if (diffDays < 0)  cls = 'due-overdue';
  else if (diffDays < 3) cls = 'due-soon';

  return (
    <span className={`text-sm text-mono ${cls}`}>
      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  );
}
