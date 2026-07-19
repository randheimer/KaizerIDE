import React from 'react';
import Icon from '../../../Common/Icon';

/**
 * ContextPills - row of attached files/folders above the textarea.
 */
function ContextPills({ pills, onRemove }) {
  if (!pills || pills.length === 0) return null;
  return (
    <div className="context-pills-row">
      {pills.map((pill) => (
        <div key={pill.id} className="context-pill-new">
          <Icon
            name={pill.type === 'file' ? 'FileText' : 'Folder'}
            size={12}
            className="pill-icon"
          />
          <span className="pill-text">{pill.data.split(/[\\/]/).pop()}</span>
          <button
            className="pill-remove"
            onClick={() => onRemove(pill.id)}
            aria-label="Remove"
          >
            <Icon name="X" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default React.memo(ContextPills);
