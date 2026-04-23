import React, { useState, useEffect } from 'react';
import './WelcomeScreen.css';

function WelcomeScreen() {
  const [username, setUsername] = useState('User');
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);

  useEffect(() => {
    // Check if this is the first run
    const firstRunFlag = localStorage.getItem('kaizer-first-run');
    const isFirst = !firstRunFlag;
    setIsFirstRun(isFirst);

    // Get username
    if (window.electron?.getUsername) {
      window.electron.getUsername().then(result => {
        if (result.success) {
          setUsername(result.username);
        }
      });
    }

    // Get recent workspaces
    if (window.electron?.getRecentWorkspaces) {
      window.electron.getRecentWorkspaces().then(result => {
        if (result.success) {
          setRecentWorkspaces(result.workspaces);
        }
      });
    }

    // If first run, show animation then set flag
    if (isFirst) {
      // Animation duration: 2.5 seconds total
      setTimeout(() => {
        setShowAnimation(false);
        localStorage.setItem('kaizer-first-run', 'true');
      }, 2500);
    } else {
      setShowAnimation(false);
    }
  }, []);

  const handleOpenFolder = async () => {
    if (!window.electron?.openFolder) return;

    const result = await window.electron.openFolder();
    if (!result.canceled && result.path) {
      // Open workspace from welcome
      await window.electron.openWorkspaceFromWelcome(result.path);
    }
  };

  const handleOpenRecent = async (workspacePath) => {
    if (!window.electron?.openWorkspaceFromWelcome) return;
    await window.electron.openWorkspaceFromWelcome(workspacePath);
  };

  const handleOpenSSH = async () => {
    // Open main IDE with SSH modal triggered
    if (window.electron?.openWorkspaceFromWelcomeWithSSH) {
      await window.electron.openWorkspaceFromWelcomeWithSSH();
    }
  };

  if (isFirstRun && showAnimation) {
    return (
      <div className="welcome-container">
        <div className="welcome-animation">
          <div className="welcome-text">
            <span className="welcome-greeting">Welcome, </span>
            <span className="welcome-username">{username}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-container">
      <div className="welcome-card">
        {/* Left side - Actions */}
        <div className="welcome-left">
          <div className="welcome-header">
            <div className="welcome-logo">
              <div className="logo-icon">K</div>
              <div className="logo-text">KaizerIDE</div>
            </div>
            <div className="welcome-subtitle">Your AI-Powered Code Editor</div>
          </div>

          <div className="welcome-section-title">Start</div>
          <div className="welcome-actions">
            <button className="btn-action" onClick={handleOpenFolder}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Open Folder...</span>
            </button>

            <button className="btn-action" onClick={handleOpenSSH}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Connect to Remote SSH...</span>
            </button>

            <button className="btn-action" onClick={handleOpenFolder}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>New File...</span>
            </button>
          </div>
        </div>

        {/* Right side - Recent folders */}
        <div className="welcome-right">
          {recentWorkspaces.length > 0 ? (
            <div className="recent-section">
              <div className="recent-header">Recent</div>
              <div className="recent-list">
                {recentWorkspaces.slice(0, 5).map((workspace, index) => (
                  <div
                    key={index}
                    className="recent-item"
                    onClick={() => handleOpenRecent(workspace.path)}
                  >
                    <div className="recent-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="recent-info">
                      <div className="recent-name">{workspace.name}</div>
                      <div className="recent-path">{workspace.path}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="recent-section">
              <div className="recent-header">Recent</div>
              <div className="empty-recent">
                <div className="empty-recent-text">
                  Looks like you haven't opened anything recently.
                </div>
                <div className="empty-recent-subtext">
                  Maybe it's time to start a new project?
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
