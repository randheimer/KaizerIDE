import React from 'react';
import Icon from '../../../Common/Icon';

function RunCommandRenderer({ message, index, toolResult, onToggleExpanded }) {
  const { args } = message;
  const command = args.command || '';
  const output = toolResult?.result || '';
  const exitCodeMatch = output.match(/\[exit: (\d+)\]/);
  const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0;
  const preview = command.length > 40 ? `${command.slice(0, 40)}...` : command;

  return (
    <div className="tool-card run-command">
      <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
        <Icon name="Terminal" size={13} className="tool-icon" />
        <span className="tool-filename">$ {preview}</span>
        <span className={`tool-badge ${exitCode === 0 ? 'green' : 'red'}`}>
          Exit {exitCode}
        </span>
        <Icon
          name={message.expanded ? 'ChevronDown' : 'ChevronRight'}
          size={12}
          className="tool-chevron"
        />
      </div>
      {message.expanded && (
        <div className="tool-card-content">
          <pre>
            <code>{output || 'No output'}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default React.memo(RunCommandRenderer);
