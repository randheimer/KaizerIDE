import React from 'react';
import { FloatingPortal } from '@floating-ui/react';
import Icon from '../../../Common/Icon';
import { usePopoverMenu } from '../../../../lib/hooks/usePopoverMenu';

const MENU_ITEMS = [
  { id: 'files', label: 'Files & Folders', icon: 'FolderOpen' },
  { id: 'docs', label: 'Docs', icon: 'BookOpen' },
  { id: 'terminal', label: 'Terminals', icon: 'Terminal' },
];

/**
 * ContextMenu - '@' trigger button + Floating UI-positioned menu for
 * attaching files, docs, or terminal output as context.
 */
function ContextMenu({ open, onOpenChange, onSelect }) {
  const {
    refs,
    floatingStyles,
    context,
    listRef,
    getReferenceProps,
    getFloatingProps,
    getItemProps,
  } = usePopoverMenu({
    open,
    onOpenChange,
    placement: 'top-start',
    itemCount: MENU_ITEMS.length,
  });

  return (
    <>
      <button
        ref={refs.setReference}
        className="icon-btn-small"
        aria-label="Add context"
        title="Add context"
        type="button"
        {...getReferenceProps()}
      >
        <Icon name="AtSign" size={14} />
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="context-popup"
            style={{ ...floatingStyles, zIndex: 9500 }}
            {...getFloatingProps()}
          >
            <div className="context-search">
              <input type="text" placeholder="Add files, folders, docs..." />
            </div>
            <div className="context-options">
              {MENU_ITEMS.map((item, idx) => (
                <div
                  key={item.id}
                  ref={(el) => (listRef.current[idx] = el)}
                  role="menuitem"
                  tabIndex={-1}
                  className="context-option"
                  {...getItemProps({
                    onClick: () => {
                      onSelect(item.id);
                      onOpenChange(false);
                    },
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(item.id);
                        onOpenChange(false);
                      }
                    },
                  })}
                >
                  <Icon name={item.icon} size={13} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default React.memo(ContextMenu);
