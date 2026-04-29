import React from 'react';
import './Breadcrumb.css';

/**
 * Breadcrumb — Shows the file path hierarchy below editor tabs.
 * Clicking a folder segment opens it in the file explorer.
 */
export default function Breadcrumb({ filePath, onNavigate }) {
  if (!filePath) return null;

  // Split path into segments, filtering out empty strings
  const segments = filePath.split(/[\\/]/).filter(Boolean);

  if (segments.length === 0) return null;

  const handleClick = (index) => {
    // Build the path up to this segment
    const partialPath = segments.slice(0, index + 1).join('\\');
    onNavigate?.(partialPath, index < segments.length - 1); // isFolder = not the last segment
  };

  return (
    <div className="breadcrumb-bar">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <svg className="breadcrumb-separator" width="8" height="8" viewBox="0 0 8 8">
                <path d="M2 1L5 4L2 7" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <button
              className={`breadcrumb-segment ${isLast ? 'breadcrumb-file' : 'breadcrumb-folder'}`}
              onClick={() => handleClick(i)}
              title={segments.slice(0, i + 1).join('\\')}
            >
              {isLast && (
                <svg className="breadcrumb-file-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M2 1h5l3 3v7H2V1z" />
                  <path d="M7 1v3h3" />
                </svg>
              )}
              {segment}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
