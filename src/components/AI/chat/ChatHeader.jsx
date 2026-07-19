import React from 'react';
import Icon from '../../Common/Icon';

/**
 * ChatHeader - top bar with title + new-chat + history buttons.
 * Pure presentational, memoized.
 */
function ChatHeader({ onNewChat, onOpenHistory }) {
  return (
    <div className="chat-header-new">
      <div className="chat-header-left">
        <Icon name="MessageSquare" size={16} className="chat-icon" />
        <span className="chat-title">Chat</span>
      </div>
      <div className="chat-header-right">
        <button
          className="icon-btn"
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
        >
          <Icon name="Plus" size={16} />
        </button>
        <button
          className="icon-btn"
          onClick={onOpenHistory}
          title="History"
          aria-label="Chat history"
        >
          <Icon name="Clock" size={16} />
        </button>
      </div>
    </div>
  );
}

export default React.memo(ChatHeader);
