import React, { useMemo, useState } from 'react';
import Icon from '../../Common/Icon';
import { toast } from '../../../lib/stores/toastStore';
import { diffSections } from '../../../lib/diff/lineDiff';
import { highlightLine } from '../../../lib/diff/prismHighlight';

/**
 * Map file extension to a Lucide icon name + a CSS accent color variable.
 * Keeps visuals consistent with the rest of the chat chrome.
 */
const EXT_ICON_MAP = {
  js: { name: 'FileCode2', color: '#f7df1e' },
  mjs: { name: 'FileCode2', color: '#f7df1e' },
  jsx: { name: 'FileCode2', color: '#61dafb' },
  ts: { name: 'FileCode2', color: '#3178c6' },
  tsx: { name: 'FileCode2', color: '#3178c6' },
  py: { name: 'FileCode2', color: '#3776ab' },
  java: { name: 'FileCode2', color: '#e76f00' },
  c: { name: 'FileCode2', color: '#7cabdd' },
  h: { name: 'FileCode2', color: '#7cabdd' },
  cpp: { name: 'FileCode2', color: '#00599c' },
  rs: { name: 'FileCode2', color: '#dea584' },
  go: { name: 'FileCode2', color: '#00add8' },
  asm: { name: 'FileCode2', color: '#888' },
  s: { name: 'FileCode2', color: '#888' },
  css: { name: 'FileCode2', color: '#1572b6' },
  scss: { name: 'FileCode2', color: '#c6538c' },
  html: { name: 'FileCode2', color: '#e34c26' },
  json: { name: 'Braces', color: '#8b949e' },
  yaml: { name: 'Braces', color: '#cb171e' },
  yml: { name: 'Braces', color: '#cb171e' },
  toml: { name: 'Braces', color: '#9c4221' },
  md: { name: 'FileText', color: '#9ca3af' },
  txt: { name: 'FileText', color: '#9ca3af' },
  sh: { name: 'Terminal', color: '#4caf50' },
  bash: { name: 'Terminal', color: '#4caf50' },
  ps1: { name: 'Terminal', color: '#012456' },
};

function getFileIcon(name) {
  if (!name || typeof name !== 'string') return { name: 'File', color: 'var(--text-2)' };
  const ext = name.split('.').pop()?.toLowerCase();
  return EXT_ICON_MAP[ext] || { name: 'File', color: 'var(--text-2)' };
}

/**
 * Card showing the set of files changed in the current agent turn,
 * with aggregate +/- line counts, per-file rows + Keep/Undo controls,
 * and an inline unified-diff preview for each file (click a row to toggle).
 */
function FilesChangedCard({ files, undoStack, onUndo, onAccept, onOpenFile }) {
  const [expanded, setExpanded] = useState(true);
  const [openDiff, setOpenDiff] = useState(null);

  const totalAdded = files.reduce((sum, f) => sum + f.addedLines, 0);
  const totalRemoved = files.reduce((sum, f) => sum + f.removedLines, 0);

  const handleCopyPaths = async () => {
    const paths = files.map((f) => f.path).join('\n');
    try {
      await navigator.clipboard.writeText(paths);
      toast.success('File paths copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="files-changed-card">
      <div className="files-changed-header">
        <button
          className="files-changed-chevron"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          type="button"
        >
          <Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={14} />
        </button>
        <span className="files-changed-count">
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </span>
        {totalAdded > 0 && <span className="files-changed-stat stat-add">+{totalAdded}</span>}
        {totalRemoved > 0 && <span className="files-changed-stat stat-remove">-{totalRemoved}</span>}
        <div className="files-changed-spacer"></div>
        <button className="files-changed-btn btn-keep" onClick={onAccept} type="button">
          Keep
        </button>
        <button className="files-changed-btn btn-undo" onClick={onUndo} type="button">
          Undo
        </button>
        <button
          className="files-changed-btn btn-copy"
          onClick={handleCopyPaths}
          title="Copy file paths"
          aria-label="Copy file paths"
          type="button"
        >
          <Icon name="Copy" size={13} />
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
            const iconInfo = getFileIcon(fileName);
            const isOpen = openDiff === file.path;

            return (
              <div key={idx} className="files-changed-row-wrap">
                <div
                  className={`files-changed-row ${isOpen ? 'is-open' : ''}`}
                  onClick={() =>
                    setOpenDiff((cur) => (cur === file.path ? null : file.path))
                  }
                  role="button"
                  tabIndex={0}
                >
                  <div className="files-changed-row-left">
                    <Icon
                      name={isOpen ? 'ChevronDown' : 'ChevronRight'}
                      size={12}
                      className="files-changed-row-chevron"
                    />
                    {isNewFile && <span className="new-file-indicator">+</span>}
                    <span className="files-changed-icon" style={{ color: iconInfo.color }}>
                      <Icon name={iconInfo.name} size={13} />
                    </span>
                    <span className="files-changed-filename">{fileName}</span>
                    <span className="files-changed-dirpath">{dirPath}</span>
                  </div>
                  <div className="files-changed-row-right">
                    {file.addedLines > 0 && <span className="stat-add">+{file.addedLines}</span>}
                    {file.removedLines > 0 && (
                      <span className="stat-remove">-{file.removedLines}</span>
                    )}
                    <button
                      className="files-changed-open-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenFile) onOpenFile(file.path);
                      }}
                      title="Open in editor"
                      aria-label="Open in editor"
                      type="button"
                    >
                      <Icon name="ExternalLink" size={12} />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <InlineDiff
                    originalContent={undoStack[file.path]}
                    newContent={file.content || ''}
                    isNewFile={isNewFile}
                    fileName={fileName}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Cursor-style inline diff for a single file. Computed lazily so closed
 * rows don't pay the cost. Shares the same visual language as the write_file
 * row diff: line-number gutter, +/- sign, Prism-highlighted content,
 * collapsible unchanged gaps.
 */
const InlineDiff = React.memo(function InlineDiff({
  originalContent,
  newContent,
  isNewFile,
  fileName,
}) {
  const lang = useMemo(() => getLanguageForDiff(fileName), [fileName]);
  const sections = useMemo(() => {
    if (isNewFile) {
      const lines = (newContent || '').split('\n').map((line, i) => ({
        kind: 'add',
        line,
        newNum: i + 1,
      }));
      return [{ kind: 'hunk', lines }];
    }
    return diffSections(originalContent || '', newContent || '', {
      context: 3,
      minGap: 4,
    });
  }, [originalContent, newContent, isNewFile]);

  const [openGaps, setOpenGaps] = useState(() => new Set());
  const toggleGap = (idx) => {
    setOpenGaps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const hasChanges = sections.some((s) =>
    s.kind === 'hunk' && s.lines.some((l) => l.kind !== 'equal')
  );

  if (!hasChanges && !isNewFile) {
    return (
      <div className="inline-diff inline-diff-empty">No textual changes</div>
    );
  }

  return (
    <div className="write-file-diff" role="region" aria-label="Diff preview">
      <div className="write-file-diff-body inline-diff-prism">
        {sections.map((section, sIdx) => {
          if (section.kind === 'gap') {
            const open = openGaps.has(sIdx);
            if (!open) {
              return (
                <button
                  key={`gap-${sIdx}`}
                  className="write-file-diff-gap"
                  onClick={() => toggleGap(sIdx)}
                  type="button"
                >
                  <Icon name="ChevronDown" size={11} />
                  <span>
                    {section.count} unchanged line
                    {section.count !== 1 ? 's' : ''}
                  </span>
                </button>
              );
            }
            return (
              <React.Fragment key={`gap-${sIdx}`}>
                <button
                  className="write-file-diff-gap is-open"
                  onClick={() => toggleGap(sIdx)}
                  type="button"
                >
                  <Icon name="ChevronUp" size={11} />
                  <span>Collapse {section.count} unchanged</span>
                </button>
                {section.lines.map((ln, i) => (
                  <FileDiffLine key={`g-${sIdx}-${i}`} line={ln} lang={lang} />
                ))}
              </React.Fragment>
            );
          }
          return section.lines.map((ln, i) => (
            <FileDiffLine key={`s-${sIdx}-${i}`} line={ln} lang={lang} />
          ));
        })}
      </div>
    </div>
  );
});

const FileDiffLine = React.memo(function FileDiffLine({ line, lang }) {
  const sign = line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' ';
  const html = useMemo(() => highlightLine(line.line || '', lang), [line.line, lang]);
  return (
    <div className={`write-file-diff-row diff-row-${line.kind}`}>
      <span className="diff-row-lineno diff-row-lineno-old">
        {line.oldNum || ''}
      </span>
      <span className="diff-row-lineno diff-row-lineno-new">
        {line.newNum || ''}
      </span>
      <span className="diff-row-sign">{sign}</span>
      <span
        className="diff-row-text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});

function getLanguageForDiff(fileName) {
  if (!fileName || typeof fileName !== 'string') return '';
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext || '';
}

export default React.memo(FilesChangedCard);
