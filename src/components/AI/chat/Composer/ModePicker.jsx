import React from 'react';
import { FloatingPortal } from '@floating-ui/react';
import Icon from '../../../Common/Icon';
import { usePopoverMenu } from '../../../../lib/hooks/usePopoverMenu';

export const MODES = [
  { id: 'agent', label: 'Agent', icon: 'Infinity' },
  { id: 'plan', label: 'Plan', icon: 'ClipboardList' },
  { id: 'ask', label: 'Ask', icon: 'MessageCircle' },
  { id: 'fixer', label: 'Fixer', icon: 'Wrench' },
];

export function getModeMeta(id) {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

/**
 * ModePicker - pill button + menu for switching between agent/plan/ask/fixer.
 */
function ModePicker({ open, onOpenChange, value, onChange }) {
  const current = getModeMeta(value);
  const {
    refs,
    floatingStyles,
    listRef,
    getReferenceProps,
    getFloatingProps,
    getItemProps,
  } = usePopoverMenu({
    open,
    onOpenChange,
    placement: 'top-start',
    itemCount: MODES.length,
  });

  return (
    <>
      <button
        ref={refs.setReference}
        className="pill-btn"
        aria-label={`Mode: ${current.label}`}
        type="button"
        {...getReferenceProps()}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name={current.icon} size={13} />
          {current.label}
        </span>
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="mode-popup"
            style={{ ...floatingStyles, zIndex: 9500 }}
            {...getFloatingProps()}
          >
            {MODES.map((opt, idx) => (
              <div
                key={opt.id}
                ref={(el) => (listRef.current[idx] = el)}
                role="menuitemradio"
                aria-checked={value === opt.id}
                tabIndex={-1}
                className={`mode-option ${value === opt.id ? 'active' : ''}`}
                {...getItemProps({
                  onClick: () => {
                    onChange(opt.id);
                    onOpenChange(false);
                  },
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(opt.id);
                      onOpenChange(false);
                    }
                  },
                })}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon name={opt.icon} size={13} />
                  {opt.label}
                </span>
                {value === opt.id && (
                  <Icon name="Check" size={13} className="checkmark" />
                )}
              </div>
            ))}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default React.memo(ModePicker);
