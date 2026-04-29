import React, { useCallback, useRef, useEffect } from 'react';

/**
 * ResizeHandle — A thin draggable bar for resizing panels.
 *
 * Props:
 *   direction  — "horizontal" (left/right resize) or "vertical" (up/down resize)
 *   onResize   — callback(newSize: number) fired during drag with the new pixel size
 *   min        — minimum size in px (default 150)
 *   max        — maximum size in px (default 600)
 *   className  — optional extra class
 *   style      — optional inline style overrides
 */
export default function ResizeHandle({
  direction = 'vertical',
  onResize,
  min = 150,
  max = 600,
  className = '',
  style = {},
}) {
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction],
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging.current) return;
      const delta =
        direction === 'horizontal'
          ? e.clientX - startPos.current
          : e.clientY - startPos.current;
      // For left-side panels (sidebar), dragging right = shrink, so delta is inverted by caller.
      // The caller decides the sign; we just pass the raw delta.
      onResize?.(delta);
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className={`resize-handle ${isHorizontal ? 'resize-horizontal' : 'resize-vertical'} ${className}`}
      onMouseDown={handleMouseDown}
      style={style}
    />
  );
}
