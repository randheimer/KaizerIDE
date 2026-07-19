import React from 'react';
import Icon from '../../../Common/Icon';

function SearchFilesRenderer({ message, index, toolResult, onToggleExpanded }) {
  const { args } = message;
  const query = args.query || '';
  const output = toolResult?.result || '';
  const results = output.split('\n').filter((l) => l.trim()).length;

  return (
    <div className="tool-card search-files">
      <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
        <Icon name="Search" size={13} className="tool-icon" />
        <span className="tool-filename">search: {query}</span>
        <span className="tool-badge">{results} results</span>
        <Icon
          name={message.expanded ? 'ChevronDown' : 'ChevronRight'}
          size={12}
          className="tool-chevron"
        />
      </div>
      {message.expanded && (
        <div className="tool-card-content">
          <pre>
            <code>{output}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default React.memo(SearchFilesRenderer);
