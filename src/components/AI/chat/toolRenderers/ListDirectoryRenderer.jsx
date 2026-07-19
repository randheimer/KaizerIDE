import React from 'react';
import Icon from '../../../Common/Icon';

function ListDirectoryRenderer({ message, index, toolResult, onToggleExpanded }) {
  const { args } = message;
  const dirPath = args.path || '.';
  const content = toolResult?.result || '';

  return (
    <div className="tool-card list-directory">
      <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
        <Icon name="FolderOpen" size={13} className="tool-icon" />
        <span className="tool-filename">{dirPath}</span>
        <span className="tool-badge">Listed</span>
        <Icon
          name={message.expanded ? 'ChevronDown' : 'ChevronRight'}
          size={12}
          className="tool-chevron"
        />
      </div>
      {message.expanded && (
        <div className="tool-card-content">
          <pre>
            <code>{content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default React.memo(ListDirectoryRenderer);
