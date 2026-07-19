import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MessageActions from './MessageActions';

const ChatMessage = memo(
  ({ message, index, onFileClick, onCopy, onRetry, onEdit, onFork, onPin }) => {
  if (message.role === 'error') {
    return (
      <div className="message">
        <div className="tool-pill error">{message.content}</div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="message user">
        <div className="message-content">
          {message.content}
          {message.context && message.context.length > 0 && (
            <div className="message-context">
              {message.context.map((ctx) => (
                <span key={ctx.id} className="context-pill-small">
                  {ctx.type === 'file' ? '📄' : '📁'} {ctx.data.split(/[\\/]/).pop()}
                </span>
              ))}
            </div>
          )}
          <MessageActions
            role="user"
            pinned={!!message.pinned}
            onCopy={onCopy ? () => onCopy(message, index) : undefined}
            onEdit={onEdit ? () => onEdit(message, index) : undefined}
            onRetry={onRetry ? () => onRetry(message, index) : undefined}
            onPin={onPin ? () => onPin(message, index) : undefined}
          />
        </div>
      </div>
    );
  }

  if (message.role === 'assistant') {
    // Process content to make file paths clickable
    // Match: `filename.ext`, filename.ext (standalone), or "filename.ext"
    let processedContent = message.content;
    
    // Pattern 1: Backtick wrapped files
    processedContent = processedContent.replace(
      /`([^`]+\.(txt|js|jsx|ts|tsx|css|scss|html|json|md|py|java|cpp|c|h|go|rs|php|rb|swift|kt|xml|yaml|yml|lua|sh|bash|toml|lock))`/g,
      (match, filePath) => {
        return `[📄 ${filePath}](file://${filePath})`;
      }
    );
    
    // Pattern 2: Standalone filenames (word boundary before and after)
    processedContent = processedContent.replace(
      /\b([a-zA-Z0-9_\-\.]+\.(txt|js|jsx|ts|tsx|css|scss|html|json|md|py|java|cpp|c|h|go|rs|php|rb|swift|kt|xml|yaml|yml|lua|sh|bash|toml|lock))\b/g,
      (match, filePath) => {
        // Don't replace if already in a markdown link
        return `[📄 ${filePath}](file://${filePath})`;
      }
    );
    
    // Pattern 3: Quoted filenames
    processedContent = processedContent.replace(
      /"([^"]+\.(txt|js|jsx|ts|tsx|css|scss|html|json|md|py|java|cpp|c|h|go|rs|php|rb|swift|kt|xml|yaml|yml|lua|sh|bash|toml|lock))"/g,
      (match, filePath) => {
        return `[📄 ${filePath}](file://${filePath})`;
      }
    );
    
    return (
      <div className="message assistant">
        <div className="message-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                
                if (!inline && language) {
                  return (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={language}
                      PreTag="div"
                      customStyle={{
                        margin: '8px 0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: 'var(--bg-0)',
                        border: '1px solid var(--border)'
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily: 'var(--font-mono)',
                          lineHeight: '1.5'
                        }
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  );
                }
                
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ node, href, children, ...props }) => {
                if (href?.startsWith('file://')) {
                  const filePath = href.replace('file://', '');
                  return (
                    <span 
                      className="file-link"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFileClick(filePath);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {children}
                    </span>
                  );
                }
                return <a href={href} {...props}>{children}</a>;
              }
            }}
          >
            {processedContent}
          </ReactMarkdown>
          <MessageActions
            role="assistant"
            pinned={!!message.pinned}
            onCopy={onCopy ? () => onCopy(message, index) : undefined}
            onFork={onFork ? () => onFork(message, index) : undefined}
            onPin={onPin ? () => onPin(message, index) : undefined}
          />
        </div>
      </div>
    );
  }

  return null;
  }
);

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
