import React, { useState, useEffect } from 'react';
import FileExplorer from '../Sidebar/FileExplorer';
import './RemoteConnectionModal.css';

function RemoteConnectionModal({ onClose, onConnect }) {
  const [activeTab, setActiveTab] = useState('connect');
  const [connectionForm, setConnectionForm] = useState({
    host: '',
    port: '22',
    username: '',
    authType: 'password', // 'password' or 'key'
    password: '',
    privateKey: '',
    name: '' // Optional connection name
  });
  const [savedConnections, setSavedConnections] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectedInfo, setConnectedInfo] = useState(null); // Store connection info after successful connect

  useEffect(() => {
    // Load saved connections from localStorage
    const saved = localStorage.getItem('kaizer-ssh-connections');
    if (saved) {
      try {
        setSavedConnections(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved connections:', e);
      }
    }
  }, []);

  const handleConnect = async () => {
    setError(null);
    
    // Validate form
    if (!connectionForm.host || !connectionForm.username) {
      setError('Host and username are required');
      return;
    }

    if (connectionForm.authType === 'password' && !connectionForm.password) {
      setError('Password is required');
      return;
    }

    if (connectionForm.authType === 'key' && !connectionForm.privateKey) {
      setError('Private key is required');
      return;
    }

    setConnecting(true);

    try {
      // Call Electron IPC to establish SSH connection
      const result = await window.electron.connectSSH({
        host: connectionForm.host,
        port: parseInt(connectionForm.port),
        username: connectionForm.username,
        authType: connectionForm.authType,
        password: connectionForm.authType === 'password' ? connectionForm.password : undefined,
        privateKey: connectionForm.authType === 'key' ? connectionForm.privateKey : undefined
      });

      if (result.success) {
        // Save connection to history (without password)
        const connectionToSave = {
          id: Date.now(),
          name: connectionForm.name || `${connectionForm.username}@${connectionForm.host}`,
          host: connectionForm.host,
          port: connectionForm.port,
          username: connectionForm.username,
          authType: connectionForm.authType,
          lastConnected: new Date().toISOString()
        };

        const updated = [connectionToSave, ...savedConnections.filter(c => 
          !(c.host === connectionForm.host && c.username === connectionForm.username)
        )].slice(0, 10); // Keep last 10 connections

        setSavedConnections(updated);
        localStorage.setItem('kaizer-ssh-connections', JSON.stringify(updated));

        // Store connection info
        setConnectedInfo(result.connection);
        
        // Wait a moment for SFTP to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Switch to browse tab
        setActiveTab('browse');
        
        // Notify parent with connection info
        if (onConnect) {
          onConnect(result.connection);
        }
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleLoadConnection = (connection) => {
    setConnectionForm({
      host: connection.host,
      port: connection.port,
      username: connection.username,
      authType: connection.authType,
      password: '',
      privateKey: '',
      name: connection.name
    });
    setActiveTab('connect');
  };

  const handleDeleteConnection = (id) => {
    const updated = savedConnections.filter(c => c.id !== id);
    setSavedConnections(updated);
    localStorage.setItem('kaizer-ssh-connections', JSON.stringify(updated));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="remote-connection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>SSH Connection</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'connect' ? 'active' : ''}`}
            onClick={() => setActiveTab('connect')}
          >
            Connect
          </button>
          <button
            className={`modal-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved Connections ({savedConnections.length})
          </button>
          {connectedInfo && (
            <button
              className={`modal-tab ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              📁 Browse Remote
            </button>
          )}
        </div>

        <div className="modal-content">
          {activeTab === 'connect' && (
            <div className="connection-form">
              {error && (
                <div className="error-banner">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label>Connection Name (Optional)</label>
                <input
                  type="text"
                  value={connectionForm.name}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Server"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Host *</label>
                  <input
                    type="text"
                    value={connectionForm.host}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="example.com or 192.168.1.100"
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Port</label>
                  <input
                    type="number"
                    value={connectionForm.port}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, port: e.target.value }))}
                    placeholder="22"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={connectionForm.username}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="root"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Authentication Method</label>
                <div className="auth-type-selector">
                  <button
                    className={`auth-type-btn ${connectionForm.authType === 'password' ? 'active' : ''}`}
                    onClick={() => setConnectionForm(prev => ({ ...prev, authType: 'password' }))}
                  >
                    🔑 Password
                  </button>
                  <button
                    className={`auth-type-btn ${connectionForm.authType === 'key' ? 'active' : ''}`}
                    onClick={() => setConnectionForm(prev => ({ ...prev, authType: 'key' }))}
                  >
                    🔐 SSH Key
                  </button>
                </div>
              </div>

              {connectionForm.authType === 'password' && (
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={connectionForm.password}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    className="form-input"
                  />
                </div>
              )}

              {connectionForm.authType === 'key' && (
                <div className="form-group">
                  <label>Private Key *</label>
                  <textarea
                    value={connectionForm.privateKey}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, privateKey: e.target.value }))}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    className="form-textarea"
                    rows={6}
                  />
                  <span className="form-hint">Paste your private key content here</span>
                </div>
              )}

              <div className="form-actions">
                <button className="btn-secondary" onClick={onClose} disabled={connecting}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="saved-connections">
              {savedConnections.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📂</span>
                  <span className="empty-text">No saved connections</span>
                  <span className="empty-hint">Connect to a server to save it here</span>
                </div>
              ) : (
                <div className="connections-list">
                  {savedConnections.map(conn => (
                    <div key={conn.id} className="connection-item">
                      <div className="connection-info">
                        <div className="connection-name">{conn.name}</div>
                        <div className="connection-details">
                          {conn.username}@{conn.host}:{conn.port}
                        </div>
                        <div className="connection-meta">
                          <span className="auth-badge">{conn.authType === 'password' ? '🔑 Password' : '🔐 SSH Key'}</span>
                          <span className="connection-date">
                            Last: {new Date(conn.lastConnected).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="connection-actions">
                        <button
                          className="connection-action-btn"
                          onClick={() => handleLoadConnection(conn)}
                          title="Load connection"
                        >
                          📝
                        </button>
                        <button
                          className="connection-action-btn delete"
                          onClick={() => handleDeleteConnection(conn.id)}
                          title="Delete connection"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'browse' && connectedInfo && (
            <div className="remote-browser">
              <div className="remote-browser-header">
                <span className="remote-connection-info">
                  🌐 Connected to {connectedInfo.username}@{connectedInfo.host}
                </span>
                <button 
                  className="btn-disconnect"
                  onClick={async () => {
                    await window.electron.disconnectSSH();
                    setConnectedInfo(null);
                    setActiveTab('connect');
                  }}
                >
                  Disconnect
                </button>
              </div>
              <div className="remote-browser-content">
                <FileExplorer
                  key={`remote-${connectedInfo.host}`}
                  workspacePath={`/home/${connectedInfo.username}`}
                  remoteMode={true}
                  onFileOpen={(path) => {
                    // Don't open files in browse mode, just navigate
                    console.log('File clicked:', path);
                  }}
                  onOpenFolder={async (path) => {
                    // User selected a remote folder as workspace
                    onClose();
                    // Notify app to open this remote path as workspace
                    window.dispatchEvent(new CustomEvent('kaizer:open-remote-workspace', {
                      detail: { path, connection: connectedInfo }
                    }));
                  }}
                  visible={true}
                />
              </div>
              <div className="remote-browser-footer">
                <span className="hint-text">Right-Click a folder and press "Open as Workspace" to open it as workspace</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RemoteConnectionModal;
