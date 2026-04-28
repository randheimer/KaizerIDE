import React from 'react';
import './AnalysingIndicator.css';

/**
 * AnalysingIndicator - Shows when AI is gathering context through tools
 * Similar to Windsurf's fast context feature
 */
function AnalysingIndicator({ files = [], totalFiles = 0 }) {
  return (
    <div className="analysing-indicator">
      <div className="analysing-content">
        <div className="analysing-icon">
          <svg className="analysing-spinner" viewBox="0 0 24 24" fill="none">
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              strokeDasharray="32"
              strokeDashoffset="32"
            />
          </svg>
        </div>
        <div className="analysing-text">
          <div className="analysing-label">
            Analysing workspace
            <span className="analysing-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
          {files.length > 0 && (
            <div className="analysing-files">
              {files.slice(-3).map((file, idx) => (
                <span key={idx} className="analysing-file">
                  📄 {file.split(/[\\/]/).pop()}
                </span>
              ))}
              {totalFiles > 3 && (
                <span className="analysing-more">
                  +{totalFiles - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalysingIndicator;
