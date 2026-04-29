import React, { useState, useEffect } from 'react';
import { indexer } from '../../lib/indexer';
import './StatusBar.css';

const LANG_DISPLAY = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  markdown: 'Markdown',
  yaml: 'YAML',
  xml: 'XML',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  java: 'Java',
  go: 'Go',
  rust: 'Rust',
  lua: 'Lua',
  php: 'PHP',
  ruby: 'Ruby',
  sql: 'SQL',
  shell: 'Shell',
  bat: 'Batch',
  plaintext: 'Plain Text',
};

function StatusBar({ activeFile, modelName, endpoint, cursorPosition, languageMode, chatVisible, onToggleChat }) {
  const [indexStatus, setIndexStatus] = useState(() => ({
    status: indexer.status,
    progress: indexer.progress,
    fileCount: indexer.index.length,
    enabled: indexer.enabled
  }));
  const [sshStatus, setSSHStatus] = useState({ connected: false, isRemote: false });

  useEffect(() => {
    return indexer.subscribe(setIndexStatus);
  }, []);

  useEffect(() => {
    // Check SSH status on mount and periodically
    const checkSSHStatus = async () => {
      if (window.electron?.getSSHStatus) {
        const status = await window.electron.getSSHStatus();
        setSSHStatus(status);
      }
    };

    checkSSHStatus();
    const interval = setInterval(checkSSHStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getEndpointHost = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.host;
    } catch {
      return url;
    }
  };

  const handleIndexerClick = () => {
    window.dispatchEvent(new CustomEvent('kaizer:open-settings', { detail: { tab: 'indexer' } }));
  };

  const getLanguageDisplay = () => {
    if (!languageMode || languageMode === 'plaintext') return null;
    return LANG_DISPLAY[languageMode] || languageMode;
  };

  const getIndexerIndicator = () => {
    if (!indexStatus.enabled) return null;

    if (indexStatus.status === 'indexing') {
      return (
        <div className="status-indexer indexing" onClick={handleIndexerClick} title={`Indexing workspace... ${indexStatus.progress}%`}>
          <span className="indexer-dot pulsing"></span>
          <span className="indexer-text">Indexing {indexStatus.progress}%</span>
        </div>
      );
    }

    if (indexStatus.status === 'ready') {
      return (
        <div className="status-indexer ready" onClick={handleIndexerClick} title={`Index ready — ${indexStatus.fileCount} files`}>
          <span className="indexer-dot"></span>
        </div>
      );
    }

    if (indexStatus.status === 'error') {
      return (
        <div className="status-indexer error" onClick={handleIndexerClick} title="Indexing failed">
          <span className="indexer-dot"></span>
        </div>
      );
    }

    if (indexStatus.status === 'idle') {
      return (
        <div className="status-indexer idle" onClick={handleIndexerClick} title="Not indexed">
          <span className="indexer-dot"></span>
        </div>
      );
    }

    return null;
  };

  const langDisplay = getLanguageDisplay();

  return (
    <div className="status-bar">
      <div className="status-left">
        {activeFile ? (
          <span className="status-file">{activeFile}</span>
        ) : (
          <span className="status-file status-empty">No file open</span>
        )}
      </div>
      <div className="status-right">
        {cursorPosition && activeFile && (
          <div className="status-item" title="Line / Column">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          </div>
        )}
        {langDisplay && (
          <div className="status-item status-language" title="Language Mode">
            <span>{langDisplay}</span>
          </div>
        )}
        <div className="status-item" title="Encoding">
          <span>UTF-8</span>
        </div>
        <div className="status-item" title="Line Endings">
          <span>CRLF</span>
        </div>
        {sshStatus.connected && (
          <div className="status-ssh connected" title="SSH Connected">
            <span className="ssh-dot"></span>
            <span className="ssh-text">SSH</span>
          </div>
        )}
        {getIndexerIndicator()}
        <div
          className={`status-item status-chat-toggle ${chatVisible ? 'active' : ''}`}
          onClick={onToggleChat}
          title="Toggle AI Chat"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V2a1 1 0 00-1-1zM2 11V2h12v8H5.5L3 12.5V11H2z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
