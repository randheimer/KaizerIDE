import React, { useState, useEffect } from 'react';
import { indexer } from '../../lib/indexer';
import './SettingsModal.css';

function SettingsModal({ settings, onSave, onClose, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'general');
  const [localSettings, setLocalSettings] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAddProvider, setShowAddProvider] = useState(false);
  
  // Indexer status state
  const [indexStatus, setIndexStatus] = useState(() => ({
    status: indexer.status,
    progress: indexer.progress,
    totalFiles: indexer.totalFiles,
    indexedFiles: indexer.indexedFiles,
    enabled: indexer.enabled,
    fileCount: indexer.index.length,
    workspacePath: indexer.workspacePath
  }));

  useEffect(() => {
    return indexer.subscribe(setIndexStatus);
  }, []);
  
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
      accentColor: '#a855f7',
      windowControlsTheme: 'windows'
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
    window.dispatchEvent(new CustomEvent('kaizer:appearance-settings-changed', { detail: appearanceSettings }));
    alert('Appearance settings saved! Refresh to apply window controls theme.');
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

  const tokenSaver = localSettings.tokenSaver || {
    enabled: true,
    targetTokenBudget: 2000,
    adaptiveMode: true,
    deduplicateLines: true,
    showCompressionBadge: true
  };

  const updateTokenSaver = (patch) => {
    setLocalSettings(prev => ({
      ...prev,
      tokenSaver: {
        ...(prev.tokenSaver || tokenSaver),
        ...patch
      }
    }));
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
          <button
            className={`settings-tab ${activeTab === 'indexer' ? 'active' : ''}`}
            onClick={() => setActiveTab('indexer')}
          >
            Indexer
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-panel">
              <div className="setting-group">
                <label>AI Provider</label>
                <select
                  value={localSettings.provider || 'openai-compatible'}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, provider: e.target.value }))}
                  className="model-select"
                >
                  <option value="openai-compatible">OpenAI Compatible</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
                <span className="setting-description">Choose your AI provider</span>
              </div>

              <div className="setting-group">
                <label>Endpoint URL</label>
                <input
                  type="text"
                  className="endpoint-input"
                  value={localSettings.endpoint}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder={
                    localSettings.provider === 'anthropic' 
                      ? 'https://api.anthropic.com/v1' 
                      : 'http://localhost:20128/v1'
                  }
                />
                <span className="setting-description">
                  {localSettings.provider === 'anthropic' 
                    ? 'Anthropic API endpoint (leave empty for default)' 
                    : 'API endpoint for AI chat functionality'}
                </span>
              </div>

              <div className="setting-group">
                <label>API Key</label>
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="api-key-input"
                    value={localSettings.apiKey}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={localSettings.provider === 'anthropic' ? 'Required for Anthropic' : 'Optional'}
                  />
                  <button
                    className="toggle-visibility"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <span className="setting-description">
                  {localSettings.provider === 'anthropic' 
                    ? 'Your Anthropic API key (required)' 
                    : 'Optional API key for authentication'}
                </span>
              </div>

              <div className="token-saver-card">
                <div className="setting-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={!!tokenSaver.enabled}
                      onChange={(e) => updateTokenSaver({ enabled: e.target.checked })}
                    />
                    Enable Token Saver
                  </label>
                  <span className="setting-description">Compress large tool results before they are sent back to the model</span>
                </div>

                <div className="setting-group">
                  <label>Tool Result Budget</label>
                  <input
                    type="range"
                    min="500"
                    max="6000"
                    step="250"
                    value={tokenSaver.targetTokenBudget || 2000}
                    onChange={(e) => updateTokenSaver({ targetTokenBudget: parseInt(e.target.value, 10) })}
                    className="token-saver-range"
                  />
                  <span className="setting-description">~{tokenSaver.targetTokenBudget || 2000} tokens per compressed tool result</span>
                </div>

                <div className="setting-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={tokenSaver.adaptiveMode !== false}
                      onChange={(e) => updateTokenSaver({ adaptiveMode: e.target.checked })}
                    />
                    Adaptive mode
                  </label>
                  <span className="setting-description">Use tighter compression when context is already large</span>
                </div>

                <div className="setting-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={tokenSaver.showCompressionBadge !== false}
                      onChange={(e) => updateTokenSaver({ showCompressionBadge: e.target.checked })}
                    />
                    Show compression badge
                  </label>
                  <span className="setting-description">Show a badge when the model receives compressed output</span>
                </div>
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
                <label>Window Controls Theme</label>
                <select
                  value={appearanceSettings.windowControlsTheme}
                  onChange={(e) => setAppearanceSettings(prev => ({ ...prev, windowControlsTheme: e.target.value }))}
                  className="model-select"
                >
                  <option value="macos">macOS Style</option>
                  <option value="windows">Windows Style</option>
                </select>
                <span className="setting-description">Choose window controls style (minimize, maximize, close buttons)</span>
              </div>

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

          {activeTab === 'indexer' && (
            <div className="settings-panel">
              <div className="setting-group">
                <label>Workspace Indexer</label>
                <span className="setting-description">Indexes your codebase locally so the AI has instant context awareness. No data leaves your machine.</span>
              </div>

              <div className="setting-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={indexStatus.enabled}
                    onChange={(e) => indexer.setEnabled(e.target.checked)}
                  />
                  Enable workspace indexing
                </label>
                <span className="setting-description">When enabled, KaizerIDE will automatically index your workspace files</span>
              </div>

              {!indexStatus.enabled && (
                <div style={{ padding: '12px', background: 'var(--bg-2)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-2)' }}>
                  Indexing is disabled. AI will use tools to explore files on demand.
                </div>
              )}

              {indexStatus.enabled && (
                <>
                  <div className="indexer-status-card">
                    {indexStatus.status === 'idle' && (
                      <>
                        <div className="status-indicator">
                          <span className="status-dot idle"></span>
                          <span className="status-text">Not indexed yet</span>
                        </div>
                        <button 
                          className="indexer-action-btn"
                          onClick={() => indexStatus.workspacePath && indexer.startIndexing(indexStatus.workspacePath)}
                          disabled={!indexStatus.workspacePath}
                        >
                          Start Indexing
                        </button>
                      </>
                    )}

                    {indexStatus.status === 'indexing' && (
                      <>
                        <div className="status-indicator">
                          <span className="status-dot indexing"></span>
                          <span className="status-text">Indexing workspace...</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${indexStatus.progress}%` }}></div>
                        </div>
                        <div className="progress-text">
                          {indexStatus.indexedFiles} / {indexStatus.totalFiles} files indexed ({indexStatus.progress}%)
                        </div>
                        <button 
                          className="indexer-action-btn cancel"
                          onClick={() => indexer.abort()}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {indexStatus.status === 'ready' && (
                      <>
                        <div className="status-indicator">
                          <span className="status-dot ready"></span>
                          <span className="status-text">Index ready</span>
                        </div>
                        <div className="index-stats">
                          <span className="stat-item">{indexStatus.fileCount} files</span>
                          <span className="stat-separator">•</span>
                          <span className="stat-item">Auto-updating</span>
                        </div>
                        <button 
                          className="indexer-action-btn"
                          onClick={() => indexStatus.workspacePath && indexer.reindex(indexStatus.workspacePath)}
                        >
                          Re-index Workspace
                        </button>
                      </>
                    )}

                    {indexStatus.status === 'error' && (
                      <>
                        <div className="status-indicator">
                          <span className="status-dot error"></span>
                          <span className="status-text">Indexing failed</span>
                        </div>
                        <button 
                          className="indexer-action-btn"
                          onClick={() => indexStatus.workspacePath && indexer.startIndexing(indexStatus.workspacePath)}
                        >
                          Retry
                        </button>
                      </>
                    )}

                    {indexStatus.status === 'aborted' && (
                      <>
                        <div className="status-indicator">
                          <span className="status-dot idle"></span>
                          <span className="status-text">Indexing cancelled</span>
                        </div>
                        <button 
                          className="indexer-action-btn"
                          onClick={() => indexStatus.workspacePath && indexer.startIndexing(indexStatus.workspacePath)}
                        >
                          Start Indexing
                        </button>
                      </>
                    )}
                  </div>

                  {indexStatus.status === 'ready' && indexStatus.fileCount > 0 && (
                    <div className="file-type-breakdown">
                      <label>File Types</label>
                      <div className="file-type-badges">
                        {(() => {
                          const extCounts = {};
                          indexer.index.forEach(f => {
                            extCounts[f.ext] = (extCounts[f.ext] || 0) + 1;
                          });
                          return Object.entries(extCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([ext, count]) => (
                              <span key={ext} className="file-type-badge">
                                {ext || 'none'}({count})
                              </span>
                            ));
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="indexer-note">
                    <span className="note-text">Index is stored in localStorage and refreshed every hour.</span>
                    <button 
                      className="clear-index-btn"
                      onClick={() => {
                        if (confirm('Clear all cached indexes?')) {
                          indexer.clearStorage();
                          alert('Index cache cleared');
                        }
                      }}
                    >
                      Clear Index
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
