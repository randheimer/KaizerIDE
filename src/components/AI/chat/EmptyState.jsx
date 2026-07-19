import React from 'react';

const DEFAULT_SUGGESTIONS = [
  'Explain this codebase',
  'Fix bugs in open file',
  'Add a new feature',
];

/**
 * EmptyState - shown when there are no messages.
 * Accepts an optional `suggestions` array to allow callers to inject
 * context-aware prompts (e.g. "Explain <activeFile>").
 */
function EmptyState({ suggestions = DEFAULT_SUGGESTIONS, onSuggestionClick }) {
  return (
    <div className="empty-state-new">
      <div className="empty-logo">K</div>
      <div className="empty-title">KaizerIDE</div>
      <div className="empty-subtitle">Ask anything about your code</div>
      <div className="suggestion-chips">
        {suggestions.map((text) => (
          <button
            key={text}
            className="suggestion-chip"
            onClick={() => onSuggestionClick?.(text)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(EmptyState);
