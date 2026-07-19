import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Icon from '../../Common/Icon';
import { toast } from '../../../lib/stores/toastStore';

/**
 * StreamingCodeBlock - syntax-highlighted code block that eases in new
 * characters while content is still streaming. When streaming ends it
 * snaps to the final content.
 *
 * The cursor is a CSS-animated element (smooth opacity fade) instead of
 * a setInterval toggle — produces a gentler, non-jittery blink.
 */
function StreamingCodeBlock({ content, language, isStreaming }) {
  const [displayedContent, setDisplayedContent] = useState(content || '');
  const contentRef = useRef(content || '');
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    if (!isStreaming) {
      // Not streaming: show full content instantly.
      contentRef.current = content;
      setDisplayedContent(content);
      return undefined;
    }

    const targetContent = content;

    if (targetContent.length > contentRef.current.length) {
      const charsToAdd = targetContent.length - contentRef.current.length;
      // Ease in new chars in chunks so it looks alive without strobing.
      const chunkSize = Math.max(1, Math.ceil(charsToAdd / 10));

      const animate = () => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= 16) {
          if (contentRef.current.length < targetContent.length) {
            const nextLength = Math.min(
              contentRef.current.length + chunkSize,
              targetContent.length
            );
            contentRef.current = targetContent.substring(0, nextLength);
            setDisplayedContent(contentRef.current);
            lastUpdateRef.current = now;
          }
        }

        if (contentRef.current.length < targetContent.length) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      contentRef.current = targetContent;
      setDisplayedContent(targetContent);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [content, isStreaming]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="code-block-wrapper streaming-code-block">
      {language && (
        <div className="code-block-header">
          <span className="code-block-lang">{language}</span>
          <button
            className="code-copy-btn"
            onClick={handleCopy}
            title="Copy"
            aria-label="Copy code"
            type="button"
          >
            <Icon name="Copy" size={12} />
          </button>
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language || 'text'}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: language ? '0 0 8px 8px' : '8px',
            fontSize: '12.5px',
            background: 'var(--bg-2)',
            paddingRight: isStreaming ? '20px' : '12px',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.5',
            },
          }}
        >
          {displayedContent || ' '}
        </SyntaxHighlighter>
        {isStreaming && <span className="streaming-caret" aria-hidden="true" />}
      </div>
    </div>
  );
}

export default React.memo(StreamingCodeBlock);
