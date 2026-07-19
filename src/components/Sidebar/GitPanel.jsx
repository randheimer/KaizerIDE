import React, { useState, useEffect, useRef } from 'react';
import { useGitStore } from '../../lib/stores/gitStore';
import './GitPanel.css';

const STATUS_LABELS = {
  'M': { label: 'M', title: 'Modified', color: '#e2c04d' },
  'A': { label: 'A', title: 'Added', color: '#73c991' },
  'D': { label: 'D', title: 'Deleted', color: '#f14c4c' },
  '?': { label: 'U', title: 'Untracked', color: '#8a8a8a' },
  'C': { label: 'C', title: 'Conflict', color: '#f14c4c' },
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function GitPanel({ workspacePath, onFileOpen }) {
  const {
    isRepo, currentBranch, branches, changedFiles, stagedFiles,
    commits, loading, error,
    init, refresh, stage, unstage, commit, checkout, getDiff,
    getCommitDetails, getCommitFileDiff,
  } = useGitStore();

  const [commitMsg, setCommitMsg] = useState('');
  const [expandedSections, setExpandedSections] = useState({ changes: true, staged: true, branches: false, history: false });
  const [committing, setCommitting] = useState(false);
  const [expandedCommit, setExpandedCommit] = useState(null); // hash of expanded commit
  const [commitDetails, setCommitDetails] = useState({}); // { [hash]: { files, diff, stat } }
  const [loadingCommit, setLoadingCommit] = useState(null);
  const [inlineDiffFile, setInlineDiffFile] = useState(null); // { path, diff }
  const [loadingDiff, setLoadingDiff] = useState(false);

  // Init git when workspace changes
  useEffect(() => {
    if (workspacePath) init(workspacePath);
  }, [workspacePath, init]);

  // Auto-refresh on file save
  useEffect(() => {
    const handler = () => { if (workspacePath) refresh(workspacePath); };
    window.addEventListener('kaizer:file-saved', handler);
    return () => window.removeEventListener('kaizer:file-saved', handler);
  }, [workspacePath, refresh]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStageAll = () => {
    const files = changedFiles.map(f => f.path);
    if (files.length > 0) stage(workspacePath, files);
  };

  const handleUnstageAll = () => {
    if (stagedFiles.length > 0) unstage(workspacePath, stagedFiles);
  };

  const handleCommit = async () => {
    if (!commitMsg.trim() || stagedFiles.length === 0) return;
    setCommitting(true);
    const result = await commit(workspacePath, commitMsg.trim());
    if (result.success) setCommitMsg('');
    setCommitting(false);
  };

  const handleFileClick = async (filePath, showDiff = false) => {
    const fullPath = workspacePath ? `${workspacePath}\\${filePath}` : filePath;

    if (showDiff && getDiff) {
      setLoadingDiff(true);
      setInlineDiffFile(null);
      try {
        const diffResult = await getDiff(workspacePath, filePath);
        if (diffResult?.success !== false) {
          setInlineDiffFile({ path: filePath, diff: typeof diffResult === 'string' ? diffResult : diffResult?.diff || '' });
        }
      } catch (err) {
        console.error('[GitPanel] Failed to get diff:', err);
      }
      setLoadingDiff(false);
      return;
    }

    if (onFileOpen) {
      onFileOpen(fullPath, { fileOnly: true });
    }
  };

  const handleOpenDiffInEditor = (filePath) => {
    const fullPath = workspacePath ? `${workspacePath}\\${filePath}` : filePath;
    window.dispatchEvent(new CustomEvent('kaizer:open-diff', {
      detail: {
        path: fullPath,
        diff: inlineDiffFile?.diff || '',
        fileName: filePath,
      }
    }));
  };

  const handleCommitClick = async (hash) => {
    if (expandedCommit === hash) {
      setExpandedCommit(null);
      return;
    }
    setExpandedCommit(hash);
    if (!commitDetails[hash]) {
      setLoadingCommit(hash);
      const details = await getCommitDetails(workspacePath, hash);
      if (details) {
        setCommitDetails(prev => ({ ...prev, [hash]: details }));
      }
      setLoadingCommit(null);
    }
  };

  const handleCommitFileClick = async (hash, filePath) => {
    setLoadingDiff(true);
    setInlineDiffFile(null);
    const diff = await getCommitFileDiff(workspacePath, hash, filePath);
    setInlineDiffFile({ path: filePath, diff });
    setLoadingDiff(false);
  };

  const handleBranchSwitch = (branch) => {
    checkout(workspacePath, branch);
  };

  if (!isRepo) {
    return (
      <div className="git-panel">
        <div className="git-panel-header">
          <span>SOURCE CONTROL</span>
        </div>
        <div className="git-empty">
          <p>This folder is not a git repository.</p>
          <p className="git-empty-hint">Initialize one with <code>git init</code></p>
        </div>
      </div>
    );
  }

  const unstagedChanges = changedFiles.filter(f => !stagedFiles.includes(f.path));
  const hasChanges = unstagedChanges.length > 0 || stagedFiles.length > 0;

  return (
    <div className="git-panel">
      <div className="git-panel-header">
        <span>SOURCE CONTROL</span>
        <button className="git-refresh-btn" onClick={() => refresh(workspacePath)} title="Refresh">
          ↻
        </button>
      </div>

      {/* Branch selector */}
      <div className="git-branch-bar">
        <select
          className="git-branch-select"
          value={currentBranch || ''}
          onChange={(e) => handleBranchSwitch(e.target.value)}
        >
          {branches.map(b => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
        {currentBranch && <span className="git-branch-icon">⎇</span>}
      </div>

      {error && <div className="git-error">{error}</div>}

      {/* Commit message + button */}
      {stagedFiles.length > 0 && (
        <div className="git-commit-area">
          <input
            type="text"
            className="git-commit-input"
            placeholder="Commit message…"
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
            disabled={committing}
          />
          <button
            className="git-commit-btn"
            onClick={handleCommit}
            disabled={!commitMsg.trim() || committing}
            title="Commit staged changes"
          >
            {committing ? '…' : '✓'}
          </button>
        </div>
      )}

      {/* Staged changes */}
      {stagedFiles.length > 0 && (
        <div className="git-section">
          <button className="git-section-header" onClick={() => toggleSection('staged')}>
            <span className="git-chevron">{expandedSections.staged ? '▼' : '▶'}</span>
            <span>Staged Changes</span>
            <span className="git-badge">{stagedFiles.length}</span>
            <button
              className="git-inline-btn"
              onClick={(e) => { e.stopPropagation(); handleUnstageAll(); }}
              title="Unstage All"
            >−</button>
          </button>
          {expandedSections.staged && stagedFiles.map(file => (
            <div key={file} className="git-file-item staged">
              <span className="git-file-status" style={{ color: '#73c991' }}>A</span>
              <button className="git-file-name" onClick={() => handleFileClick(file)}>
                {file}
              </button>
              <button
                className="git-inline-btn"
                onClick={() => unstage(workspacePath, [file])}
                title="Unstage"
              >−</button>
            </div>
          ))}
        </div>
      )}

      {/* Unstaged changes */}
      {unstagedChanges.length > 0 && (
        <div className="git-section">
          <button className="git-section-header" onClick={() => toggleSection('changes')}>
            <span className="git-chevron">{expandedSections.changes ? '▼' : '▶'}</span>
            <span>Changes</span>
            <span className="git-badge">{unstagedChanges.length}</span>
            <button
              className="git-inline-btn"
              onClick={(e) => { e.stopPropagation(); handleStageAll(); }}
              title="Stage All"
            >+</button>
          </button>
          {expandedSections.changes && unstagedChanges.map(file => {
            const info = STATUS_LABELS[file.status] || STATUS_LABELS['?'];
            const isActive = inlineDiffFile?.path === file.path;
            return (
              <div key={file.path} className={`git-file-item ${isActive ? 'active' : ''}`}>
                <span className="git-file-status" style={{ color: info.color }} title={info.title}>
                  {info.label}
                </span>
                <button className="git-file-name" onClick={() => handleFileClick(file.path, true)} title="Click to view diff">
                  {file.path}
                </button>
                <button
                  className="git-inline-btn"
                  onClick={() => stage(workspacePath, [file.path])}
                  title="Stage"
                >+</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline diff preview */}
      {inlineDiffFile && (
        <div className="git-inline-diff">
          <div className="git-inline-diff-header">
            <span className="git-inline-diff-file">{inlineDiffFile.path}</span>
            <div className="git-inline-diff-actions">
              <button
                className="git-inline-btn"
                onClick={() => handleOpenDiffInEditor(inlineDiffFile.path)}
                title="Open in Editor"
              >↗</button>
              <button
                className="git-inline-btn"
                onClick={() => setInlineDiffFile(null)}
                title="Close"
              >×</button>
            </div>
          </div>
          <pre className="git-inline-diff-content">
            {inlineDiffFile.diff ? (
              inlineDiffFile.diff.split('\n').map((line, i) => {
                let cls = '';
                if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-add';
                else if (line.startsWith('-') && !line.startsWith('---')) cls = 'diff-del';
                else if (line.startsWith('@@')) cls = 'diff-hunk';
                else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) cls = 'diff-meta';
                return <div key={i} className={cls}>{line}</div>;
              })
            ) : (
              <div className="diff-empty">No diff content</div>
            )}
          </pre>
        </div>
      )}
      {loadingDiff && <div className="git-loading">Loading diff…</div>}

      {/* No changes */}
      {!hasChanges && !loading && !inlineDiffFile && (
        <div className="git-clean">
          <span>No changes</span>
        </div>
      )}

      {/* Commit history */}
      {commits.length > 0 && (
        <div className="git-section">
          <button className="git-section-header" onClick={() => toggleSection('history')}>
            <span className="git-chevron">{expandedSections.history ? '▼' : '▶'}</span>
            <span>History</span>
            <span className="git-badge">{commits.length}</span>
          </button>
          {expandedSections.history && commits.slice(0, 30).map(c => {
            const isExpanded = expandedCommit === c.hash;
            const details = commitDetails[c.hash];
            return (
              <div key={c.hash} className={`git-commit-item ${isExpanded ? 'expanded' : ''}`}>
                <button className="git-commit-row" onClick={() => handleCommitClick(c.hash)}>
                  <div className="git-commit-main">
                    <span className="git-commit-hash">{c.hash.slice(0, 7)}</span>
                    <span className="git-commit-msg">{c.message}</span>
                  </div>
                  <div className="git-commit-meta">
                    <span className="git-commit-author">{c.author_name}</span>
                    <span className="git-commit-date">{formatRelativeTime(c.date)}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="git-commit-details">
                    {loadingCommit === c.hash && <div className="git-loading">Loading…</div>}
                    {details && (
                      <>
                        <div className="git-commit-full-msg">
                          {c.message}
                          {c.body && <div className="git-commit-body">{c.body}</div>}
                        </div>
                        <div className="git-commit-info">
                          <span>Author: {c.author_name} &lt;{c.author_email}&gt;</span>
                          <span>Date: {new Date(c.date).toLocaleString()}</span>
                          <span>Hash: {c.hash}</span>
                        </div>
                        {details.files.length > 0 && (
                          <div className="git-commit-files">
                            <div className="git-commit-files-header">
                              Changed files ({details.files.length})
                            </div>
                            {details.files.map(f => {
                              const info = STATUS_LABELS[f.status] || STATUS_LABELS['?'];
                              return (
                                <button
                                  key={f.path}
                                  className="git-commit-file"
                                  onClick={() => handleCommitFileClick(c.hash, f.path)}
                                >
                                  <span className="git-file-status" style={{ color: info.color }}>{info.label}</span>
                                  <span className="git-commit-file-path">{f.path}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading && <div className="git-loading">Loading…</div>}
    </div>
  );
}

export default GitPanel;
