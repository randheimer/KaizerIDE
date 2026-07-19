import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Icon from '../../../Common/Icon';
import {
  basename,
  codeBlockStyle,
  codeTagStyle,
  getLanguageFromFilename,
} from './shared';

/**
 * Renderer for `write-file` / `write_file` tool calls.
 */
function WriteFileRenderer({ message, index, onToggleExpanded, onFileClick }) {
  const { args } = message;
  const fullPath = args.filePath || '';
  const filename = basename(fullPath) || 'file';
  const addedLines = args.content?.split('\n').length || 0;
  const language = getLanguageFromFilename(filename);

  return (
    <div className="tool-card write-file">
      <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
        <Icon name="FileText" size={13} className="tool-icon" />
        <span
          className="tool-filename clickable"
          onClick={(e) => {
            e.stopPropagation();
            onFileClick(fullPath);
          }}
        >
          {filename}
        </span>
        <span className="tool-badge green">+{addedLines}</span>
        <Icon
          name={message.expanded ? 'ChevronDown' : 'ChevronRight'}
          size={12}
          className="tool-chevron"
        />
      </div>
      {message.expanded && (
        <div className="tool-card-content">
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language}
            PreTag="div"
            showLineNumbers
            customStyle={codeBlockStyle}
            codeTagProps={{ style: codeTagStyle }}
          >
            {args.content || ''}
          </SyntaxHighlighter>
        </div>
      )}
      <div className="tool-card-footer">
        <span className="tool-status green">
          <Icon name="Check" size={12} /> Written
        </span>
        <span className="tool-path">{fullPath}</span>
      </div>
    </div>
  );
}

export default React.memo(WriteFileRenderer);
