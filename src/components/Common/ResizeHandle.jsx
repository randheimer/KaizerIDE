import React, { useCallback, useRef, useEffect } from 'react';

/**
 * ResizeHandle — Draggable bar for resizing panels.
 *
 * Uses direct DOM manipulation during drag for instant visual feedback.
 * Only commits to React state on mouseup via onResizeEnd.
 *
 * Props:
 *   direction    — "horizontal" or "vertical"
 *   onDrag       — callback(delta) during drag (for live state updates if desired)
 *   onDragEnd    — callback(finalDelta) on mouseup (commit final size)
 *   className    — optional extra class
 *   style        — optional inline style overrides
 */
export default function ResizeHandle({
  direction = 'vertical',
  onDrag,
  onDragEnd,
  className = '',
  style = {},
}) {
  const startPos = useRef(0);
  const latestPos = useRef(0);
  const rafId = useRef(null);
  const onDragRef = useRef(onDrag);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onDragRef.current = onDrag;
    onDragEndRef.current = onDragEnd;
  }, [onDrag, onDragEnd]);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pos = direction === 'horizontal' ? e.clientX : e.clientY;
      startPos.current = pos;
      latestPos.current = pos;

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.body.classList.add('is-resizing');

      const tick = () => {
        const delta = latestPos.current - startPos.current;
        onDragRef.current?.(delta);
        rafId.current = null;
      };

      const onMouseMove = (e) => {
        latestPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
        if (!rafId.current) {
          rafId.current = requestAnimationFrame(tick);
        }
      };

      const onMouseUp = () => {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        const finalDelta = latestPos.current - startPos.current;
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
    [direction],
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
