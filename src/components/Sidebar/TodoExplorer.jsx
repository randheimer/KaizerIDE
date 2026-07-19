import React, { useState, useEffect, useCallback } from 'react';
import './TodoExplorer.css';

const TODO_TAGS = ['TODO', 'FIXME', 'HACK', 'XXX', 'BUG', 'NOTE', 'WARN'];
const TAG_COLORS = {
  TODO: '#3b82f6',
  FIXME: '#ef4444',
  HACK: '#f59e0b',
  XXX: '#ef4444',
  BUG: '#ef4444',
  NOTE: '#22c55e',
  WARN: '#f59e0b',
};

function TodoExplorer({ workspacePath, onFileOpen }) {
  const [todos, setTodos] = useState([]);
  const [searching, setSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [filter, setFilter] = useState('all');

  const scanTodos = useCallback(async () => {
    if (!workspacePath) return;
    setSearching(true);

    try {
      const results = [];
      for (const tag of TODO_TAGS) {
        const result = await window.electron?.searchFiles?.(tag, workspacePath);
        if (result?.success) {
          for (const match of result.results) {
            const content = match.content || '';
            const tagMatch = content.match(new RegExp(`\\b(${TODO_TAGS.join('|')})\\b[:\\s]*(.*)`, 'i'));
            if (tagMatch) {
              results.push({
                file: match.file,
                line: match.line,
                tag: tagMatch[1].toUpperCase(),
                text: tagMatch[2]?.trim() || content.trim(),
              });
            }
          }
        }
      }

      // Sort by tag priority, then file, then line
      const tagOrder = { FIXME: 0, BUG: 1, XXX: 2, HACK: 3, TODO: 4, WARN: 5, NOTE: 6 };
      results.sort((a, b) =>
        (tagOrder[a.tag] ?? 99) - (tagOrder[b.tag] ?? 99) ||
        a.file.localeCompare(b.file) ||
        a.line - b.line
      );

      setTodos(results);
      const files = new Set(results.map(r => r.file));
      setExpandedFiles(files);
    } catch (err) {
      console.error('[TodoExplorer] Scan failed:', err);
    }
    setSearching(false);
  }, [workspacePath]);

  useEffect(() => {
    scanTodos();
  }, [scanTodos]);

  // Re-scan on file save
  useEffect(() => {
    const handler = () => scanTodos();
    window.addEventListener('kaizer:file-saved', handler);
    return () => window.removeEventListener('kaizer:file-saved', handler);
  }, [scanTodos]);

  const toggleFile = (file) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  const filteredTodos = filter === 'all'
    ? todos
    : todos.filter(t => t.tag === filter);

  const grouped = filteredTodos.reduce((acc, todo) => {
    if (!acc[todo.file]) acc[todo.file] = [];
    acc[todo.file].push(todo);
    return acc;
  }, {});

  const relPath = (fullPath) => {
    if (!fullPath) return '';
    if (workspacePath && fullPath.startsWith(workspacePath)) {
      return fullPath.slice(workspacePath.length).replace(/^[/\\]/, '');
    }
    return fullPath;
  };

  const tagCounts = todos.reduce((acc, t) => {
    acc[t.tag] = (acc[t.tag] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="todo-explorer">
      <div className="todo-header">
        <span>TODO EXPLORER</span>
        <button className="todo-refresh" onClick={scanTodos} title="Refresh">↻</button>
      </div>

      {/* Filter buttons */}
      <div className="todo-filters">
        <button
          className={`todo-filter ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({todos.length})
        </button>
        {Object.entries(tagCounts).map(([tag, count]) => (
          <button
            key={tag}
            className={`todo-filter ${filter === tag ? 'active' : ''}`}
            onClick={() => setFilter(tag)}
            style={{ color: TAG_COLORS[tag] }}
          >
            {tag} ({count})
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="todo-list">
        {searching ? (
          <div className="todo-empty">Scanning workspace...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="todo-empty">
            {todos.length === 0 ? 'No TODOs found' : 'No items matching filter'}
          </div>
        ) : (
          Object.entries(grouped).map(([file, items]) => (
            <div key={file} className="todo-file-group">
              <button
                className="todo-file-header"
                onClick={() => toggleFile(file)}
              >
                <span className="todo-chevron">{expandedFiles.has(file) ? '▼' : '▶'}</span>
                <span className="todo-filename">{relPath(file)}</span>
                <span className="todo-count">{items.length}</span>
              </button>
              {expandedFiles.has(file) && items.map((item, i) => (
                <button
                  key={i}
                  className="todo-item"
                  onClick={() => {
                    onFileOpen?.(item.file, { fileOnly: true });
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('kaizer:go-to-line', { detail: { line: item.line } }));
                    }, 150);
                  }}
                >
                  <span
                    className="todo-tag"
                    style={{ color: TAG_COLORS[item.tag], borderColor: TAG_COLORS[item.tag] }}
                  >
                    {item.tag}
                  </span>
                  <span className="todo-text">{item.text}</span>
                  <span className="todo-line">:{item.line}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TodoExplorer;
