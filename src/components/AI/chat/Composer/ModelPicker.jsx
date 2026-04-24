import React from 'react';
import { FloatingPortal } from '@floating-ui/react';
import { usePopoverMenu } from '../../../../lib/hooks/usePopoverMenu';

/**
 * ModelPicker - pill button + menu for choosing the active LLM model.
 * Persists choice by mutating the passed `settings` object (legacy behavior;
 * real state should move into a settings store later).
 */
function ModelPicker({ open, onOpenChange, settings, onAddModel }) {
  const itemCount = settings.models.length + 1;
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
    itemCount,
  });

  const name = settings.selectedModel.name;
  const label = name.length > 16 ? `${name.slice(0, 16)}…` : name;

  return (
    <>
      <button
        ref={refs.setReference}
        className="pill-btn"
        aria-label={`Model: ${name}`}
        onClick={() => onOpenChange(!open)}
        {...getReferenceProps()}
      >
        <span>{label}</span>
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="model-popup"
            style={{ ...floatingStyles, zIndex: 9500 }}
            role="listbox"
            {...getFloatingProps()}
          >
            {settings.models.map((model, idx) => {
              const selected = settings.selectedModel.id === model.id;
              return (
                <div
                  key={model.id}
                  ref={(el) => (listRef.current[idx] = el)}
                  role="option"
                  aria-selected={selected}
                  tabIndex={idx === 0 ? 0 : -1}
                  className={`model-option ${selected ? 'active' : ''}`}
                  onClick={() => {
                    settings.selectedModel = model;
                    onOpenChange(false);
                  }}
                  {...getItemProps({
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        settings.selectedModel = model;
                        onOpenChange(false);
                      }
                    },
                  })}
                >
                  <span>{model.name}</span>
                  {selected && <span className="model-indicator">◉</span>}
                </div>
              );
            })}
            <div className="model-divider" />
            <div
              ref={(el) => (listRef.current[settings.models.length] = el)}
              role="option"
              tabIndex={-1}
              className="model-option add-model"
              onClick={() => {
                onOpenChange(false);
                onAddModel();
              }}
              {...getItemProps({
                onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenChange(false);
                    onAddModel();
                  }
                },
              })}
            >
              <span>+ Add Model</span>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default React.memo(ModelPicker);
