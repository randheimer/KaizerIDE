import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SearchPanel from '../Sidebar/SearchPanel';
import './EditorArea.css';

const getLanguageFromPath = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
    'xml': 'xml',
    'vcxproj': 'xml',
    'sln': 'plaintext',
    'props': 'xml',
    'targets': 'xml',
    'csproj': 'xml',
    'vbproj': 'xml',
    'sh': 'shell',
    'lua': 'lua',
    'rs': 'rust',
    'go': 'go',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'java': 'java',
    'php': 'php',
    'rb': 'ruby',
    'sql': 'sql'
  };
  return langMap[ext] || 'plaintext';
};

function EditorArea({ tabs, activeTab, onTabSelect, onTabClose, onContentChange }) {
  const activeTabData = tabs.find(tab => tab.path === activeTab);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const pendingDiffs = useRef({});
  const [editorContextMenu, setEditorContextMenu] = useState(null);
  const [tabContextMenu, setTabContextMenu] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  
  // Check if current tab is a preview
  const isPreviewTab = activeTab && activeTab.includes(':preview');

  // Diff lines algorithm
  const diffLines = (oldContent, newContent) => {
    const oldLines = (oldContent || '').split('\n');
    const newLines = (newContent || '').split('\n');
    
    const added = [];
    const oldSet = new Set(oldLines);
    
    newLines.forEach((line, i) => {
      if (!oldSet.has(line)) {
        added.push(i + 1); // Monaco lines are 1-indexed
      }
    });
    
    return { added };
  };

  // Apply diff decorations
  const applyDiffDecorations = (oldContent, newContent) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const { added } = diffLines(oldContent, newContent);

    // Clear previous decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    const decorations = [];

    // Green for added/changed lines
    added.forEach(lineNumber => {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'diff-added-line',
          linesDecorationsClassName: 'diff-added-gutter',
          overviewRuler: {
            color: '#22c55e',
            position: monaco.editor.OverviewRulerLane.Left
          }
        }
      });
    });

    decorationsRef.current = editor.deltaDecorations([], decorations);
  };

  // Clear decorations
  const clearDecorations = () => {
    if (editorRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
    if (activeTab) {
      delete pendingDiffs.current[activeTab];
    }
  };

  useEffect(() => {
    if (!editorContextMenu && !tabContextMenu) return;
    
    const handleClose = (e) => {
      if (e.target.closest('.editor-context-menu') || e.target.closest('.tab-context-menu')) return;
      setEditorContextMenu(null);
      setTabContextMenu(null);
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setEditorContextMenu(null);
        setTabContextMenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClose);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [editorContextMenu, tabContextMenu]);

  // Listen for file written events
  useEffect(() => {
    const handleFileWritten = (e) => {
      const { path, oldContent, newContent } = e.detail;
      
      // Store pending diff
      pendingDiffs.current[path] = { oldContent, newContent };
      
      // Apply if this is the active tab
      if (path === activeTab && editorRef.current) {
        applyDiffDecorations(oldContent, newContent);
      }
    };

    const handleClearDiff = () => {
      clearDecorations();
    };

    window.addEventListener('kaizer:file-written', handleFileWritten);
    window.addEventListener('kaizer:clear-diff', handleClearDiff);

    return () => {
      window.removeEventListener('kaizer:file-written', handleFileWritten);
      window.removeEventListener('kaizer:clear-diff', handleClearDiff);
    };
  }, [activeTab]);

  // Apply pending diff when switching tabs
  useEffect(() => {
    if (activeTab && pendingDiffs.current[activeTab] && editorRef.current) {
      const { oldContent, newContent } = pendingDiffs.current[activeTab];
      applyDiffDecorations(oldContent, newContent);
    } else {
      // Clear decorations when switching to a tab without pending diffs
      clearDecorations();
    }
  }, [activeTab]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeTabData?.showDiff) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      
      // Get the content to display (show new content in editor)
      const displayContent = activeTabData.newContent || activeTabData.content;
      
      // Update editor value to show new content
      if (editor.getValue() !== displayContent) {
        editor.setValue(displayContent);
      }
      
      // Calculate diff and apply decorations
      const oldLines = (activeTabData.originalContent || activeTabData.content || '').split('\n');
      const newLines = (activeTabData.newContent || '').split('\n');
      
      const decorations = [];
      
      if (activeTabData.changeType === 'added') {
        // All lines are new (green)
        for (let i = 0; i < newLines.length; i++) {
          decorations.push({
            range: new monaco.Range(i + 1, 1, i + 1, 1),
            options: {
              isWholeLine: true,
              className: 'diff-line-added'
            }
          });
        }
      } else if (activeTabData.changeType === 'modified') {
        // Simple line-by-line comparison
        const maxLines = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLines; i++) {
          if (i >= oldLines.length) {
            // Added line
            decorations.push({
              range: new monaco.Range(i + 1, 1, i + 1, 1),
              options: {
                isWholeLine: true,
                className: 'diff-line-added'
              }
            });
          } else if (i >= newLines.length) {
            // Deleted line (shouldn't happen in new content view)
            decorations.push({
              range: new monaco.Range(i + 1, 1, i + 1, 1),
              options: {
                isWholeLine: true,
                className: 'diff-line-deleted'
              }
            });
          } else if (oldLines[i] !== newLines[i]) {
            // Modified line
            decorations.push({
              range: new monaco.Range(i + 1, 1, i + 1, 1),
              options: {
                isWholeLine: true,
                className: 'diff-line-modified'
              }
            });
          }
        }
      }
      
      editor.deltaDecorations([], decorations);
    }
  }, [activeTabData]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom theme
    monaco.editor.defineTheme('kaizer-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment',          foreground: '4d5566', fontStyle: 'italic' },
        { token: 'keyword',          foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'string',           foreground: 'c3e88d' },
        { token: 'number',           foreground: 'f78c6c' },
        { token: 'type',             foreground: '82aaff' },
        { token: 'class',            foreground: 'ffcb6b' },
        { token: 'function',         foreground: '82aaff' },
        { token: 'variable',         foreground: 'eeffff' },
        { token: 'variable.predefined', foreground: 'f07178' },
        { token: 'constant',         foreground: 'f78c6c' },
        { token: 'operator',         foreground: '89ddff' },
        { token: 'delimiter',        foreground: '89ddff' },
        { token: 'tag',              foreground: 'f07178' },
        { token: 'attribute.name',   foreground: 'ffcb6b' },
        { token: 'attribute.value',  foreground: 'c3e88d' },
        { token: 'regexp',           foreground: 'ff5370' },
        { token: 'metatag',          foreground: 'ff5370' },
      ],
      colors: {
        'editor.background':               '#0d0d0d',
        'editor.foreground':               '#eeffff',
        'editor.lineHighlightBackground':  '#ffffff08',
        'editor.lineHighlightBorder':      '#ffffff00',
        'editor.selectionBackground':      '#a855f730',
        'editor.selectionHighlightBackground': '#a855f718',
        'editor.inactiveSelectionBackground': '#a855f715',
        'editor.findMatchBackground':      '#a855f740',
        'editor.findMatchHighlightBackground': '#a855f720',
        'editorLineNumber.foreground':     '#333344',
        'editorLineNumber.activeForeground': '#a855f7',
        'editorCursor.foreground':         '#a855f7',
        'editorCursor.background':         '#0d0d0d',
        'editorWhitespace.foreground':     '#ffffff15',
        'editorIndentGuide.background1':    '#ffffff10',
        'editorIndentGuide.activeBackground1': '#a855f740',
        'editorBracketMatch.background':   '#a855f730',
        'editorBracketMatch.border':       '#a855f7',
        'editorBracketHighlight.foreground1': '#a855f7',
        'editorBracketHighlight.foreground2': '#82aaff',
        'editorBracketHighlight.foreground3': '#c792ea',
        'editorWidget.background':         '#161616',
        'editorWidget.border':             '#252525',
        'editorSuggestWidget.background':  '#161616',
        'editorSuggestWidget.border':      '#252525',
        'editorSuggestWidget.selectedBackground': '#a855f720',
        'editorSuggestWidget.highlightForeground': '#a855f7',
        'editorHoverWidget.background':    '#161616',
        'editorHoverWidget.border':        '#252525',
        'editorGutter.background':         '#0d0d0d',
        'scrollbar.shadow':                '#00000000',
        'scrollbarSlider.background':      '#ffffff10',
        'scrollbarSlider.hoverBackground': '#ffffff20',
        'scrollbarSlider.activeBackground':'#a855f740',
        'minimap.background':              '#0d0d0d',
        'minimapSlider.background':        '#a855f720',
        'minimapSlider.hoverBackground':   '#a855f730',
        'editorOverviewRuler.border':      '#00000000',
        'editorOverviewRuler.selectionHighlightForeground': '#a855f7',
      }
    });

    // Set theme
    monaco.editor.setTheme('kaizer-dark');

    // Clear decorations when user edits
    editor.onDidChangeModelContent(() => {
      if (decorationsRef.current.length > 0) {
        clearDecorations();
      }
    });

    // Keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      window.dispatchEvent(new CustomEvent('kaizer:save-active'));
    });

    // Ctrl+F for search
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setShowSearch(true);
    });

    // Auto-focus
    editor.focus();

    // Fix font rendering on Windows
    editor.updateOptions({ 
      fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace" 
    });
  };

  const handleTabClick = (e, path) => {
    e.stopPropagation();
    onTabSelect(path);
  };


  const handleTabContextMenu = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    
    let x = e.clientX;
    let y = e.clientY;
    
    const menuWidth = 200;
    const menuHeight = 250;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }
    
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8;
    }
    
    x = Math.max(8, x);
    y = Math.max(8, y);
    
    setTabContextMenu({ x, y, path });
  };

  const handleCloseTab = (path) => {
    setTabContextMenu(null);
    onTabClose(path);
  };

  const handleCloseOtherTabs = (path) => {
    setTabContextMenu(null);
    tabs.forEach(tab => {
      if (tab.path !== path) {
        onTabClose(tab.path);
      }
    });
  };

  const handleCloseAllTabs = () => {
    setTabContextMenu(null);
    // Close all tabs at once by clearing the tabs array
    tabs.forEach(tab => onTabClose(tab.path));
  };

  const handleCloseSavedTabs = () => {
    setTabContextMenu(null);
    // Close only saved (non-dirty) tabs
    tabs.filter(tab => !tab.dirty).forEach(tab => onTabClose(tab.path));
  };

  const handleCloseTabsToRight = (path) => {
    setTabContextMenu(null);
    const tabIndex = tabs.findIndex(t => t.path === path);
    if (tabIndex !== -1) {
      tabs.slice(tabIndex + 1).forEach(tab => onTabClose(tab.path));
    }
  };

  const handleOpenPreview = (path) => {
    setTabContextMenu(null);
    const tab = tabs.find(t => t.path === path);
    if (tab && tab.path.endsWith('.md')) {
      // Dispatch event to App.jsx to create a preview tab
      window.dispatchEvent(new CustomEvent('kaizer:open-preview', {
        detail: {
          originalPath: path,
          content: tab.content
        }
      }));
    }
  };
  const handleCloseClick = (e, path) => {
    e.stopPropagation();
    onTabClose(path);
  };

  const handleEditorContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Prevent menu from going off screen
    const menuWidth = 220;
    const menuHeight = 380;
    
    // Check right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }
    
    // Check bottom edge - this is the important fix
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8;
    }
    
    // Ensure minimum distance from edges
    x = Math.max(8, x);
    y = Math.max(8, y);
    
    setEditorContextMenu({ x, y });
  };

  const executeEditorAction = (actionId) => {
    setEditorContextMenu(null);
    if (editorRef.current) {
      const action = editorRef.current.getAction(actionId);
      if (action) {
        action.run();
      }
    }
  };

  const handleCopyPath = () => {
    setEditorContextMenu(null);
    if (activeTabData?.path) {
      navigator.clipboard.writeText(activeTabData.path);
      showToast('Path copied');
    }
  };

  const handleOpenFilePicker = () => {
    setEditorContextMenu(null);
    if (activeTabData?.path) {
      const parentDir = activeTabData.path.substring(0, activeTabData.path.lastIndexOf('\\'));
      window.dispatchEvent(new CustomEvent('kaizer:open-filepicker', { 
        detail: { startPath: parentDir } 
      }));
    }
  };

  const handleCut = () => {
    setEditorContextMenu(null);
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const selectedText = editorRef.current.getModel().getValueInRange(selection);
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        editorRef.current.executeEdits('', [{
          range: selection,
          text: ''
        }]);
        showToast('Cut to clipboard');
      }
    }
  };

  const handleCopy = () => {
    setEditorContextMenu(null);
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const selectedText = editorRef.current.getModel().getValueInRange(selection);
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        showToast('Copied to clipboard');
      }
    }
  };

  const handlePaste = async () => {
    setEditorContextMenu(null);
    if (editorRef.current) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          const selection = editorRef.current.getSelection();
          editorRef.current.executeEdits('', [{
            range: selection,
            text: text
          }]);
          showToast('Pasted from clipboard');
        }
      } catch (err) {
        console.error('Paste failed:', err);
        showToast('Paste failed - check permissions');
      }
    }
  };

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(168, 85, 247, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 10000;
      animation: toastIn 200ms ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastOut 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  if (tabs.length === 0) {
    return (
      <div className="editor-area">
        <div className="editor-placeholder">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="8" y="12" width="48" height="40" rx="2" />
            <path d="M8 20h48M20 28l8 8-8 8M32 44h16" />
          </svg>
          <p>Open a file to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        {tabs.map(tab => {
          const isPreview = tab.isPreview;
          return (
            <div
              key={tab.path}
              className={`editor-tab ${activeTab === tab.path ? 'active' : ''} ${isPreview ? 'preview-tab' : ''}`}
              onClick={(e) => handleTabClick(e, tab.path)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.path)}
            >
              {isPreview && <span className="tab-icon">👁</span>}
              <span className="tab-name">{tab.name}</span>
              {tab.dirty && <span className="dirty-indicator"></span>}
              <button className="tab-close" onClick={(e) => handleCloseClick(e, tab.path)}>
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div className="editor-container" onContextMenu={handleEditorContextMenu}>
        {activeTabData && (
          <>
            {activeTabData.isPreview ? (
              <div className="markdown-preview-wrapper">
                <div className="markdown-preview-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        
                        if (!inline && language) {
                          // Multi-line code block with language - use syntax highlighting
                          return (
                            <div className="preview-code-block">
                              <div className="code-block-header">
                                <span className="code-language">{language}</span>
                                <button 
                                  className="code-copy-btn"
                                  onClick={(e) => {
                                    const code = String(children).replace(/\n$/, '');
                                    if (e.shiftKey) {
                                      // Shift+Click: Copy with markdown formatting
                                      navigator.clipboard.writeText(`\`\`\`${language}\n${code}\n\`\`\``);
                                    } else {
                                      // Normal click: Copy raw code
                                      navigator.clipboard.writeText(code);
                                    }
                                  }}
                                  title="Click to copy code, Shift+Click to copy with markdown"
                                >
                                  Copy
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={language}
                                PreTag="div"
                                showLineNumbers={true}
                                wrapLines={true}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: '0 0 6px 6px',
                                  fontSize: '12.5px',
                                  background: 'var(--bg-1)',
                                  padding: '14px'
                                }}
                                codeTagProps={{
                                  style: {
                                    fontFamily: 'var(--font-mono)',
                                    lineHeight: '1.6'
                                  }
                                }}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          );
                        } else if (!inline) {
                          // Plain code block without language
                          return (
                            <pre className="preview-code-plain">
                              <code>{children}</code>
                            </pre>
                          );
                        }
                        
                        // Inline code
                        return (
                          <code className="preview-inline-code">
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {activeTabData.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <>
                <Editor
              key={activeTabData.path}
              height="100%"
              language={getLanguageFromPath(activeTabData.path)}
              value={activeTabData.showDiff ? activeTabData.newContent : activeTabData.content}
              onChange={onContentChange}
              onMount={handleEditorDidMount}
              theme="kaizer-dark"
              options={{
                fontSize: 13.5,
                fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                fontLigatures: true,
                fontWeight: '400',
                lineHeight: 22,
                letterSpacing: 0.3,

                // Cursor
                cursorStyle: 'line',
                cursorWidth: 2,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',

                // Scrolling
                smoothScrolling: true,
                scrollBeyondLastLine: false,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                  useShadows: false,
                },

                // Layout
                padding: { top: 16, bottom: 16 },
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                lineDecorationsWidth: 8,
                folding: true,
                foldingHighlight: true,
                showFoldingControls: 'mouseover',
                glyphMargin: false,

                // Minimap
                minimap: {
                  enabled: true,
                  scale: 1,
                  showSlider: 'mouseover',
                  renderCharacters: false,
                  maxColumn: 80,
                  side: 'right',
                },

                // Editor behavior
                wordWrap: 'on',
                wordWrapColumn: 120,
                tabSize: 2,
                insertSpaces: true,
                detectIndentation: true,
                trimAutoWhitespace: true,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoIndent: 'full',
                formatOnPaste: true,
                formatOnType: false,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                quickSuggestions: { other: true, comments: false, strings: true },
                parameterHints: { enabled: true },
                hover: { enabled: true, delay: 300 },

                // Selection
                selectionHighlight: true,
                occurrencesHighlight: 'singleFile',
                renderLineHighlight: 'line',
                renderLineHighlightOnlyWhenFocus: false,

                // Guides
                guides: {
                  bracketPairs: true,
                  bracketPairsHorizontal: true,
                  highlightActiveBracketPair: true,
                  indentation: true,
                  highlightActiveIndentation: true,
                },

                // Bracket matching
                matchBrackets: 'always',
                bracketPairColorization: { enabled: true },

                // Whitespace
                renderWhitespace: 'selection',
                renderControlCharacters: false,

                // Performance
                fastScrollSensitivity: 5,
                mouseWheelScrollSensitivity: 1.2,

                // Disable built-in context menu
                contextmenu: false,

                // Diff mode
                readOnly: activeTabData.showDiff,
                automaticLayout: true,
              }}
            />
              </>
            )}
          </>
        )}
      </div>

      {tabContextMenu && ReactDOM.createPortal(
        <div 
          className="tab-context-menu"
          style={{
            position: 'fixed',
            left: `${tabContextMenu.x}px`,
            top: `${tabContextMenu.y}px`,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-item" onClick={() => handleCloseTab(tabContextMenu.path)}>
            <span className="context-item-label">Close</span>
            <span className="context-item-shortcut">Ctrl+W</span>
          </div>
          <div className="context-item" onClick={() => handleCloseOtherTabs(tabContextMenu.path)}>
            <span className="context-item-label">Close Others</span>
          </div>
          <div className="context-item" onClick={() => handleCloseTabsToRight(tabContextMenu.path)}>
            <span className="context-item-label">Close to the Right</span>
          </div>
          <div className="context-item" onClick={handleCloseSavedTabs}>
            <span className="context-item-label">Close Saved</span>
          </div>
          <div className="context-item" onClick={handleCloseAllTabs}>
            <span className="context-item-label">Close All</span>
            <span className="context-item-shortcut">Ctrl+K W</span>
          </div>
          
          {tabs.find(t => t.path === tabContextMenu.path)?.path.endsWith('.md') && (
            <>
              <div className="context-separator" />
              <div className="context-item" onClick={() => handleOpenPreview(tabContextMenu.path)}>
                <span className="context-item-label">Open Preview</span>
                <span className="context-item-shortcut">Ctrl+Shift+V</span>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {editorContextMenu && ReactDOM.createPortal(
        <div 
          className="editor-context-menu"
          style={{
            position: 'fixed',
            left: `${editorContextMenu.x}px`,
            top: `${editorContextMenu.y}px`,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-section-label">NAVIGATE</div>
          <div className="context-item" onClick={() => executeEditorAction('editor.action.revealDefinition')}>
            <span className="context-item-label">Go to Definition</span>
            <span className="context-item-shortcut">F12</span>
          </div>
          <div className="context-item" onClick={() => executeEditorAction('editor.action.gotoSymbol')}>
            <span className="context-item-label">Go to Symbol...</span>
            <span className="context-item-shortcut">Ctrl+Shift+O</span>
          </div>
          <div className="context-item" onClick={() => executeEditorAction('editor.action.referenceSearch.trigger')}>
            <span className="context-item-label">Find All References</span>
            <span className="context-item-shortcut">Shift+F12</span>
          </div>

          <div className="context-separator" />

          <div className="context-section-label">EDIT</div>
          <div className="context-item" onClick={handleCut}>
            <span className="context-item-label">Cut</span>
            <span className="context-item-shortcut">Ctrl+X</span>
          </div>
          <div className="context-item" onClick={handleCopy}>
            <span className="context-item-label">Copy</span>
            <span className="context-item-shortcut">Ctrl+C</span>
          </div>
          <div className="context-item" onClick={handlePaste}>
            <span className="context-item-label">Paste</span>
            <span className="context-item-shortcut">Ctrl+V</span>
          </div>

          <div className="context-separator" />

          <div className="context-section-label">CODE</div>
          <div className="context-item" onClick={() => executeEditorAction('editor.action.formatDocument')}>
            <span className="context-item-label">Format Document</span>
            <span className="context-item-shortcut">Shift+Alt+F</span>
          </div>
          <div className="context-item" onClick={() => executeEditorAction('editor.action.changeAll')}>
            <span className="context-item-label">Change All Occurrences</span>
            <span className="context-item-shortcut">Ctrl+F2</span>
          </div>
          <div className="context-item" onClick={() => executeEditorAction('editor.action.rename')}>
            <span className="context-item-label">Rename Symbol</span>
            <span className="context-item-shortcut">F2</span>
          </div>

          <div className="context-separator" />

          <div className="context-section-label">FILE</div>
          <div className="context-item" onClick={handleCopyPath}>
            <span className="context-item-label">Copy File Path</span>
          </div>
          <div className="context-item" onClick={handleOpenFilePicker}>
            <span className="context-item-label">Open in File Picker</span>
          </div>
        </div>,
        document.body
      )}

      {showSearch && editorRef.current && (
        <SearchPanel 
          editor={editorRef.current} 
          onClose={() => setShowSearch(false)} 
        />
      )}
    </div>
  );
}

export default EditorArea;



