import React from 'react';

/**
 * Card that summarizes a group of tool calls executed in a single agent turn.
 * Shows aggregate stats in the header and expandable per-tool rows.
 */
function ToolGroupCard({ group, onToggleExpanded, onToggleRowExpanded }) {
  const isRunning = group.status === 'running';
  const isDone = group.status === 'done';
  const toolCount = group.tools.length;

  const stats = React.useMemo(() => {
    let filesRead = 0;
    let filesWritten = 0;
    let filesCreated = 0;
    let filesDeleted = 0;
    let commandsRun = 0;
    let searches = 0;
    let totalLines = 0;

    group.tools.forEach((tool) => {
      switch (tool.name) {
        case 'read_file':
          filesRead++;
          if (tool.result && typeof tool.result === 'string') {
            totalLines += tool.result.split('\n').length;
          }
          break;
        case 'write_file':
          if (tool.result && tool.result.includes('written successfully')) {
            filesWritten++;
          }
          break;
        case 'run_command':
          commandsRun++;
          break;
        case 'search_files':
          searches++;
          break;
        case 'list_directory':
          break;
      }
    });

    return { filesRead, filesWritten, filesCreated, filesDeleted, commandsRun, searches, totalLines };
  }, [group.tools]);

  const getStatsText = () => {
    const parts = [];
    if (stats.filesRead > 0) parts.push(`${stats.filesRead} read`);
    if (stats.filesWritten > 0) parts.push(`${stats.filesWritten} written`);
    if (stats.commandsRun > 0) parts.push(`${stats.commandsRun} cmd`);
    if (stats.searches > 0) parts.push(`${stats.searches} search`);
    if (stats.totalLines > 0) parts.push(`~${stats.totalLines} lines`);
    return parts.length > 0 ? parts.join(' • ') : '';
  };

  return (
    <div className={`tool-group-card ${isRunning ? 'running' : ''} ${isDone ? 'done' : ''}`}>
      <div className="tool-group-header" onClick={() => onToggleExpanded(group.turnId)}>
        <div className="tool-group-left">
          <span className={`tool-group-icon ${isRunning ? 'spinning' : ''}`}>
            {isRunning ? '⚙' : '✓'}
          </span>
          <div className="tool-group-text-wrapper">
            <span className="tool-group-text">
              {isRunning ? 'Working...' : `Used ${toolCount} tool${toolCount !== 1 ? 's' : ''}`}
            </span>
            {isDone && getStatsText() && (
              <span className="tool-group-stats">{getStatsText()}</span>
            )}
          </div>
        </div>
        <span className="tool-group-chevron">{group.expanded ? '▾' : '▸'}</span>
      </div>
      {group.expanded && (
        <div className="tool-group-rows">
          {group.tools.map((tool, idx) => {
            let parsedArgs = {};
            try {
              parsedArgs = JSON.parse(tool.args);
            } catch {
              parsedArgs = {};
            }

            const filePath =
              parsedArgs.path ||
              parsedArgs.filePath ||
              parsedArgs.command ||
              parsedArgs.query ||
              '';
            const fileName = filePath.split(/[\\/]/).pop() || filePath;

            let lineCount = 0;
            if (tool.result && typeof tool.result === 'string' && tool.name === 'read_file') {
              lineCount = tool.result.split('\n').length;
            }

            let badge = '';
            let badgeClass = '';
            if (tool.name === 'write_file') {
              badge = '+';
              badgeClass = 'badge-add';
            } else if (tool.name === 'read_file') {
              badge = lineCount > 0 ? `${lineCount}L` : '';
              badgeClass = 'badge-read';
            } else if (tool.name === 'run_command') {
              badge = '⚡';
              badgeClass = 'badge-cmd';
            } else if (tool.name === 'search_files') {
              badge = '🔍';
              badgeClass = 'badge-search';
            }

            return (
              <div key={idx} className="tool-group-row">
                <div
                  className="tool-row-main"
                  onClick={() => onToggleRowExpanded(group.turnId, idx)}
                >
                  <span className={`tool-row-icon ${tool.status === 'running' ? 'spinning' : ''}`}>
                    {tool.status === 'running' ? '⟳' : tool.status === 'error' ? '✗' : '✓'}
                  </span>
                  <span className="tool-row-name">{tool.name}</span>
                  <span className="tool-row-file">{fileName}</span>
                  {badge && <span className={`tool-row-badge ${badgeClass}`}>{badge}</span>}
                </div>
                {tool.expanded && tool.result && (
                  <div className="tool-row-result">
                    <pre>
                      {typeof tool.result === 'string'
                        ? tool.result.split('\n').slice(0, 4).join('\n')
                        : JSON.stringify(tool.result, null, 2).split('\n').slice(0, 4).join('\n')}
                    </pre>
                  </div>
                )}
                {tool.expanded && !tool.result && (
                  <div className="tool-row-result">
                    <pre>No result available</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(ToolGroupCard);
