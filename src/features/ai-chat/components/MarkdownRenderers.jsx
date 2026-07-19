import React from 'react';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Icon from '../../../components/Common/Icon';
import FileLink from '../../../components/AI/chat/FileLink';
import StreamingCodeBlock from '../../../components/AI/chat/StreamingCodeBlock';
import { toast } from '../../../lib/stores/toastStore';
import remarkFileLinks from '../../../lib/markdown/remarkFileLinks';

export const CHAT_REMARK_PLUGINS = [remarkGfm, remarkFileLinks];

export const MARKDOWN_LINK_RENDERER = ({ node: _node, href, children, ...props }) => {
  if (href?.startsWith('file://')) {
    return <FileLink path={href.replace('file://', '')}>{children}</FileLink>;
  }
  return (
    <a className="assistant-link" href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};

function parseCode(className, children) {
  const raw = Array.isArray(children) ? children.join('') : String(children ?? '');
  const languageMatch = /language-(\w+)/.exec(className || '');
  return {
    isBlock: Boolean(languageMatch) || raw.includes('\n'),
    language: languageMatch?.[1] || '',
    raw: raw.replace(/\n$/, ''),
  };
}

export const MARKDOWN_CODE_RENDERER_STREAMING = ({
  node: _node,
  className,
  children,
  ...props
}) => {
  const { isBlock, language, raw } = parseCode(className, children);
  if (!isBlock)
    return (
      <code className="assistant-inline-code" {...props}>
        {children}
      </code>
    );
  return (
    <div className="code-block-wrapper">
      {language && (
        <div className="code-block-header">
          <span className="code-language">{language}</span>
        </div>
      )}
      <StreamingCodeBlock code={raw} language={language} />
    </div>
  );
};

function StaticCodeBlock({ language, code, ...props }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        {language ? <span className="code-block-lang">{language}</span> : <span />}
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
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 8px 8px',
          fontSize: '12.5px',
          background: 'var(--bg-2)',
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono)', lineHeight: '1.5' } }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const MARKDOWN_CODE_RENDERER_STATIC = ({ node: _node, className, children, ...props }) => {
  const { isBlock, language, raw } = parseCode(className, children);
  if (!isBlock)
    return (
      <code className="assistant-inline-code" {...props}>
        {children}
      </code>
    );
  return <StaticCodeBlock language={language} code={raw} {...props} />;
};
