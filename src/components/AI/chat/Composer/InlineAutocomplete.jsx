import React, { useMemo } from 'react';
import { Command } from 'cmdk';
import {
  FloatingPortal,
  useFloating,
  autoUpdate,
  flip,
  shift,
  offset,
} from '@floating-ui/react';
import Icon from '../../../Common/Icon';
import './InlineAutocomplete.css';

/**
 * InlineAutocomplete - floating panel anchored to the composer textarea that
 * surfaces file suggestions (on `@`) or slash commands (on `/`).
 *
 * Activation is driven by the caller via {@link parseTrigger} — this component
 * is a pure renderer of the suggestion list.
 */
function InlineAutocomplete({
  open,
  anchorEl,
  trigger, // { kind: 'at' | 'slash', query, start, end }
  suggestions, // [{ id, label, hint?, icon?, value }]
  onSelect,
  onDismiss,
}) {
  const { refs, floatingStyles } = useFloating({
    open,
    whileElementsMounted: autoUpdate,
    placement: 'top-start',
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  // Attach the anchor element as the reference.
  React.useEffect(() => {
    refs.setReference(anchorEl ?? null);
  }, [anchorEl, refs]);

  if (!open || suggestions.length === 0) return null;

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, zIndex: 9500 }}
        className="inline-autocomplete"
      >
        <Command
          loop
          label={trigger.kind === 'at' ? 'File suggestions' : 'Slash commands'}
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onDismiss();
            }
          }}
        >
          <div className="inline-autocomplete__header">
            <span className="inline-autocomplete__kind">
              {trigger.kind === 'at' ? 'Files' : 'Commands'}
            </span>
            <span className="inline-autocomplete__query">{trigger.query || '(type to filter)'}</span>
          </div>
          <Command.List className="inline-autocomplete__list">
            {suggestions.length === 0 && (
              <Command.Empty className="inline-autocomplete__empty">No matches</Command.Empty>
            )}
            {suggestions.map((s) => (
              <Command.Item
                key={s.id}
                value={s.id}
                onSelect={() => onSelect(s)}
                className="inline-autocomplete__item"
              >
                {s.icon && <Icon name={s.icon} size={13} className="inline-autocomplete__icon" />}
                <span className="inline-autocomplete__label">{s.label}</span>
                {s.hint && <span className="inline-autocomplete__hint">{s.hint}</span>}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </FloatingPortal>
  );
}

export default React.memo(InlineAutocomplete);

// ────────────────────────────────────────────────────────────────────────────

/**
 * parseTrigger - inspect the textarea's current value + caret position
 * and return a trigger descriptor if the caret sits at the end of a
 * recognizable `@query` or `/query` token.
 *
 * Returns null if no trigger is active.
 */
export function parseTrigger(value, caretPos) {
  if (caretPos == null) return null;
  const upto = value.slice(0, caretPos);

  // `/command` only valid at start of input or after whitespace/newline,
  // and only when the input starts with '/'.
  const slashMatch = /(^|\n)\/([A-Za-z][A-Za-z0-9_-]*)$/.exec(upto);
  if (slashMatch) {
    const query = slashMatch[2];
    const start = caretPos - query.length - 1; // include the '/'
    return { kind: 'slash', query, start, end: caretPos };
  }

  // `@query` valid anywhere a word can start.
  const atMatch = /(^|\s|\()@([A-Za-z0-9_\-\./\\]*)$/.exec(upto);
  if (atMatch) {
    const query = atMatch[2];
    const start = caretPos - query.length - 1; // include the '@'
    return { kind: 'at', query, start, end: caretPos };
  }

  return null;
}
