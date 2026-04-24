import React, { forwardRef } from 'react';
import Icon from '../../../Common/Icon';
import ContextPills from './ContextPills';
import ContextMenu from './ContextMenu';
import ModePicker from './ModePicker';
import ModelPicker from './ModelPicker';
import {
  useChatStore,
  POPUP_CONTEXT,
  POPUP_MODE,
  POPUP_MODEL,
} from '../../../../lib/stores/chatStore';

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
  const contextPills = useChatStore((s) => s.contextPills);
  const currentMode = useChatStore((s) => s.currentMode);
  const setCurrentMode = useChatStore((s) => s.setCurrentMode);
  const removeContextPill = useChatStore((s) => s.removeContextPill);
  const openPopup = useChatStore((s) => s.openPopup);
  const openPopupMenu = useChatStore((s) => s.openPopupMenu);
  const closePopup = useChatStore((s) => s.closePopup);

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
          ref={textareaRef}
          className="composer-textarea"
          placeholder="Ask anything..."
          value={input}
          onChange={onChangeInput}
          onKeyDown={onKeyDown}
          disabled={isStreaming}
          rows={1}
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
