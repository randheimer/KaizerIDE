import React, { useMemo, useState } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  safePolygon,
} from '@floating-ui/react';
import Icon from '../../Common/Icon';
import { indexer } from '../../../lib/indexer';
import { useFilesChanged } from './FilesChangedContext';
import { diffSections } from '../../../lib/diff/lineDiff';
import { highlightLine } from '../../../lib/diff/prismHighlight';

const HOVER_DELAY_OPEN = 220;
const HOVER_DELAY_CLOSE = 120;
const PREVIEW_LINES = 14;

/**
 * Inline, clickable file reference inside assistant markdown.
 *
 * Two modes, decided per-render by whether the file is in the current
 * "files changed" set:
 *
 *   1. Tracked file — shows +N/-M badge; click toggles an inline
 *      Cursor-style diff popover directly below the chip (VSCode-like).
 *      An "Open" button inside the popover jumps to the editor.
 *
 *   2. Untracked file — shows just the filename chip; hover reveals the
 *      indexer preview; click opens the file in the editor.
 *
 * Uses a <button> (not <a>) so Electron never tries to open the
 * file:// URL externally in a second IDE window.
 */
function FileLink({ path, children }) {
  const { getFileStats, getFileDiffData, onOpenFile } = useFilesChanged();
  const stats = useMemo(() => (path ? getFileStats(path) : null), [path, getFileStats]);
  const hasChanges = !!stats && (stats.added > 0 || stats.removed > 0 || stats.isNew);

  const [hoverOpen, setHoverOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  // Hover tooltip (only when no stats/diff mode — otherwise we rely on
  // the diff popover which is click-triggered).
  const hover = useFloating({
    open: hoverOpen,
    onOpenChange: setHoverOpen,
    placement: 'top',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  const hoverInteraction = useHover(hover.context, {
    enabled: !hasChanges && !diffOpen,
    delay: { open: HOVER_DELAY_OPEN, close: HOVER_DELAY_CLOSE },
    handleClose: safePolygon(),
  });
  const focusInteraction = useFocus(hover.context, { enabled: !hasChanges });
  const hoverDismiss = useDismiss(hover.context);
  const hoverRole = useRole(hover.context, { role: 'tooltip' });
  const hoverProps = useInteractions([
    hoverInteraction,
    focusInteraction,
    hoverDismiss,
    hoverRole,
  ]);

  // Diff popover (click-triggered; only for tracked files).
  const diff = useFloating({
    open: diffOpen,
    onOpenChange: setDiffOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  const diffDismiss = useDismiss(diff.context, { outsidePress: true });
  const diffRole = useRole(diff.context, { role: 'dialog' });
  const diffProps = useInteractions([diffDismiss, diffRole]);

  const indexedFile = useMemo(() => {
    // Only look up the indexer when hovering an untracked file with
    // an actual path. Tracked files use the diff popover instead.
    if (!hoverOpen || hasChanges || !path) return null;
    const all = indexer.index || [];
    return (
      all.find((f) => f && f.path === path) ||
      all.find((f) => f && f.path && f.path.endsWith(path)) ||
      null
    );
  }, [hoverOpen, hasChanges, path]);

  const previewLines = useMemo(() => {
    if (!indexedFile || !indexedFile.preview) return null;
    return indexedFile.preview.split('\n').slice(0, PREVIEW_LINES);
  }, [indexedFile]);

  const doOpen = () => {
    if (typeof onOpenFile === 'function') {
      onOpenFile(path);
    } else {
      // Fallback to the global event if no callback was provided.
      window.dispatchEvent(
        new CustomEvent('kaizer:open-file', { detail: { path } })
      );
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChanges) {
      setDiffOpen((prev) => !prev);
    } else {
      doOpen();
    }
  };

  // Choose the ref for the floating popover that is actually active so
  // both the hover tooltip and diff popover can attach to the same chip.
  const setRef = (node) => {
    hover.refs.setReference(node);
    diff.refs.setReference(node);
  };

  const chipClass =
    'file-link' +
    (hasChanges ? ' file-link-tracked' : '') +
    (diffOpen ? ' is-open' : '');

  return (
    <>
      <button
        ref={setRef}
        type="button"
        className={chipClass}
        title={path}
        {...hoverProps.getReferenceProps(
          diffProps.getReferenceProps({ onClick: handleClick })
        )}
      >
        <Icon name="FileText" size={11} className="file-link-icon" />
        <span className="file-link-label">{children}</span>
        {hasChanges && (
          <span className="file-link-stats">
            {stats.added > 0 && (
              <span className="file-link-stat stat-add">+{stats.added}</span>
            )}
            {stats.removed > 0 && (
              <span className="file-link-stat stat-remove">-{stats.removed}</span>
            )}
          </span>
        )}
      </button>

      {/* Hover preview (untracked files only). */}
      {hoverOpen && !hasChanges && (
        <FloatingPortal>
          <div
            ref={hover.refs.setFloating}
            style={hover.floatingStyles}
            className="file-link-preview"
            {...hoverProps.getFloatingProps()}
          >
            <div className="file-link-preview-header">
              <Icon name="FileText" size={12} />
              <span className="file-link-preview-path">{path}</span>
              {indexedFile?.lines ? (
                <span className="file-link-preview-meta">
                  {indexedFile.lines} lines
                </span>
              ) : null}
            </div>
            {previewLines ? (
              <pre className="file-link-preview-body">
                {previewLines.join('\n')}
              </pre>
            ) : (
              <div className="file-link-preview-empty">
                Not in index. Click to open.
              </div>
            )}
          </div>
        </FloatingPortal>
      )}

      {/* Inline diff popover (tracked files, click). */}
      {diffOpen && hasChanges && (
        <FloatingPortal>
          <div
            ref={diff.refs.setFloating}
            style={diff.floatingStyles}
            className="file-link-diff"
            {...diffProps.getFloatingProps()}
          >
            <InlineDiffPopover
              path={path}
              stats={stats}
              getDiffData={getFileDiffData}
              onOpen={() => {
                setDiffOpen(false);
                doOpen();
              }}
              onClose={() => setDiffOpen(false)}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

/**
 * Body of the inline diff popover. Mirrors the visuals of WriteFileDiff
 * in ToolGroupCard / FilesChangedCard so the user sees a consistent
 * diff chrome everywhere in the chat.
 */
const InlineDiffPopover = React.memo(function InlineDiffPopover({
  path,
  stats,
  getDiffData,
  onOpen,
  onClose,
}) {
  const data = useMemo(() => getDiffData(path), [path, getDiffData]);
  const lang = useMemo(() => {
    const name = data?.fileName || '';
    const ext = name.split('.').pop()?.toLowerCase();
    return ext || '';
  }, [data]);

  const sections = useMemo(() => {
    if (!data) return [];
    if (data.isNewFile) {
      const lines = (data.newContent || '').split('\n').map((line, i) => ({
        kind: 'add',
        line,
        newNum: i + 1,
      }));
      return [{ kind: 'hunk', lines }];
    }
    return diffSections(data.originalContent || '', data.newContent || '', {
      context: 3,
      minGap: 4,
    });
  }, [data]);

  const [openGaps, setOpenGaps] = useState(() => new Set());
  const toggleGap = (idx) => {
    setOpenGaps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="file-link-diff-inner">
      <div className="file-link-diff-header">
        <Icon name="FileText" size={12} />
        <span className="file-link-diff-path">{data?.fileName || path}</span>
        <span className="file-link-diff-stats">
          {stats.added > 0 && <span className="stat-add">+{stats.added}</span>}
          {stats.removed > 0 && <span className="stat-remove">-{stats.removed}</span>}
        </span>
        <button
          className="file-link-diff-btn"
          onClick={onOpen}
          title="Open in editor"
          type="button"
        >
          <Icon name="ExternalLink" size={12} />
        </button>
        <button
          className="file-link-diff-btn"
          onClick={onClose}
          title="Close"
          aria-label="Close diff"
          type="button"
        >
          <Icon name="X" size={12} />
        </button>
      </div>
      {!data ? (
        <div className="file-link-diff-empty">No diff data available</div>
      ) : (
        <div className="file-link-diff-body inline-diff-prism">
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
                    <PopoverDiffLine key={`g-${sIdx}-${i}`} line={ln} lang={lang} />
                  ))}
                </React.Fragment>
              );
            }
            return section.lines.map((ln, i) => (
              <PopoverDiffLine key={`s-${sIdx}-${i}`} line={ln} lang={lang} />
            ));
          })}
        </div>
      )}
    </div>
  );
});

const PopoverDiffLine = React.memo(function PopoverDiffLine({ line, lang }) {
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

export default React.memo(FileLink);
