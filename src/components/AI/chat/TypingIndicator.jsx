import React from 'react';

/**
 * TypingIndicator - three animated dots shown while the agent is
 * running but no content has streamed yet.
 */
function TypingIndicator() {
  return (
    <div className="typing-indicator" aria-live="polite" aria-label="Agent is thinking">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

export default React.memo(TypingIndicator);
