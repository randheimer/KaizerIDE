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

function ReadFileRenderer({ message, index, toolResult, onToggleExpanded, onFileClick }) {
  const { args } = message;
  const fullPath = args.path || args.filePath || '';
  const filename = basename(fullPath) || 'file';
  const content = toolResult?.result || '';
  const language = getLanguageFromFilename(filename);
  const truncated = content.slice(0, 2000) + (content.length > 2000 ? '\n...' : '');

  return (
    <div className="tool-card read-file">
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
        <span className="tool-badge">Read</span>
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
            customStyle={{ ...codeBlockStyle, maxHeight: '300px' }}
            codeTagProps={{ style: codeTagStyle }}
          >
            {truncated}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

export default React.memo(ReadFileRenderer);
