import React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Icon - thin wrapper around lucide-react for consistent sizing/stroke.
 *
 * Usage:
 *   <Icon name="MessageSquare" />
 *   <Icon name="Send" size={14} />
 *   <Icon name="X" size={16} strokeWidth={2.5} />
 *
 * Accepts any Lucide icon name (PascalCase). Falls back to a simple box
 * if the requested icon is not found so the UI never crashes on typos.
 */
function Icon({ name, size = 16, strokeWidth = 1.75, className = '', ...rest }) {
  const LucideIcon = LucideIcons[name];
  if (!LucideIcon) {
    if (typeof console !== 'undefined') {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
    }
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          border: '1px dashed currentColor',
          opacity: 0.5,
        }}
        aria-hidden="true"
        {...rest}
      />
    );
  }
  return (
    <LucideIcon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

export default React.memo(Icon);
