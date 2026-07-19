import React from 'react';
import Icon from '../../../Common/Icon';

/**
 * ChatHistoryModal - list of past chats with load/delete actions.
 */
function ChatHistoryModal({ chatHistory, onClose, onLoadChat, onDeleteChat }) {
  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Chat History</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="settings-modal-body">
          <div className="history-list">
            {chatHistory.length === 0 ? (
              <div className="history-empty">
                <Icon name="MessageSquare" size={32} className="history-empty-icon" />
                <p>No chat history yet</p>
                <span className="history-empty-hint">
                  Your conversations will appear here
                </span>
              </div>
            ) : (
              chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="history-item"
                  onClick={() => onLoadChat(chat.id)}
                >
                  <div className="history-item-content">
                    <div className="history-item-title">{chat.title}</div>
                    <div className="history-item-meta">
                      <span>{new Date(chat.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{chat.messages.length} messages</span>
                    </div>
                  </div>
                  <div className="history-item-actions">
                    <button
                      className="history-action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ChatHistoryModal);
