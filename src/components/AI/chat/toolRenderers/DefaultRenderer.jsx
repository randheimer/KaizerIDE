import React from 'react';
import Icon from '../../../Common/Icon';

/**
 * Fallback renderer for unrecognized tool names.
 * Shows a pill with a truncated args preview; expanding reveals full JSON.
 */
function DefaultRenderer({ message, index, onToggleExpanded }) {
  const { name, args } = message;
  const argsJson = JSON.stringify(args);
  const argsPreview = argsJson.slice(0, 50);
  return (
    <div className="message">
      <div className="tool-pill" onClick={() => onToggleExpanded(index)}>
        <Icon name="Settings2" size={12} />
        <span style={{ marginLeft: 6 }}>
          {name}({argsPreview}
          {argsJson.length > 50 ? '...' : ''})
        </span>
      </div>
      {message.expanded && (
        <div className="tool-details">{JSON.stringify(args, null, 2)}</div>
      )}
    </div>
  );
}

export default React.memo(DefaultRenderer);
