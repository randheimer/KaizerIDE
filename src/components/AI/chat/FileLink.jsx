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

const HOVER_DELAY_OPEN = 220;
const HOVER_DELAY_CLOSE = 120;
const PREVIEW_LINES = 14;

/**
 * FileLink — clickable inline file reference with a hover-preview of the
 * file's indexed content. Replaces the old `.file-link` span so we get
 * a proper accessible link + preview popover.
 *
 * The preview is sourced from the workspace indexer (`preview` field) so
 * it requires no disk read. If the file isn't in the index (e.g. freshly
 * created), we fall back to just the path.
 */
function FileLink({ path, children }) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const hover = useHover(context, {
    delay: { open: HOVER_DELAY_OPEN, close: HOVER_DELAY_CLOSE },
    handleClose: safePolygon(),
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Pull preview data lazily from the indexer the first time the hover
  // opens. We look up by suffix so the model can refer to relative paths
  // and we still find the absolute one in the index.
  const indexedFile = useMemo(() => {
    if (!open || !path) return null;
    const all = indexer.index || [];
    return (
      all.find((f) => f && f.path === path) ||
      all.find((f) => f && f.path && f.path.endsWith(path)) ||
      null
    );
  }, [open, path]);

  const previewLines = useMemo(() => {
    if (!indexedFile || !indexedFile.preview) return null;
    return indexedFile.preview.split('\n').slice(0, PREVIEW_LINES);
  }, [indexedFile]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('kaizer:open-file', { detail: { path } })
    );
  };

  return (
    <>
      <a
        ref={refs.setReference}
        href={`file://${path}`}
        onClick={handleClick}
        className="file-link"
        {...getReferenceProps()}
      >
        <Icon name="FileText" size={11} className="file-link-icon" />
        {children}
      </a>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="file-link-preview"
            {...getFloatingProps()}
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
    </>
  );
}

export default React.memo(FileLink);
