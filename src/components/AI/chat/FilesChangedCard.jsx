import React, { useState } from 'react';

const FILE_ICON_MAP = {
  js: '📜', jsx: '⚛️', ts: '📘', tsx: '⚛️',
  css: '🎨', html: '🌐', json: '📋',
  md: '📝', txt: '📄', py: '🐍',
  java: '☕', cpp: '⚙️', c: '⚙️',
};

function getFileIcon(name) {
  if (!name || typeof name !== 'string') return '📄';
  const ext = name.split('.').pop()?.toLowerCase();
  return FILE_ICON_MAP[ext] || '📄';
}

/**
 * Card showing the set of files changed in the current agent turn,
 * with aggregate +/- line counts and per-file rows + Keep/Undo controls.
 */
function FilesChangedCard({ files, undoStack, onUndo, onAccept, onOpenFile }) {
  const [expanded, setExpanded] = useState(true);

  const totalAdded = files.reduce((sum, f) => sum + f.addedLines, 0);
  const totalRemoved = files.reduce((sum, f) => sum + f.removedLines, 0);

  const handleCopyPaths = () => {
    const paths = files.map((f) => f.path).join('\n');
    navigator.clipboard.writeText(paths);
  };

  return (
    <div className="files-changed-card">
      <div className="files-changed-header">
        <span
          className="files-changed-chevron"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▾' : '▸'}
        </span>
        <span className="files-changed-count">
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </span>
        {totalAdded > 0 && <span className="files-changed-stat stat-add">+{totalAdded}</span>}
        {totalRemoved > 0 && <span className="files-changed-stat stat-remove">-{totalRemoved}</span>}
        <div className="files-changed-spacer"></div>
        <button className="files-changed-btn btn-keep" onClick={onAccept}>
          Keep
        </button>
        <button className="files-changed-btn btn-undo" onClick={onUndo}>
          Undo
        </button>
        <button
          className="files-changed-btn btn-copy"
          onClick={handleCopyPaths}
          title="Copy file paths"
        >
          📋
        </button>
      </div>
      {expanded && (
        <div className="files-changed-rows">
          {files.map((file, idx) => {
            const dirPath = file.path
              ? file.path.split(/[\\/]/).slice(0, -1).join('/')
              : '';
            const fileName =
              file.name || (file.path ? file.path.split(/[\\/]/).pop() : 'unknown');
            const isNewFile = file.isNew || undoStack[file.path] === null;

            return (
              <div
                key={idx}
                className="files-changed-row"
                onClick={() => onOpenFile && onOpenFile(file.path)}
              >
                <div className="files-changed-row-left">
                  {isNewFile && <span className="new-file-indicator">+</span>}
                  <span className="files-changed-icon">{getFileIcon(fileName)}</span>
                  <span className="files-changed-filename">{fileName}</span>
                  <span className="files-changed-dirpath">{dirPath}</span>
                </div>
                <div className="files-changed-row-right">
                  {file.addedLines > 0 && <span className="stat-add">+{file.addedLines}</span>}
                  {file.removedLines > 0 && (
                    <span className="stat-remove">-{file.removedLines}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(FilesChangedCard);
