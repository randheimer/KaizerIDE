import React, { useState } from 'react';
import './Sidebar.css';
import FileExplorer from './FileExplorer';

function Sidebar({ onFileOpen, chatVisible, onToggleChat }) {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
          title="Explorer (Ctrl+Shift+E)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3h6l2 2h8v12H2V3z" />
          </svg>
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          title="Search (Ctrl+Shift+F)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="5" />
            <path d="M12 12l5 5" />
          </svg>
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
          title="Source Control (Ctrl+Shift+G)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="5" r="2" />
            <circle cx="15" cy="15" r="2" />
            <path d="M5 7v6M7 5h6M15 13V7" />
          </svg>
        </button>
        <button 
          className={`sidebar-tab sidebar-tab-ai ${chatVisible ? 'active' : ''}`}
          onClick={onToggleChat}
          title="AI Assistant (Ctrl+Shift+C)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.5 10c0-.3-.1-.5-.3-.7l-2-2c-.2-.2-.4-.3-.7-.3h-1V5.5c0-.8-.7-1.5-1.5-1.5h-4c-.8 0-1.5.7-1.5 1.5V7h-1c-.3 0-.5.1-.7.3l-2 2c-.2.2-.3.4-.3.7v4c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5v-4zM8 5.5c0-.3.2-.5.5-.5h3c.3 0 .5.2.5.5V7H8V5.5z"/>
            <circle cx="8" cy="11" r="1"/>
            <circle cx="12" cy="11" r="1"/>
          </svg>
        </button>
        <div className="sidebar-spacer" />
        <button 
          className="sidebar-tab sidebar-tab-settings"
          onClick={() => window.dispatchEvent(new CustomEvent('kaizer:open-settings'))}
          title="Settings (Ctrl+,)"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
            <path d="M14 8a1.5 1.5 0 01-1.5 1.5h-.5a.5.5 0 00-.5.5v.5a1.5 1.5 0 01-1.5 1.5h-.5a.5.5 0 00-.5.5v.5a1.5 1.5 0 01-1.5 1.5h-1a1.5 1.5 0 01-1.5-1.5v-.5a.5.5 0 00-.5-.5h-.5A1.5 1.5 0 012 10.5v-.5a.5.5 0 00-.5-.5h-.5A1.5 1.5 0 010 8v-1a1.5 1.5 0 011.5-1.5h.5a.5.5 0 00.5-.5v-.5A1.5 1.5 0 014 3h.5a.5.5 0 00.5-.5v-.5A1.5 1.5 0 016.5 0h1A1.5 1.5 0 019 1.5v.5a.5.5 0 00.5.5h.5A1.5 1.5 0 0111.5 4v.5a.5.5 0 00.5.5h.5A1.5 1.5 0 0114 6.5V8z"/>
          </svg>
        </button>
      </div>
      <div className="sidebar-content">
        {activeTab === 'files' && (
          <FileExplorer onFileOpen={onFileOpen} />
        )}
        {activeTab === 'search' && (
          <div className="sidebar-panel">
            <div className="sidebar-header">
              <span>SEARCH</span>
            </div>
            <div className="search-container">
              <input type="text" placeholder="Search..." className="search-input" />
            </div>
          </div>
        )}
        {activeTab === 'git' && (
          <div className="sidebar-panel">
            <div className="sidebar-header">
              <span>SOURCE CONTROL</span>
            </div>
            <div className="git-status">
              <p className="empty-state">No changes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
