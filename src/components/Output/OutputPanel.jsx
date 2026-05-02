import React, { useEffect, useRef, useState } from 'react';
import './OutputPanel.css';

function OutputPanel({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('');
  const contentRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const handleOutput = (e) => {
      const { level = 'info', source = 'System', message, timestamp } = e.detail;
      setEntries(prev => [...prev, {
        id: Date.now() + Math.random(),
        level,
        source,
        message,
        timestamp: timestamp || new Date().toLocaleTimeString(),
      }]);
    };

    const handleClear = () => setEntries([]);

    window.addEventListener('kaizer:output', handleOutput);
    window.addEventListener('kaizer:output-clear', handleClear);

    return () => {
      window.removeEventListener('kaizer:output', handleOutput);
      window.removeEventListener('kaizer:output-clear', handleClear);
    };
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [entries]);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    autoScrollRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
  };

  const filtered = filter
    ? entries.filter(e => e.message.toLowerCase().includes(filter.toLowerCase()) || e.source.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  const levelClass = (level) => {
    if (level === 'error') return 'output-entry-error';
    if (level === 'warn') return 'output-entry-warn';
    if (level === 'debug') return 'output-entry-debug';
    return '';
  };

  return (
    <div className="output-panel">
      <div className="output-header">
        <div className="output-header-left">
          <span className="output-title">Output</span>
          <span className="output-count">{entries.length}</span>
        </div>
        <div className="output-header-right">
          <input
            className="output-filter"
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="output-btn" onClick={() => setEntries([])} title="Clear">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a2 2 0 002 2h4a2 2 0 002-2l1-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="output-btn" onClick={() => {
            autoScrollRef.current = true;
            if (contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
          }} title="Auto-scroll">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v12M4 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {onClose && (
            <button className="output-btn" onClick={onClose} title="Close">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="output-content" ref={contentRef} onScroll={handleScroll}>
        {filtered.length === 0 && (
          <div className="output-empty">No output yet.</div>
        )}
        {filtered.map(entry => (
          <div key={entry.id} className={`output-entry ${levelClass(entry.level)}`}>
            <span className="output-entry-time">{entry.timestamp}</span>
            <span className="output-entry-source">[{entry.source}]</span>
            <span className="output-entry-msg">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OutputPanel;
