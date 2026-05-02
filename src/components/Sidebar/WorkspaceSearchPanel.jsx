import React, { useState, useRef, useCallback, useEffect } from 'react';
import { indexer } from '../../lib/indexer';
import './WorkspaceSearchPanel.css';

/**
 * WorkspaceSearchPanel — full-project search in the sidebar Search tab.
 *
 * Uses indexer.grep() for fast cached-preview search, falls back to
 * window.electron.searchFiles() for full-content search.
 */
function WorkspaceSearchPanel({ workspacePath, onFileOpen }) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Group results by file
  const groupedResults = React.useMemo(() => {
    const groups = new Map();
    for (const r of results) {
      const p = r.path || '';
      if (!p) continue;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(r);
    }
    return Array.from(groups.entries());
  }, [results]);

  // Auto-expand all files when results change
  useEffect(() => {
    setExpandedFiles(new Set(groupedResults.map(([path]) => path)));
  }, [groupedResults]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);

    try {
      // Try full-content search via electron IPC first
      if (window.electron?.searchFiles && workspacePath) {
        const result = await window.electron.searchFiles(q, workspacePath);
        if (result.success && result.results?.length > 0) {
          // Normalize: IPC returns { file, line, content }, we use { path, line, content }
          let filtered = result.results.map(r => ({
            path: r.file || r.path || '',
            line: r.line || 0,
            content: r.content || '',
          }));
          if (!useRegex) {
            const needle = matchCase ? q : q.toLowerCase();
            filtered = filtered.filter((r) => {
              const content = matchCase ? r.content : r.content.toLowerCase();
              if (wholeWord) {
                const regex = new RegExp(`\\b${escapeRegex(needle)}\\b`, matchCase ? '' : 'i');
                return regex.test(r.content);
              }
              return content.includes(needle);
            });
          }
          setResults(filtered.slice(0, 200));
          setSearching(false);
          return;
        }
      }

      // Fallback: indexer grep (searches cached previews only)
      const grepResults = indexer.grep(q, 100);
      setResults(grepResults);
    } catch (err) {
      console.error('[WorkspaceSearch] Search error:', err);
      setResults([]);
    }
    setSearching(false);
  }, [workspacePath, matchCase, wholeWord, useRegex]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    // Debounce search
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(val), 250);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      clearTimeout(searchTimeoutRef.current);
      doSearch(query);
    }
    if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
    }
  };

  const handleResultClick = (path, line) => {
    if (!path || !onFileOpen) return;
    onFileOpen(path, { fileOnly: true });
    // Dispatch event to jump to line after file opens
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kaizer:go-to-line', { detail: { line } }));
    }, 150);
  };

  const toggleFileExpand = (path) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const highlightMatch = (text, q) => {
    if (!text || !q.trim() || useRegex) return text || '';
    const needle = matchCase ? q : q.toLowerCase();
    const lower = matchCase ? text : text.toLowerCase();
    const idx = lower.indexOf(needle);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="wsp-highlight">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  // Get relative path for display
  const relPath = (fullPath) => {
    if (!fullPath) return '';
    if (workspacePath && fullPath.startsWith(workspacePath)) {
      return fullPath.slice(workspacePath.length).replace(/^\\/, '');
    }
    return fullPath;
  };

  const fileName = (fullPath) => {
    if (!fullPath) return '';
    const parts = fullPath.split(/[\\/]/);
    return parts[parts.length - 1] || fullPath;
  };

  return (
    <div className="wsp-panel">
      <div className="wsp-header">
        <span>SEARCH</span>
      </div>

      {/* Search input */}
      <div className="wsp-row">
        <input
          ref={inputRef}
          type="text"
          className="wsp-input"
          placeholder="Search workspace…"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="wsp-toggles">
          <button
            className={`wsp-toggle${matchCase ? ' active' : ''}`}
            onClick={() => { setMatchCase(!matchCase); setTimeout(() => doSearch(query), 0); }}
            title="Match Case"
          >Aa</button>
          <button
            className={`wsp-toggle${wholeWord ? ' active' : ''}`}
            onClick={() => { setWholeWord(!wholeWord); setTimeout(() => doSearch(query), 0); }}
            title="Whole Word"
          >Ab</button>
          <button
            className={`wsp-toggle${useRegex ? ' active' : ''}`}
            onClick={() => { setUseRegex(!useRegex); setTimeout(() => doSearch(query), 0); }}
            title="Regex"
          >.*</button>
        </div>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="wsp-row">
          <input
            type="text"
            className="wsp-input"
            placeholder="Replace…"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
          />
        </div>
      )}

      {/* Toggle replace */}
      <div className="wsp-actions">
        <button
          className="wsp-action-btn"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace"
        >
          {showReplace ? '▲ Replace' : '▼ Replace'}
        </button>
        {query && (
          <span className="wsp-count">
            {searching ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="wsp-results">
        {!query && (
          <div className="wsp-empty">Type to search across all files in the workspace</div>
        )}
        {query && !searching && results.length === 0 && (
          <div className="wsp-empty">No results found</div>
        )}
        {groupedResults.map(([path, matches]) => {
          const expanded = expandedFiles.has(path);
          return (
            <div key={path} className="wsp-file-group">
              <button
                className="wsp-file-header"
                onClick={() => toggleFileExpand(path)}
              >
                <span className="wsp-chevron">{expanded ? '▼' : '▶'}</span>
                <span className="wsp-file-name">{fileName(path)}</span>
                <span className="wsp-file-path">{relPath(path)}</span>
                <span className="wsp-file-count">{matches.length}</span>
              </button>
              {expanded && matches.map((m, i) => (
                <button
                  key={i}
                  className="wsp-match"
                  onClick={() => handleResultClick(m.path, m.line)}
                  title={(m.content || '').trim()}
                >
                  <span className="wsp-line-num">{m.line}</span>
                  <span className="wsp-line-content">
                    {highlightMatch((m.content || '').trim().slice(0, 200), query)}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default WorkspaceSearchPanel;
