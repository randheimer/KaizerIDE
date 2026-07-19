import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import './GoToFile.css';

/**
 * Flatten a file tree (from electron.getFileTree) into a flat list of { path, name, isDir }.
 */
function flattenTree(nodes, parentPath = '') {
  const result = [];
  if (!nodes) return result;
  for (const node of nodes) {
    const fullPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
    if (node.isDirectory) {
      result.push({ path: fullPath, name: node.name, isDir: true });
      result.push(...flattenTree(node.children, fullPath));
    } else {
      result.push({ path: fullPath, name: node.name, isDir: false });
    }
  }
  return result;
}

/**
 * Simple fuzzy subsequence scorer. Returns score (higher = better) or -1 if no match.
 * Same algorithm as CommandPalette for consistency.
 */
function fuzzyScore(haystack, needle) {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let score = 0;
  let hi = 0;
  let lastMatchIdx = -1;
  for (let ni = 0; ni < n.length; ni++) {
    const ch = n[ni];
    const found = h.indexOf(ch, hi);
    if (found === -1) return -1;
    if (lastMatchIdx !== -1 && found === lastMatchIdx + 1) score += 5;
    if (found === 0 || /[\s_\-./\\]/.test(h[found - 1])) score += 3;
    if (haystack[found] === needle[ni]) score += 1;
    score += 1;
    lastMatchIdx = found;
    hi = found + 1;
  }
  score -= haystack.length * 0.01;
  return score;
}

/**
 * Get file extension badge info (reuses FileExplorer pattern).
 */
function getFileExt(name) {
  if (name === '.gitignore') return 'git';
  if (name.endsWith('.lock')) return 'lock';
  return name.split('.').pop()?.toLowerCase() || '';
}

const EXT_COLORS = {
  js: '#f7df1e', mjs: '#f7df1e', ts: '#3178c6', jsx: '#61dafb', tsx: '#61dafb',
  py: '#3572A5', rs: '#ce422b', cpp: '#00599c', c: '#555', h: '#555',
  go: '#00add8', java: '#b07219', html: '#e44d26', css: '#563d7c',
  json: '#cbcb41', md: '#083fa1', yml: '#cb171e', yaml: '#cb171e',
  sh: '#89e051', lua: '#000080', cs: '#178600', kt: '#A97BFF',
};

function GoToFile({ workspacePath, onClose, onFileOpen }) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load file tree on mount
  useEffect(() => {
    if (!workspacePath) return;
    let cancelled = false;
    setLoading(true);

    window.electron.getFileTree(workspacePath).then((result) => {
      if (cancelled) return;
      if (result.success && result.tree) {
        const flat = flattenTree(result.tree).filter((f) => !f.isDir);
        setFiles(flat);
      }
      setLoading(false);
    });

    requestAnimationFrame(() => inputRef.current?.focus());
    return () => { cancelled = true; };
  }, [workspacePath]);

  // Reset on open
  useEffect(() => {
    setQuery('');
    setSelectedIdx(0);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent files first, then alphabetical
      return files.slice(0, 50);
    }
    const scored = files
      .map((f) => {
        // Score against both full path and just filename
        const nameScore = fuzzyScore(f.name, query);
        const pathScore = fuzzyScore(f.path, query);
        const score = Math.max(nameScore, pathScore);
        return { file: f, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    return scored.map((x) => x.file);
  }, [files, query]);

  // Clamp selection
  useEffect(() => {
    setSelectedIdx((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-gtf-idx="${selectedIdx}"]`);
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const handleSelect = useCallback((file) => {
    if (file && !file.isDir) {
      onFileOpen(file.path, { fileOnly: true });
      onClose();
    }
  }, [onFileOpen, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filtered[selectedIdx]);
      return;
    }
    // Tab to accept first result
    if (e.key === 'Tab') {
      e.preventDefault();
      if (filtered.length > 0) handleSelect(filtered[0]);
    }
  };

  // Highlight matched characters in filename
  const renderHighlightedName = (name) => {
    if (!query.trim()) return name;
    const n = query.toLowerCase();
    const h = name.toLowerCase();
    const indices = new Set();
    let hi = 0;
    for (let ni = 0; ni < n.length; ni++) {
      const found = h.indexOf(n[ni], hi);
      if (found === -1) break;
      indices.add(found);
      hi = found + 1;
    }
    if (indices.size === 0) return name;
    return name.split('').map((ch, i) => (
      indices.has(i) ? <span key={i} className="gtf-highlight">{ch}</span> : ch
    ));
  };

  return (
    <div className="gtf-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gtf-modal" role="dialog" aria-label="Go to File">
        <input
          ref={inputRef}
          className="gtf-input"
          type="text"
          placeholder="Search files by name…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="gtf-list" ref={listRef}>
          {loading ? (
            <div className="gtf-empty">Loading files…</div>
          ) : filtered.length === 0 ? (
            <div className="gtf-empty">{query ? 'No matching files' : 'No files in workspace'}</div>
          ) : (
            filtered.map((file, idx) => {
              const ext = getFileExt(file.name);
              const color = EXT_COLORS[ext] || '#666';
              // Show relative path from workspace
              const relPath = workspacePath
                ? file.path.replace(workspacePath, '').replace(/^\\/, '')
                : file.path;
              const dir = relPath.includes('\\') ? relPath.substring(0, relPath.lastIndexOf('\\')) : '';

              return (
                <div
                  key={file.path}
                  data-gtf-idx={idx}
                  className={`gtf-item${idx === selectedIdx ? ' active' : ''}`}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => handleSelect(file)}
                >
                  <span className="gtf-ext-badge" style={{ background: color }}>
                    {ext.toUpperCase().slice(0, 4)}
                  </span>
                  <div className="gtf-item-info">
                    <span className="gtf-item-name">{renderHighlightedName(file.name)}</span>
                    {dir && <span className="gtf-item-path">{dir}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="gtf-footer">
          <span className="gtf-hint">↑↓ navigate</span>
          <span className="gtf-hint">Enter open</span>
          <span className="gtf-hint">Tab accept first</span>
          <span className="gtf-hint">Esc close</span>
        </div>
      </div>
    </div>
  );
}

export default GoToFile;
