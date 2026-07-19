import React from 'react';
import Icon from '../../../Common/Icon';

/**
 * AddModelModal - simple form placeholder for adding a model.
 * Extracted verbatim from ChatPanel. Behavior (alert stub) preserved
 * until the real model-management flow is wired.
 */
function AddModelModal({ endpoint, onClose }) {
  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Add Model</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="settings-modal-body">
          <div className="settings-section">
            <label className="settings-label">Model Name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g., GPT-4, Claude 4.5 Sonnet"
            />
          </div>
          <div className="settings-section">
            <label className="settings-label">Model ID</label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g., gpt-4, claude-3-5-sonnet-20241022"
            />
          </div>
          <div className="settings-section">
            <label className="settings-label">API Endpoint</label>
            <input
              type="text"
              className="settings-input"
              placeholder="https://api.openai.com/v1"
              defaultValue={endpoint}
            />
          </div>
          <div className="settings-section">
            <label className="settings-label">API Key</label>
            <input
              type="password"
              className="settings-input"
              placeholder="sk-..."
            />
          </div>
          <div className="settings-section">
            <label className="settings-label">Max Output Tokens</label>
            <input
              type="number"
              className="settings-input"
              placeholder="4096"
              defaultValue="4096"
            />
          </div>
        </div>
        <div className="settings-modal-footer">
          <button className="settings-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="settings-btn-primary"
            onClick={() => {
              // eslint-disable-next-line no-alert
              alert('Model add functionality coming soon!');
              onClose();
            }}
          >
            Add Model
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AddModelModal);
