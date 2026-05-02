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

function GitPanel({ workspacePath, onFileOpen }) {
  const {
    isRepo, currentBranch, branches, changedFiles, stagedFiles,
    commits, loading, error,
    init, refresh, stage, unstage, commit, checkout, getDiff
  } = useGitStore();

  const [commitMsg, setCommitMsg] = useState('');
  const [expandedSections, setExpandedSections] = useState({ changes: true, staged: true, branches: false, history: false });
  const [committing, setCommitting] = useState(false);

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

  const handleFileClick = (filePath) => {
    if (onFileOpen) {
      const fullPath = workspacePath ? `${workspacePath}\\${filePath}` : filePath;
      onFileOpen(fullPath, { fileOnly: true });
    }
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
            return (
              <div key={file.path} className="git-file-item">
                <span className="git-file-status" style={{ color: info.color }} title={info.title}>
                  {info.label}
                </span>
                <button className="git-file-name" onClick={() => handleFileClick(file.path)}>
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

      {/* No changes */}
      {!hasChanges && !loading && (
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
          {expandedSections.history && commits.slice(0, 20).map(commit => (
            <div key={commit.hash} className="git-commit-item">
              <span className="git-commit-hash">{commit.hash.slice(0, 7)}</span>
              <span className="git-commit-msg">{commit.message}</span>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="git-loading">Loading…</div>}
    </div>
  );
}

export default GitPanel;
