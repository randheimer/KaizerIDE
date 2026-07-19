import React from 'react';
import { useToastStore } from '../../lib/stores/toastStore';
import Icon from './Icon';
import './Toaster.css';

const TYPE_ICON = {
  info: 'Info',
  success: 'CheckCircle2',
  error: 'XCircle',
  warning: 'AlertTriangle',
};

/**
 * Toaster - fixed-position stack that renders all active toasts.
 * Mount once near the app root.
 */
function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster-root" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} role="status">
          <Icon name={TYPE_ICON[t.type] || 'Info'} size={14} className="toast__icon" />
          <span className="toast__msg">{t.msg}</span>
          <button
            className="toast__close"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
          >
            <Icon name="X" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default React.memo(Toaster);
