import React, { useState, useEffect } from 'react';
import MenuBar from './MenuBar';
import './TitleBar.css';

function TitleBar({ workspacePath, onSettingsClick, onMenuAction }) {
  const [isMacOS, setIsMacOS] = useState(false);

  useEffect(() => {
    // Load appearance settings
    const saved = localStorage.getItem('kaizer-appearance-settings');
    const settings = saved ? JSON.parse(saved) : { windowControlsTheme: 'windows' };
    
    // Determine theme
    setIsMacOS(settings.windowControlsTheme === 'macos');

    // Listen for settings changes
    const handleSettingsChange = (e) => {
      const newSettings = e.detail;
      setIsMacOS(newSettings.windowControlsTheme === 'macos');
    };

    window.addEventListener('kaizer:appearance-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('kaizer:appearance-settings-changed', handleSettingsChange);
  }, []);

  const handleMinimize = () => {
    window.electron?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electron?.windowMaximize();
  };

  const handleClose = () => {
    window.electron?.windowClose();
  };

  return (
    <div className={`titlebar ${isMacOS ? 'titlebar-macos' : 'titlebar-windows'}`}>
      <div className="titlebar-left">
        {isMacOS && (
          <div className="window-controls-macos">
            <button className="macos-btn close" onClick={handleClose} title="Close">
              <svg width="6" height="6" viewBox="0 0 6 6">
                <path d="M0 0L6 6M6 0L0 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </button>
            <button className="macos-btn minimize" onClick={handleMinimize} title="Minimize">
              <svg width="8" height="2" viewBox="0 0 8 2">
                <rect width="8" height="2" fill="currentColor" />
              </svg>
            </button>
            <button className="macos-btn maximize" onClick={handleMaximize} title="Maximize">
              <svg width="6" height="6" viewBox="0 0 6 6">
                <path d="M0 2L3 5L6 2" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
        {!isMacOS && (
          <>
            <div className="logo">K</div>
            <MenuBar onMenuAction={onMenuAction} />
          </>
        )}
      </div>
      <div className="titlebar-center">
        {!isMacOS && (
          <button className="titlebar-icon-btn" onClick={onSettingsClick} title="Settings (Ctrl+,)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
              <path d="M14 8a1.5 1.5 0 01-1.5 1.5h-.5a.5.5 0 00-.5.5v.5a1.5 1.5 0 01-1.5 1.5h-.5a.5.5 0 00-.5.5v.5a1.5 1.5 0 01-1.5 1.5h-1a1.5 1.5 0 01-1.5-1.5v-.5a.5.5 0 00-.5-.5h-.5A1.5 1.5 0 012 10.5v-.5a.5.5 0 00-.5-.5h-.5A1.5 1.5 0 010 8v-1a1.5 1.5 0 011.5-1.5h.5a.5.5 0 00.5-.5v-.5A1.5 1.5 0 014 3h.5a.5.5 0 00.5-.5v-.5A1.5 1.5 0 016.5 0h1A1.5 1.5 0 019 1.5v.5a.5.5 0 00.5.5h.5A1.5 1.5 0 0111.5 4v.5a.5.5 0 00.5.5h.5A1.5 1.5 0 0114 6.5V8z"/>
            </svg>
          </button>
        )}
      </div>
      <div className="titlebar-right">
        {isMacOS && (
          <>
            <MenuBar onMenuAction={onMenuAction} />
            <div className="logo">K</div>
          </>
        )}
        {!isMacOS && (
          <>
            <button className="titlebar-btn minimize" onClick={handleMinimize}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect x="0" y="5" width="12" height="2" fill="currentColor" />
              </svg>
            </button>
            <button className="titlebar-btn maximize" onClick={handleMaximize}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button className="titlebar-btn close" onClick={handleClose}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default TitleBar;
