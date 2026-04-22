import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

function SettingsModal({ settings, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('general');
  const [localSettings, setLocalSettings] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Editor settings state
  const [editorSettings, setEditorSettings] = useState(() => {
    const saved = localStorage.getItem('kaizer-editor-settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
      minimap: true,
      lineNumbers: true,
      autoSave: 'off',
      autoSaveDelay: 1000,
      theme: 'kaizer-dark',
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorStyle: 'line',
      renderWhitespace: 'selection',
      bracketPairColorization: true,
      formatOnSave: false
    };
  });

  // Appearance settings state
  const [appearanceSettings, setAppearanceSettings] = useState(() => {
    const saved = localStorage.getItem('kaizer-appearance-settings');
    return saved ? JSON.parse(saved) : {
      sidebarPosition: 'left',
      showStatusBar: true,
      compactMode: false,
      accentColor: '#a855f7'
    };
  });

  const handleSaveGeneral = () => {
    onSave(localSettings);
  };

  const handleSaveEditor = () => {
    localStorage.setItem('kaizer-editor-settings', JSON.stringify(editorSettings));
    window.dispatchEvent(new CustomEvent('kaizer:editor-settings-changed', { detail: editorSettings }));
  };

  const handleSaveAppearance = () => {
    localStorage.setItem('kaizer-appearance-settings', JSON.stringify(appearanceSettings));
    document.documentElement.style.setProperty('--accent', appearanceSettings.accentColor);
    alert('Appearance settings saved!');
  };

  const handleAddModel = () => {
    const id = prompt('Model ID (e.g., kr/claude-sonnet-4.5):');
    if (!id) return;
    
    const name = prompt('Model Name:');
    if (!name) return;
    
    const maxTokens = parseInt(prompt('Max Output Tokens:', '16000'));
    if (isNaN(maxTokens)) return;

    const newModel = { id, name, maxOutputTokens: maxTokens };
    setLocalSettings(prev => ({
      ...prev,
      models: [...prev.models, newModel]
    }));
  };

  const handleDeleteModel = (modelId) => {
    if (localSettings.models.length <= 1) {
      alert('Cannot delete the last model');
      return;
    }
    
    setLocalSettings(prev => ({
      ...prev,
      models: prev.models.filter(m => m.id !== modelId)
    }));
  };

  const handleSaveModels = () => {
    onSave(localSettings);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
          <button
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
          <button
            className={`settings-tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            AI Models
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-panel">
              <div className="setting-group">
                <label>Endpoint URL</label>
                <input
                  type="text"
                  className="endpoint-input"
                  value={localSettings.endpoint}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="http://localhost:20128/v1"
                />
                <span className="setting-description">API endpoint for AI chat functionality</span>
              </div>

              <div className="setting-group">
                <label>API Key</label>
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="api-key-input"
                    value={localSettings.apiKey}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Optional"
                  />
                  <button
                    className="toggle-visibility"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <span className="setting-description">Optional API key for authentication</span>
              </div>

              <button className="save-btn" onClick={handleSaveGeneral}>
                Save General Settings
              </button>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="settings-panel">
              <div className="setting-group">
                <label>Font Size</label>
                <input
                  type="number"
                  min="8"
                  max="32"
                  value={editorSettings.fontSize}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="number-input"
                />
                <span className="setting-description">Editor font size in pixels</span>
              </div>

              <div className="setting-group">
                <label>Tab Size</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={editorSettings.tabSize}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, tabSize: parseInt(e.target.value) }))}
                  className="number-input"
                />
                <span className="setting-description">Number of spaces per tab</span>
              </div>

              <div className="setting-group">
                <label>Font Family</label>
                <input
                  type="text"
                  value={editorSettings.fontFamily}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="endpoint-input"
                />
                <span className="setting-description">Editor font family</span>
              </div>

              <div className="setting-group">
                <label>Word Wrap</label>
                <select
                  value={editorSettings.wordWrap}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, wordWrap: e.target.value }))}
                  className="model-select"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                  <option value="wordWrapColumn">At Column</option>
                  <option value="bounded">Bounded</option>
                </select>
                <span className="setting-description">How lines should wrap</span>
              </div>

              <div className="setting-group">
                <label>Theme</label>
                <select
                  value={editorSettings.theme}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, theme: e.target.value }))}
                  className="model-select"
                >
                  <option value="kaizer-dark">Kaizer Dark (Default)</option>
                  <option value="zero-syntax">Zero Syntax (Minimal)</option>
                  <option value="vs-dark">VS Dark</option>
                  <option value="vs">VS Light</option>
                  <option value="hc-black">High Contrast</option>
                </select>
                <span className="setting-description">Editor color theme</span>
              </div>

              <div className="setting-group">
                <label>Cursor Style</label>
                <select
                  value={editorSettings.cursorStyle}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, cursorStyle: e.target.value }))}
                  className="model-select"
                >
                  <option value="line">Line</option>
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                  <option value="line-thin">Line Thin</option>
                  <option value="block-outline">Block Outline</option>
                  <option value="underline-thin">Underline Thin</option>
                </select>
                <span className="setting-description">Cursor appearance</span>
              </div>

              <div className="setting-group">
                <label>Render Whitespace</label>
                <select
                  value={editorSettings.renderWhitespace}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, renderWhitespace: e.target.value }))}
                  className="model-select"
                >
                  <option value="none">None</option>
                  <option value="boundary">Boundary</option>
                  <option value="selection">Selection</option>
                  <option value="all">All</option>
                </select>
                <span className="setting-description">Show whitespace characters</span>
              </div>

              <div className="setting-group">
                <label>Auto Save</label>
                <select
                  value={editorSettings.autoSave}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, autoSave: e.target.value }))}
                  className="model-select"
                >
                  <option value="off">Off</option>
                  <option value="afterDelay">After Delay</option>
                  <option value="onFocusChange">On Focus Change</option>
                </select>
                <span className="setting-description">Automatically save files</span>
              </div>

              {editorSettings.autoSave === 'afterDelay' && (
                <div className="setting-group">
                  <label>Auto Save Delay (ms)</label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={editorSettings.autoSaveDelay}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, autoSaveDelay: parseInt(e.target.value) }))}
                    className="number-input"
                  />
                  <span className="setting-description">Delay before auto-saving</span>
                </div>
              )}

              <div className="setting-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editorSettings.minimap}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, minimap: e.target.checked }))}
                  />
                  Show Minimap
                </label>
                <span className="setting-description">Display code minimap on the right</span>
              </div>

              <div className="setting-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editorSettings.lineNumbers}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, lineNumbers: e.target.checked }))}
                  />
                  Show Line Numbers
                </label>
                <span className="setting-description">Display line numbers</span>
              </div>

              <div className="setting-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editorSettings.bracketPairColorization}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, bracketPairColorization: e.target.checked }))}
                  />
                  Bracket Pair Colorization
                </label>
                <span className="setting-description">Color matching brackets</span>
              </div>

              <div className="setting-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editorSettings.formatOnSave}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, formatOnSave: e.target.checked }))}
                  />
                  Format On Save
                </label>
                <span className="setting-description">Auto-format code when saving</span>
              </div>

              <button className="save-btn" onClick={handleSaveEditor}>
                Save Editor Settings
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-panel">
              <div className="setting-group">
                <label>Accent Color</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={appearanceSettings.accentColor}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                    style={{ width: '60px', height: '36px', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    value={appearanceSettings.accentColor}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="endpoint-input"
                    style={{ flex: 1 }}
                  />
                </div>
                <span className="setting-description">Primary accent color for the IDE</span>
              </div>

              <div className="setting-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={appearanceSettings.showStatusBar}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, showStatusBar: e.target.checked }))}
                  />
                  Show Status Bar
                </label>
                <span className="setting-description">Display status bar at bottom</span>
              </div>

              <div className="setting-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={appearanceSettings.compactMode}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, compactMode: e.target.checked }))}
                  />
                  Compact Mode
                </label>
                <span className="setting-description">Reduce padding and spacing</span>
              </div>

              <button className="save-btn" onClick={handleSaveAppearance}>
                Save Appearance Settings
              </button>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="settings-panel">
              <div className="models-list">
                {localSettings.models.map(model => (
                  <div key={model.id} className="model-row">
                    <div className="model-info">
                      <div className="model-id">{model.id}</div>
                      <div className="model-name">{model.name}</div>
                      <div className="model-tokens">{model.maxOutputTokens} tokens</div>
                    </div>
                    <button
                      className="delete-model-btn"
                      onClick={() => handleDeleteModel(model.id)}
                      title="Delete model"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-model-section">
                <button className="add-model-btn" onClick={handleAddModel}>
                  + Add Model
                </button>
              </div>

              <button className="save-btn" onClick={handleSaveModels}>
                Save AI Models
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
