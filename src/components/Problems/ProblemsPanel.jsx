import React, { useState, useEffect, useCallback } from 'react';
import './ProblemsPanel.css';

const SEVERITY_ICONS = {
  8: { icon: '✕', class: 'error', label: 'Error' },    // Hint
  1: { icon: '●', class: 'error', label: 'Error' },     // Error
  2: { icon: '▲', class: 'warning', label: 'Warning' }, // Warning
  4: { icon: 'ⓘ', class: 'info', label: 'Info' },       // Info
};

function ProblemsPanel({ onClose, onGoToLocation }) {
  const [markers, setMarkers] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'error' | 'warning' | 'info'

  const refreshMarkers = useCallback(() => {
    if (typeof monaco === 'undefined' || !monaco?.editor) return;
    const allMarkers = monaco.editor.getModelMarkers({});
    setMarkers(allMarkers.filter(m => m.severity <= 4)); // exclude hints (8)
  }, []);

  useEffect(() => {
    refreshMarkers();
    const interval = setInterval(refreshMarkers, 2000);
    return () => clearInterval(interval);
  }, [refreshMarkers]);

  const filteredMarkers = filter === 'all'
    ? markers
    : markers.filter(m => {
        if (filter === 'error') return m.severity === 1;
        if (filter === 'warning') return m.severity === 2;
        if (filter === 'info') return m.severity === 4;
        return true;
      });

  const errorCount = markers.filter(m => m.severity === 1).length;
  const warningCount = markers.filter(m => m.severity === 2).length;
  const infoCount = markers.filter(m => m.severity === 4).length;

  const getRelativePath = (uri) => {
    try {
      const path = uri?.fsPath || uri?.toString?.() || '';
      return path.split(/[\\/]/).pop() || path;
    } catch {
      return '';
    }
  };

  const handleClick = (marker) => {
    if (onGoToLocation) {
      onGoToLocation(marker.resource?.fsPath || marker.resource?.toString?.(), marker.startLineNumber, marker.startColumn);
    }
  };

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <div className="problems-header-left">
          <span className="problems-title">PROBLEMS</span>
          <div className="problems-filter">
            <button
              className={`problems-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({markers.length})
            </button>
            {errorCount > 0 && (
              <button
                className={`problems-filter-btn error ${filter === 'error' ? 'active' : ''}`}
                onClick={() => setFilter('error')}
              >
                ✕ {errorCount}
              </button>
            )}
            {warningCount > 0 && (
              <button
                className={`problems-filter-btn warning ${filter === 'warning' ? 'active' : ''}`}
                onClick={() => setFilter('warning')}
              >
                ▲ {warningCount}
              </button>
            )}
            {infoCount > 0 && (
              <button
                className={`problems-filter-btn info ${filter === 'info' ? 'active' : ''}`}
                onClick={() => setFilter('info')}
              >
                ⓘ {infoCount}
              </button>
            )}
          </div>
        </div>
        <button className="problems-close" onClick={onClose} title="Close">×</button>
      </div>
      <div className="problems-list">
        {filteredMarkers.length === 0 ? (
          <div className="problems-empty">
            {markers.length === 0 ? 'No problems detected' : 'No problems matching filter'}
          </div>
        ) : (
          filteredMarkers.map((marker, i) => {
            const severity = SEVERITY_ICONS[marker.severity] || SEVERITY_ICONS[4];
            return (
              <div
                key={`${marker.resource?.toString?.()}-${marker.startLineNumber}-${i}`}
                className={`problems-item ${severity.class}`}
                onClick={() => handleClick(marker)}
              >
                <span className={`problems-icon ${severity.class}`}>{severity.icon}</span>
                <span className="problems-message">{marker.message}</span>
                <span className="problems-location">
                  {getRelativePath(marker.resource)}:{marker.startLineNumber}:{marker.startColumn}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ProblemsPanel;
