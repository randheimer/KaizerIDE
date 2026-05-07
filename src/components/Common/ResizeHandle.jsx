import React, { useCallback, useRef, useEffect } from 'react';

/**
 * ResizeHandle — Draggable bar for resizing panels.
 *
 * Uses direct DOM manipulation during drag for instant visual feedback.
 * Only commits to React state on mouseup via onDragEnd.
 *
 * Props:
 *   direction    — "horizontal" or "vertical"
 *   onDragEnd    — callback(finalDelta) on mouseup (commit final size)
 *   targetRef    — ref to the panel being resized (optional, for live preview)
 *   invertDelta  — if true, subtract delta instead of add (for right-side panels)
 *   className    — optional extra class
 *   style        — optional inline style overrides
 */
export default function ResizeHandle({
  direction = 'vertical',
  onDragEnd,
  targetRef,
  invertDelta = false,
  className = '',
  style = {},
}) {
  const startPos = useRef(0);
  const startSize = useRef(0);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pos = direction === 'horizontal' ? e.clientX : e.clientY;
      startPos.current = pos;

      // Capture initial size if target provided
      if (targetRef?.current) {
        const rect = targetRef.current.getBoundingClientRect();
        startSize.current = direction === 'horizontal' ? rect.width : rect.height;
      }

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.body.classList.add('is-resizing');

      const onMouseMove = (e) => {
        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
        let delta = currentPos - startPos.current;

        // Invert delta for right-side panels
        if (invertDelta) {
          delta = -delta;
        }

        // Live update target element size during drag
        if (targetRef?.current) {
          const newSize = Math.max(0, startSize.current + delta);
          if (direction === 'horizontal') {
            targetRef.current.style.width = `${newSize}px`;
          } else {
            targetRef.current.style.height = `${newSize}px`;
          }
        }
      };

      const onMouseUp = (e) => {
        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
        const finalDelta = currentPos - startPos.current;

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.classList.remove('is-resizing');

        onDragEndRef.current?.(finalDelta);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [direction, targetRef, invertDelta],
  );

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className={`resize-handle ${isHorizontal ? 'resize-horizontal' : 'resize-vertical'} ${className}`}
      onMouseDown={handleMouseDown}
      style={style}
    />
  );
}
