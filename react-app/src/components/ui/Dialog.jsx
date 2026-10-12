import { useEffect } from 'react';
import './dialog.css';

export function Dialog({ open, onClose, title, children, maxWidth = 780 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="brx-dialog-overlay" onClick={onClose}>
      <div
        className="brx-dialog"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brx-dialog-head">
          <h3 className="bold upper">{title}</h3>
          <button className="brx-dialog-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="brx-dialog-body">{children}</div>
      </div>
    </div>
  );
}