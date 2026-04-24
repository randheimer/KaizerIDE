import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import Icon from '../../../Common/Icon';
import ContextPills from './ContextPills';
import ContextMenu from './ContextMenu';
import ModePicker from './ModePicker';
import ModelPicker from './ModelPicker';
import InlineAutocomplete, { parseTrigger } from './InlineAutocomplete';
import { indexer } from '../../../../lib/indexer';
import {
  useChatStore,
  POPUP_CONTEXT,
  POPUP_MODE,
  POPUP_MODEL,
} from '../../../../lib/stores/chatStore';

/**
 * Slash commands available when the user types `/` at the start of the input.
 * `apply` receives the chat-store setters and may mutate input/mode directly.
 */
const SLASH_COMMANDS = [
  { id: 'explain', label: '/explain', hint: 'Analyze current file', icon: 'HelpCircle',
    apply: ({ setInput }) => setInput('Explain the purpose and structure of the currently open file.') },
  { id: 'fix', label: '/fix', hint: 'Fix errors', icon: 'Wrench',
    apply: ({ setInput, setCurrentMode }) => { setCurrentMode('fixer'); setInput('Fix the errors in the currently open file.'); } },
  { id: 'test', label: '/test', hint: 'Generate tests', icon: 'FlaskConical',
    apply: ({ setInput }) => setInput('Generate unit tests for the currently open file.') },
  { id: 'plan', label: '/plan', hint: 'Switch to Plan mode', icon: 'ClipboardList',
    apply: ({ setCurrentMode }) => setCurrentMode('plan') },
  { id: 'ask', label: '/ask', hint: 'Switch to Ask mode', icon: 'MessageCircle',
    apply: ({ setCurrentMode }) => setCurrentMode('ask') },
  { id: 'agent', label: '/agent', hint: 'Switch to Agent mode', icon: 'Infinity',
    apply: ({ setCurrentMode }) => setCurrentMode('agent') },
];

/**
 * Composer - input area: context pills, textarea, toolbar (@, mode, model, send).
 *
 * Textarea ref is forwarded so the host can focus/resize it. Most state
 * comes from chatStore; agent/action callbacks stay as props (they touch
 * streaming + history logic that hasn't moved to the store yet).
 */
const Composer = forwardRef(function Composer(
  {
    settings,
    isStreaming,
    onSend,
    onStop,
    onKeyDown,
    onChangeInput,
    onAttachContextType,
    onOpenSettings,
  },
  textareaRef
) {
  const input = useChatStore((s) => s.input);
  const setInput = useChatStore((s) => s.setInput);
  const contextPills = useChatStore((s) => s.contextPills);
  const addContextPill = useChatStore((s) => s.addContextPill);
  const currentMode = useChatStore((s) => s.currentMode);
  const setCurrentMode = useChatStore((s) => s.setCurrentMode);
  const removeContextPill = useChatStore((s) => s.removeContextPill);
  const openPopup = useChatStore((s) => s.openPopup);
  const openPopupMenu = useChatStore((s) => s.openPopupMenu);
  const closePopup = useChatStore((s) => s.closePopup);

  // ── Inline autocomplete state ────────────────────────────────────────
  const [trigger, setTrigger] = useState(null); // { kind, query, start, end } | null
  const [fileSuggestions, setFileSuggestions] = useState([]);
  const localTextareaRef = useRef(null);
  // Expose either the caller's ref or our internal one to autocomplete.
  const effectiveTextareaRef = textareaRef ?? localTextareaRef;

  // Compute the current suggestion list from the trigger.
  const suggestions = useMemo(() => {
    if (!trigger) return [];
    if (trigger.kind === 'slash') {
      const q = trigger.query.toLowerCase();
      return SLASH_COMMANDS.filter(
        (c) => q === '' || c.id.toLowerCase().startsWith(q) || c.label.toLowerCase().includes(q)
      );
    }
    return fileSuggestions;
  }, [trigger, fileSuggestions]);

  // Update the trigger based on the current caret position after typing.
  const recomputeTrigger = useCallback(
    (nextValue, caretPos) => {
      const t = parseTrigger(nextValue, caretPos);
      setTrigger(t);
      if (t?.kind === 'at') {
        // Async fuzzy search via the workspace indexer.
        try {
          const results = indexer.search(t.query || '', 8) || [];
          setFileSuggestions(
            results.map((r) => ({
              id: r.path ?? r.filePath ?? r.id ?? r.label ?? String(r),
              label: (r.path ?? r.filePath ?? '').split(/[\\/]/).pop() || r.path || '(unknown)',
              hint: r.path ?? r.filePath,
              icon: 'FileText',
              value: r.path ?? r.filePath,
            }))
          );
        } catch {
          setFileSuggestions([]);
        }
      } else {
        setFileSuggestions([]);
      }
    },
    []
  );

  const handleChange = useCallback(
    (e) => {
      // Delegate to host's change handler (store update), then recompute.
      onChangeInput(e);
      recomputeTrigger(e.target.value, e.target.selectionStart);
    },
    [onChangeInput, recomputeTrigger]
  );

  const handleSelect = useCallback(
    (item) => {
      if (!trigger) return;
      const textarea = effectiveTextareaRef.current;

      if (trigger.kind === 'slash') {
        const cmd = SLASH_COMMANDS.find((c) => c.id === item.id);
        if (cmd) {
          // Remove the slash-trigger token from the input before applying.
          const next = input.slice(0, trigger.start) + input.slice(trigger.end);
          setInput(next);
          cmd.apply({ setInput, setCurrentMode });
        }
      } else if (trigger.kind === 'at' && item.value) {
        // Remove the `@query` token, then add the file as a context pill.
        const next = input.slice(0, trigger.start) + input.slice(trigger.end);
        setInput(next);
        addContextPill({
          id: Date.now() + Math.random(),
          type: 'file',
          data: item.value,
        });
      }
      setTrigger(null);
      setFileSuggestions([]);
      // Restore focus on the textarea after selection.
      requestAnimationFrame(() => textarea?.focus());
    },
    [trigger, input, setInput, setCurrentMode, addContextPill, effectiveTextareaRef]
  );

  const handleKeyDown = useCallback(
    (e) => {
      // When autocomplete is open, let cmdk handle Arrow/Enter keys. We only
      // dismiss on Escape here; the cmdk Command element also handles it.
      if (trigger) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setTrigger(null);
          return;
        }
        // Don't forward Enter to host's send handler when selecting an item.
        if (e.key === 'Enter' && suggestions.length > 0) {
          // cmdk's internal handler will fire onSelect; still prevent default Enter.
          return;
        }
      }
      onKeyDown?.(e);
    },
    [trigger, suggestions.length, onKeyDown]
  );

  // Floating UI-driven handlers: set/clear the store's openPopup to the
  // requested id while preserving mutual exclusivity.
  const setPopup = (id) => (next) => {
    if (next) openPopupMenu(id, null);
    else closePopup();
  };

  return (
    <div className="chat-composer-new">
      <div
        className={`composer-container-new ${isStreaming ? 'ai-loading' : ''} ${
          input ? 'has-content' : ''
        }`}
      >
        <ContextPills pills={contextPills} onRemove={removeContextPill} />

        <textarea
          ref={(el) => {
            localTextareaRef.current = el;
            if (typeof textareaRef === 'function') textareaRef(el);
            else if (textareaRef) textareaRef.current = el;
          }}
          className="composer-textarea"
          placeholder="Ask anything, @ to add files, / for commands"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={(e) =>
            recomputeTrigger(e.target.value, e.target.selectionStart)
          }
          disabled={isStreaming}
          rows={1}
        />

        <InlineAutocomplete
          open={!!trigger && suggestions.length > 0}
          anchorEl={localTextareaRef.current}
          trigger={trigger || { kind: 'at', query: '' }}
          suggestions={suggestions}
          onSelect={handleSelect}
          onDismiss={() => setTrigger(null)}
        />

        <div className="composer-toolbar-new">
          <div className="toolbar-left">
            <div className="toolbar-btn-wrapper">
              <ContextMenu
                open={openPopup === POPUP_CONTEXT}
                onOpenChange={setPopup(POPUP_CONTEXT)}
                onSelect={onAttachContextType}
              />
            </div>
          </div>

          <div className="toolbar-right">
            <div className="toolbar-btn-wrapper">
              <ModePicker
                open={openPopup === POPUP_MODE}
                onOpenChange={setPopup(POPUP_MODE)}
                value={currentMode}
                onChange={setCurrentMode}
              />
            </div>

            <div className="toolbar-btn-wrapper">
              <ModelPicker
                open={openPopup === POPUP_MODEL}
                onOpenChange={setPopup(POPUP_MODEL)}
                settings={settings}
                onAddModel={onOpenSettings}
              />
            </div>

            <button
              className="send-btn-new"
              onClick={isStreaming ? onStop : onSend}
              disabled={!input.trim() && !isStreaming}
              aria-label={isStreaming ? 'Stop' : 'Send'}
              title={isStreaming ? 'Stop' : 'Send (Enter)'}
            >
              <Icon name={isStreaming ? 'Square' : 'ArrowUp'} size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default React.memo(Composer);
