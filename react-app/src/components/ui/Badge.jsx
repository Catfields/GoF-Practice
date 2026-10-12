import { DIFF_LABELS } from '../../lib/api.js';

export function Badge({ children, variant = 'default', className = '' }) {
  return <span className={`brx-badge brx-badge--${variant} ${className}`.trim()}>{children}</span>;
}

export function diffBadge(d) {
  const label = DIFF_LABELS[d] || 'easy';
  return <Badge variant={label}>{d}</Badge>;
}