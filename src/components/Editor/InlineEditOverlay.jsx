import React, { useState, useRef, useEffect } from 'react';
import { streamChat } from '../../lib/api/index.js';
import './InlineEditOverlay.css';

function InlineEditOverlay({ selectedText, language, fileName, position, onApply, onCancel, settings }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    abortRef.current = new AbortController();

    const messages = [
      {
        role: 'system',
        content: `You are a code editing assistant. The user will provide selected code and a description of changes to make. Return ONLY the modified code - no explanations, no markdown fences, no code blocks. Return the exact replacement text.`
      },
      {
        role: 'user',
        content: `Language: ${language}
File: ${fileName}

Selected code:
\`\`\`${language}
${selectedText}
\`\`\`

Change requested: ${prompt}

Return only the modified code as the replacement.`
      }
    ];

    try {
      let completion = '';
      await streamChat({
        messages,
        settings: {
          ...settings,
          selectedModel: settings?.selectedModel || settings?.models?.[0],
        },
        onToken: (token) => {
          completion += token;
        },
        onDone: () => {},
        signal: abortRef.current.signal,
      });

      // Clean up - remove markdown fences if AI included them
      completion = completion.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');

      setResult(completion);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to generate edit');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (result !== null) {
      onApply(result);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (loading && abortRef.current) {
        abortRef.current.abort();
      }
      onCancel();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (result !== null) {
        handleAccept();
      } else if (prompt.trim()) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="inline-edit-overlay" style={{ top: position.top, left: position.left }}>
      <div className="inline-edit-container">
        {/* Input row */}
        <form className="inline-edit-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="inline-edit-input"
            type="text"
            placeholder="Describe the change... (Ctrl+Enter to apply)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {!result && !loading && (
            <button className="inline-edit-submit" type="submit" disabled={!prompt.trim()}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l7 7-7 7M1 8h14" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
          )}
        </form>

        {/* Loading indicator */}
        {loading && (
          <div className="inline-edit-loading">
            <span className="inline-edit-spinner" />
            <span>Generating edit...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="inline-edit-error">{error}</div>
        )}

        {/* Diff preview */}
        {result !== null && !loading && (
          <>
            <div className="inline-edit-preview">
              <div className="inline-edit-preview-header">
                <span className="inline-edit-preview-label">Preview</span>
                <span className="inline-edit-preview-hint">Tab to cycle focus</span>
              </div>
              <pre className="inline-edit-preview-content">{result}</pre>
            </div>
            <div className="inline-edit-actions">
              <button className="inline-edit-accept" onClick={handleAccept} title="Accept (Ctrl+Enter)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 8l5 5L14 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Accept
              </button>
              <button className="inline-edit-reject" onClick={onCancel} title="Cancel (Esc)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Keyboard hints */}
        <div className="inline-edit-hints">
          <kbd>Ctrl+Enter</kbd> {result !== null ? 'accept' : 'generate'}
          <kbd>Esc</kbd> cancel
        </div>
      </div>
    </div>
  );
}

export default InlineEditOverlay;
