export function Card({ children, hover = false, className = '' }) {
  return <div className={`brx-card ${hover ? 'brx-card--hover' : ''} ${className}`.trim()}>{children}</div>;
}

export function Progress({ value = 0, total = 0, label }) {
  const pct = total ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="brx-progress brx-progress-track" role="progressbar" aria-valuenow={value} aria-valuemax={total} aria-label={label}>
      <div className="brx-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}