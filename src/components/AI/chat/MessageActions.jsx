import React from 'react';
import Icon from '../../Common/Icon';

/**
 * MessageActions - hover-revealed action bar shown at the top-right of
 * a chat message. Available actions depend on the message role.
 *
 * Props:
 *   role           - 'user' | 'assistant'
 *   pinned         - boolean (toggles pin icon state)
 *   onCopy         - () => void
 *   onRetry        - () => void          (user messages only)
 *   onEdit         - () => void          (user messages only)
 *   onFork         - () => void          (assistant messages only)
 *   onPin          - () => void
 */
function MessageActions({ role, pinned, onCopy, onRetry, onEdit, onFork, onPin }) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  return (
    <div className="message-actions" role="toolbar" aria-label="Message actions">
      {onCopy && (
        <button
          className="msg-action-btn"
          onClick={onCopy}
          title="Copy"
          aria-label="Copy message"
        >
          <Icon name="Copy" size={13} />
        </button>
      )}
      {isUser && onEdit && (
        <button
          className="msg-action-btn"
          onClick={onEdit}
          title="Edit and resend"
          aria-label="Edit message"
        >
          <Icon name="Pencil" size={13} />
        </button>
      )}
      {isUser && onRetry && (
        <button
          className="msg-action-btn"
          onClick={onRetry}
          title="Retry from here"
          aria-label="Retry from this message"
        >
          <Icon name="RotateCcw" size={13} />
        </button>
      )}
      {isAssistant && onFork && (
        <button
          className="msg-action-btn"
          onClick={onFork}
          title="Fork into a new chat"
          aria-label="Fork chat from here"
        >
          <Icon name="GitBranch" size={13} />
        </button>
      )}
      {onPin && (
        <button
          className={`msg-action-btn ${pinned ? 'is-pinned' : ''}`}
          onClick={onPin}
          title={pinned ? 'Unpin' : 'Pin'}
          aria-label={pinned ? 'Unpin message' : 'Pin message'}
          aria-pressed={!!pinned}
        >
          <Icon name={pinned ? 'PinOff' : 'Pin'} size={13} />
        </button>
      )}
    </div>
  );
}

export default React.memo(MessageActions);
