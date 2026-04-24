import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SearchPanel from '../Sidebar/SearchPanel';
import { computeLineDiff } from '../../lib/diff/lineDiff';
import { highlightLine } from '../../lib/diff/prismHighlight';
import './EditorArea.css';

const getLanguageFromPath = (filePath) => {
  const fileName = filePath.split(/[\\/]/).pop().toLowerCase();
  const ext = fileName.split('.').pop().toLowerCase();
  
  // Check for multi-extension files first
  if (fileName.endsWith('.vcxproj.filters') || fileName.endsWith('.vcxproj.user')) {
    return 'xml';
  }
  
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
    'sln': 'sln',
    'props': 'xml',
    'targets': 'xml',
    'csproj': 'xml',
    'vbproj': 'xml',
    'filters': 'xml',
    'user': 'xml',
    'sh': 'shell',
    'bat': 'bat',
    'cmd': 'bat',
    'lua': 'lua',
    'rs': 'rust',
    'go': 'go',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'hpp': 'cpp',
    'hxx': 'cpp',
    'h': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'java': 'java',
    'php': 'php',
    'rb': 'ruby',
    'sql': 'sql',
    'txt': 'plaintext',
    'log': 'plaintext'
  };
  return langMap[ext] || 'plaintext';
};

function EditorArea({ tabs, activeTab, onTabSelect, onTabClose, onContentChange }) {
  const activeTabData = tabs.find(tab => tab.path === activeTab);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  // Monaco view-zones we own. Each entry is a zone id returned by
  // `editor.changeViewZones(accessor => accessor.addZone(...))`. We use
  // zones to render actual deleted content as red blocks between the
  // surviving lines — Cursor-style — since Monaco can't fake phantom
  // lines via decorations alone.
  const viewZonesRef = useRef([]);
  const pendingDiffs = useRef({});
  const [editorContextMenu, setEditorContextMenu] = useState(null);
  const [tabContextMenu, setTabContextMenu] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  
  // Check if current tab is a preview
  const isPreviewTab = activeTab && activeTab.includes(':preview');
  
  // Check if current tab is a plan.md preview (not the regular .md tab)
  const isPlanPreview = isPreviewTab && activeTab.toLowerCase().includes('plan-') && activeTab.includes('.md:preview');

  // Turn a unified line-diff (from computeLineDiff) into two lists the
  // editor needs:
  //   addedLines:    [lineNumberInNew, ...]  — whole-line green tint
  //   removedBlocks: [{ afterLineNumber, lines: [string,...] }, ...]
  //                  — consecutive deletions grouped so we can render
  //                  them as a single red view-zone beneath the last
  //                  surviving line in the new file.
  const computeEditorDiff = (oldContent, newContent) => {
    const isNewFile = !oldContent || oldContent.length === 0;
    if (isNewFile) {
      const newLines = (newContent || '').split('\n');
      return {
        addedLines: newLines.map((_, i) => i + 1),
        removedBlocks: [],
      };
    }

    const hunks = computeLineDiff(oldContent, newContent);
    const addedLines = [];
    const removedBlocks = [];
    // Cursor tracking where "deletion goes" in the new file. 0 means
    // "above the first line"; Monaco accepts afterLineNumber: 0 for
    // view-zones rendered above line 1.
    let lastNewLine = 0;
    let pendingRemove = null;

    const flushRemove = () => {
      if (pendingRemove) {
        removedBlocks.push(pendingRemove);
        pendingRemove = null;
      }
    };

    for (const h of hunks) {
      if (h.kind === 'equal') {
        flushRemove();
        lastNewLine = h.newNum;
      } else if (h.kind === 'add') {
        flushRemove();
        addedLines.push(h.newNum);
        lastNewLine = h.newNum;
      } else if (h.kind === 'remove') {
        if (!pendingRemove) {
          pendingRemove = { afterLineNumber: lastNewLine, lines: [] };
        }
        pendingRemove.lines.push(h.line ?? '');
      }
    }
    flushRemove();

    return { addedLines, removedBlocks };
  };

  // Build the DOM node Monaco will embed as a view-zone for a single
  // run of deleted lines. Each row = one deleted line, styled red, with
  // a `-` sign and Prism-highlighted content so it reads like source.
  const buildRemovedZoneNode = (lines, lang) => {
    const host = document.createElement('div');
    host.className = 'kaizer-diff-removed-zone';
    for (const rawLine of lines) {
      const row = document.createElement('div');
      row.className = 'kaizer-diff-removed-line';

      const sign = document.createElement('span');
      sign.className = 'kaizer-diff-removed-sign';
      sign.textContent = '-';

      const code = document.createElement('span');
      code.className = 'kaizer-diff-removed-code';
      code.innerHTML = highlightLine(rawLine, lang);

      row.appendChild(sign);
      row.appendChild(code);
      host.appendChild(row);
    }
    return host;
  };

  // Wipe any previously added view-zones. Safe to call even if the
  // editor/monaco refs are null (e.g. during unmount).
  const removeAllViewZones = () => {
    const editor = editorRef.current;
    if (!editor || viewZonesRef.current.length === 0) return;
    editor.changeViewZones((accessor) => {
      for (const id of viewZonesRef.current) {
        try { accessor.removeZone(id); } catch { /* zone gone — ignore */ }
      }
    });
    viewZonesRef.current = [];
  };

  // Apply diff decorations + view-zones. Green for added lines (whole
  // line tint + bright gutter bar + minimap + ruler), and an inline
  // red block showing the literal deleted content where it used to be.
  const applyDiffDecorations = (oldContent, newContent) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const { addedLines, removedBlocks } = computeEditorDiff(oldContent, newContent);

    // Reset previous state — both decorations and zones.
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    removeAllViewZones();

    const decorations = [];
    const model = editor.getModel();
    const lineCount = model?.getLineCount() || 1;

    // Green whole-line highlight for each inserted line.
    for (const lineNumber of addedLines) {
      if (lineNumber < 1 || lineNumber > lineCount) continue;
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'kaizer-diff-line-added',
          linesDecorationsClassName: 'kaizer-diff-gutter-added',
          minimap: { color: '#22c55e', position: monaco.editor.MinimapPosition.Inline },
          overviewRuler: {
            color: '#22c55e',
            position: monaco.editor.OverviewRulerLane.Left,
          },
        },
      });
    }

    // Mark the line that sits just above each removed block on the
    // overview ruler so users can jump straight to a deletion.
    for (const block of removedBlocks) {
      const rulerLine = Math.min(Math.max(block.afterLineNumber, 1), lineCount);
      decorations.push({
        range: new monaco.Range(rulerLine, 1, rulerLine, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: 'kaizer-diff-gutter-removed',
          overviewRuler: {
            color: '#ef4444',
            position: monaco.editor.OverviewRulerLane.Left,
          },
          minimap: { color: '#ef4444', position: monaco.editor.MinimapPosition.Inline },
        },
      });
    }

    decorationsRef.current = editor.deltaDecorations([], decorations);

    // Now render the removed lines themselves as view-zones. We do this
    // in one batched call so Monaco only relays out once.
    if (removedBlocks.length > 0) {
      const lang = activeTabData ? getLanguageFromPath(activeTabData.path) : '';
      editor.changeViewZones((accessor) => {
        for (const block of removedBlocks) {
          const domNode = buildRemovedZoneNode(block.lines, lang);
          const zoneId = accessor.addZone({
            afterLineNumber: Math.min(Math.max(block.afterLineNumber, 0), lineCount),
            heightInLines: block.lines.length,
            domNode,
            suppressMouseDown: true,
          });
          viewZonesRef.current.push(zoneId);
        }
      });
    }
  };

  // Clear decorations + view-zones. Also forgets the pending diff for
  // the active tab so switching away & back doesn't re-apply it.
  const clearDecorations = () => {
    if (editorRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
    removeAllViewZones();
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

  // Listen for editor settings changes (including theme)
  useEffect(() => {
    const handleSettingsChanged = (e) => {
      const settings = e.detail;
      console.log('[EditorArea] Settings changed:', settings);
      
      // Force editor to remount with new settings
      setEditorKey(prev => prev + 1);
    };

    window.addEventListener('kaizer:editor-settings-changed', handleSettingsChanged);
    
    return () => {
      window.removeEventListener('kaizer:editor-settings-changed', handleSettingsChanged);
    };
  }, []);

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

  // Re-apply diff decorations whenever the active tab's diff data
  // changes. App.jsx sets { showDiff, originalContent, newContent,
  // changeType } on the tab when the agent writes a file. Because React
  // updates the <Editor value={...}> prop on the same render, Monaco's
  // internal setValue() wipes any earlier decorations — so we must
  // re-apply here, AFTER the model has been updated. The LCS-based
  // applyDiffDecorations handles both new files and modifications.
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    if (!activeTabData?.showDiff) return;
    const oldContent = activeTabData.originalContent ?? '';
    const newContent = activeTabData.newContent ?? '';
    // Defer so Monaco's internal setValue (from the value prop change)
    // completes before we try to re-add decorations.
    queueMicrotask(() => applyDiffDecorations(oldContent, newContent));
  }, [
    activeTabData?.showDiff,
    activeTabData?.newContent,
    activeTabData?.originalContent,
    activeTabData?.path,
  ]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Editor just (re-)mounted: any zone/decoration IDs we were holding
    // from a previous instance are now meaningless. Start from scratch.
    decorationsRef.current = [];
    viewZonesRef.current = [];

    // If the AI wrote this file while Monaco was still mounting, the
    // file-written handler couldn't apply its decorations yet. Replay
    // the pending diff now that we actually have an editor instance.
    if (activeTab && pendingDiffs.current[activeTab]) {
      const { oldContent, newContent } = pendingDiffs.current[activeTab];
      // Defer one microtask so the editor's model is definitely populated
      // with the new content before we calculate decorations against it.
      queueMicrotask(() => applyDiffDecorations(oldContent, newContent));
    }

    // Register custom theme
    monaco.editor.defineTheme('kaizer-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // Comments - enhanced styling with better visual hierarchy
        { token: 'comment',          foreground: '7fdbca', fontStyle: 'italic' },
        { token: 'comment.doc',      foreground: '82aaff', fontStyle: 'italic' },
        { token: 'comment.block',    foreground: '7fdbca', fontStyle: 'italic' },
        { token: 'comment.line',     foreground: '637777', fontStyle: 'italic' },
        
        // Keywords
        { token: 'keyword',          foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'keyword.control',  foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'keyword.operator', foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'keyword.solution', foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'keyword.version',  foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'keyword.project',  foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'keyword.global',   foreground: 'c792ea', fontStyle: 'bold' },
        { token: 'keyword.section',  foreground: '82aaff', fontStyle: 'bold' },
        
        // Strings
        { token: 'string',           foreground: 'c3e88d' },
        { token: 'string.quote',     foreground: 'c3e88d' },
        { token: 'string.escape',    foreground: 'f78c6c' },
        { token: 'string.invalid',   foreground: 'ff5370' },
        
        // Numbers
        { token: 'number',           foreground: 'f78c6c' },
        { token: 'number.float',     foreground: 'f78c6c' },
        { token: 'number.hex',       foreground: 'f78c6c' },
        { token: 'number.octal',     foreground: 'f78c6c' },
        { token: 'number.binary',    foreground: 'f78c6c' },
        
        // Types and classes
        { token: 'type',             foreground: '4ec9b0', fontStyle: 'bold' },
        { token: 'type.identifier',  foreground: '4ec9b0', fontStyle: 'bold' },
        { token: 'type.config',      foreground: '89ddff' },
        { token: 'type.property',    foreground: 'f07178' },
        { token: 'type.section',     foreground: '82aaff' },
        { token: 'class',            foreground: '4ec9b0', fontStyle: 'bold' },
        { token: 'class.name',       foreground: '4ec9b0', fontStyle: 'bold' },
        { token: 'struct',           foreground: '4ec9b0', fontStyle: 'bold' },
        { token: 'enum',             foreground: '4ec9b0', fontStyle: 'bold' },
        
        // Functions and identifiers
        { token: 'function',         foreground: 'dcdcaa' },
        { token: 'function.call',    foreground: 'dcdcaa' },
        { token: 'method',           foreground: 'dcdcaa' },
        { token: 'method.call',      foreground: 'dcdcaa' },
        { token: 'identifier',       foreground: '9cdcfe' },
        { token: 'variable',         foreground: '9cdcfe' },
        { token: 'variable.predefined', foreground: '4fc1ff' },
        { token: 'parameter',        foreground: '9cdcfe' },
        
        // Constants and macros
        { token: 'constant',         foreground: '4fc1ff' },
        { token: 'constant.guid',    foreground: 'ffcb6b' },
        { token: 'macro',            foreground: 'c586c0' },
        { token: 'macro.name',       foreground: 'c586c0' },
        
        // Operators and delimiters
        { token: 'operator',         foreground: 'd4d4d4' },
        { token: 'delimiter',        foreground: 'd4d4d4' },
        { token: 'delimiter.bracket', foreground: 'ffd700' },
        { token: 'delimiter.parenthesis', foreground: 'ffd700' },
        
        // Tags and attributes
        { token: 'tag',              foreground: 'f07178' },
        { token: 'attribute.name',   foreground: 'ffcb6b' },
        { token: 'attribute.value',  foreground: 'c3e88d' },
        { token: 'regexp',           foreground: 'ff5370' },
        { token: 'metatag',          foreground: 'ff5370' },
        
        // Preprocessor directives
        { token: 'annotation',       foreground: 'c792ea' },
        { token: 'namespace',        foreground: '82aaff' },
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

    // Register Zero Syntax theme - minimal, distraction-free with Kaizer Dark design
    monaco.editor.defineTheme('zero-syntax', {
      base: 'vs-dark',
      inherit: false,
      rules: [
        // Everything gray - no syntax highlighting
        { token: '',                 foreground: '999999' },
        { token: 'comment',          foreground: '666666', fontStyle: 'italic' },
        { token: 'comment.doc',      foreground: '666666', fontStyle: 'italic' },
        { token: 'comment.block',    foreground: '666666', fontStyle: 'italic' },
        { token: 'comment.line',     foreground: '666666', fontStyle: 'italic' },
        { token: 'keyword',          foreground: '999999' },
        { token: 'keyword.control',  foreground: '999999' },
        { token: 'keyword.operator', foreground: '999999' },
        { token: 'string',           foreground: '999999' },
        { token: 'string.quote',     foreground: '999999' },
        { token: 'string.escape',    foreground: '999999' },
        { token: 'number',           foreground: '999999' },
        { token: 'number.float',     foreground: '999999' },
        { token: 'number.hex',       foreground: '999999' },
        { token: 'type',             foreground: '999999' },
        { token: 'type.identifier',  foreground: '999999' },
        { token: 'class',            foreground: '999999' },
        { token: 'class.name',       foreground: '999999' },
        { token: 'struct',           foreground: '999999' },
        { token: 'enum',             foreground: '999999' },
        { token: 'function',         foreground: '999999' },
        { token: 'function.call',    foreground: '999999' },
        { token: 'identifier',       foreground: '999999' },
        { token: 'variable',         foreground: '999999' },
        { token: 'variable.predefined', foreground: '999999' },
        { token: 'parameter',        foreground: '999999' },
        { token: 'constant',         foreground: '999999' },
        { token: 'constant.guid',    foreground: '999999' },
        { token: 'macro',            foreground: '999999' },
        { token: 'macro.name',       foreground: '999999' },
        { token: 'operator',         foreground: '999999' },
        { token: 'delimiter',        foreground: '999999' },
        { token: 'delimiter.bracket', foreground: '999999' },
        { token: 'delimiter.parenthesis', foreground: '999999' },
        { token: 'tag',              foreground: '999999' },
        { token: 'attribute.name',   foreground: '999999' },
        { token: 'attribute.value',  foreground: '999999' },
        { token: 'regexp',           foreground: '999999' },
        { token: 'metatag',          foreground: '999999' },
        { token: 'annotation',       foreground: '999999' },
        { token: 'namespace',        foreground: '999999' },
      ],
      colors: {
        'editor.background':               '#0d0d0d',
        'editor.foreground':               '#999999',
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
        'editorBracketHighlight.foreground1': '#999999',
        'editorBracketHighlight.foreground2': '#999999',
        'editorBracketHighlight.foreground3': '#999999',
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

    // Register custom language for .sln files
    monaco.languages.register({ id: 'sln' });
    
    monaco.languages.setMonarchTokensProvider('sln', {
      tokenizer: {
        root: [
          // Comments
          [/#.*$/, 'comment'],
          
          // Section headers
          [/^(Microsoft Visual Studio Solution File)/, 'keyword.solution'],
          [/^(VisualStudioVersion|MinimumVisualStudioVersion)/, 'keyword.version'],
          
          // Project declarations
          [/^Project\(/, { token: 'keyword.project', next: '@project' }],
          [/^EndProject/, 'keyword.project'],
          
          // Global sections
          [/^Global/, 'keyword.global'],
          [/^EndGlobal/, 'keyword.global'],
          [/^\s*GlobalSection\(/, { token: 'keyword.section', next: '@section' }],
          [/^\s*EndGlobalSection/, 'keyword.section'],
          
          // GUIDs
          [/\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}/, 'constant.guid'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', next: '@string' }],
          
          // Configuration names
          [/(Debug|Release|Any CPU|x86|x64|ARM|ARM64)/, 'type.config'],
          
          // Properties
          [/\b(preSolution|postSolution|preProject|postProject)\b/, 'type.property'],
          
          // Operators
          [/=/, 'operator'],
          [/\|/, 'delimiter'],
          [/,/, 'delimiter'],
          
          // Numbers
          [/\d+\.\d+/, 'number.float'],
          [/\d+/, 'number'],
        ],
        
        project: [
          [/\)/, { token: 'keyword.project', next: '@pop' }],
          [/\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}/, 'constant.guid'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/,/, 'delimiter'],
        ],
        
        section: [
          [/\)/, { token: 'keyword.section', next: '@pop' }],
          [/[^)]+/, 'type.section'],
        ],
        
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, { token: 'string.quote', next: '@pop' }],
        ],
      },
    });
    
    // Configure language features for .sln
    monaco.languages.setLanguageConfiguration('sln', {
      comments: {
        lineComment: '#',
      },
      brackets: [
        ['{', '}'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
      ],
    });

    // Enhanced C/C++ semantic highlighting
    monaco.languages.registerDocumentSemanticTokensProvider('cpp', {
      getLegend: () => ({
        tokenTypes: [
          'namespace', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'type',
          'parameter', 'variable', 'property', 'enumMember', 'function', 'method', 'macro',
          'keyword', 'comment', 'string', 'number', 'operator'
        ],
        tokenModifiers: ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'defaultLibrary']
      }),
      provideDocumentSemanticTokens: (model) => {
        const lines = model.getLinesContent();
        const data = [];
        
        lines.forEach((line, lineIndex) => {
          // Preprocessor directives
          if (line.match(/^\s*#\s*(include|define|ifdef|ifndef|endif|pragma)/)) {
            const match = line.match(/#\s*(\w+)/);
            if (match) {
              data.push(lineIndex, match.index, match[0].length, 13, 0); // macro token
            }
          }
          
          // Function calls - match word followed by (
          const funcMatches = line.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g);
          for (const match of funcMatches) {
            data.push(lineIndex, match.index, match[1].length, 11, 0); // function token
          }
          
          // Type names (capitalized words, common types)
          const typeMatches = line.matchAll(/\b([A-Z][a-zA-Z0-9_]*|PVOID|HANDLE|DWORD|ULONG|NTSTATUS|BOOLEAN|PCHAR|PWSTR|SIZE_T)\b/g);
          for (const match of typeMatches) {
            data.push(lineIndex, match.index, match[0].length, 6, 0); // type token
          }
          
          // Macros and constants (ALL_CAPS)
          const macroMatches = line.matchAll(/\b([A-Z_][A-Z0-9_]{2,})\b/g);
          for (const match of macroMatches) {
            data.push(lineIndex, match.index, match[0].length, 13, 0); // macro token
          }
        });
        
        return {
          data: new Uint32Array(data)
        };
      },
      releaseDocumentSemanticTokens: () => {}
    });

    // Also register for C language
    monaco.languages.registerDocumentSemanticTokensProvider('c', {
      getLegend: () => ({
        tokenTypes: [
          'namespace', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'type',
          'parameter', 'variable', 'property', 'enumMember', 'function', 'method', 'macro',
          'keyword', 'comment', 'string', 'number', 'operator'
        ],
        tokenModifiers: ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'defaultLibrary']
      }),
      provideDocumentSemanticTokens: (model) => {
        const lines = model.getLinesContent();
        const data = [];
        
        lines.forEach((line, lineIndex) => {
          // Preprocessor directives
          if (line.match(/^\s*#\s*(include|define|ifdef|ifndef|endif|pragma)/)) {
            const match = line.match(/#\s*(\w+)/);
            if (match) {
              data.push(lineIndex, match.index, match[0].length, 13, 0); // macro token
            }
          }
          
          // Method calls with -> or . (e.g., pDevice->GetImmediateContext)
          const methodMatches = line.matchAll(/(?:->|\.)\s*([a-zA-Z_]\w*)\s*\(/g);
          for (const match of methodMatches) {
            const methodStart = match.index + match[0].indexOf(match[1]);
            data.push(lineIndex, methodStart, match[1].length, 12, 0); // method token
          }
          
          // Regular function calls (not preceded by -> or .)
          const funcMatches = line.matchAll(/(?<!->|\.)\b([a-zA-Z_]\w*)\s*\(/g);
          for (const match of funcMatches) {
            data.push(lineIndex, match.index, match[1].length, 11, 0); // function token
          }
          
          // Type names (capitalized words, common Windows types)
          const typeMatches = line.matchAll(/\b([A-Z][a-zA-Z0-9_]*|HRESULT|PVOID|HANDLE|DWORD|ULONG|UINT|LONG|LPVOID|NTSTATUS|BOOLEAN|PCHAR|PWSTR|SIZE_T|ID3D11\w+|IDXGI\w+)\b/g);
          for (const match of typeMatches) {
            data.push(lineIndex, match.index, match[0].length, 6, 0); // type token
          }
          
          // Macros and constants (ALL_CAPS)
          const macroMatches = line.matchAll(/\b([A-Z_][A-Z0-9_]{2,})\b/g);
          for (const match of macroMatches) {
            data.push(lineIndex, match.index, match[0].length, 13, 0); // macro token
          }
        });
        
        return {
          data: new Uint32Array(data)
        };
      },
      releaseDocumentSemanticTokens: () => {}
    });

    // Handle Ctrl+Click on #include statements (simpler approach)
    editor.onMouseDown((e) => {
      // Only handle if Ctrl/Cmd is pressed AND it's a left click
      if ((!e.event.ctrlKey && !e.event.metaKey) || e.event.leftButton !== true) {
        return;
      }
      
      const position = e.target.position;
      if (!position) return;
      
      const model = editor.getModel();
      if (!model) return;
      
      const line = model.getLineContent(position.lineNumber);
      const includeMatch = line.match(/#include\s+["<]([^">]+)[">]/);
      
      if (!includeMatch) return;
      
      const includedFile = includeMatch[1];
      const startIdx = line.indexOf(includedFile);
      const endIdx = startIdx + includedFile.length;
      const cursorIdx = position.column - 1;
      
      // Check if cursor is on the filename
      if (cursorIdx >= startIdx && cursorIdx <= endIdx) {
        console.log('[Include Navigation] Ctrl+Click detected on:', includedFile);
        
        // Get current file path
        if (!activeTab || activeTab.includes(':preview')) {
          console.log('[Include Navigation] No valid active tab');
          return;
        }
        
        const currentFilePath = activeTab;
        const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('\\'));
        
        // Build target path
        let targetPath = `${currentDir}\\${includedFile.replace(/\//g, '\\')}`;
        
        // Normalize path (resolve .. and .)
        const parts = targetPath.split('\\').filter(p => p);
        const normalized = [];
        for (const part of parts) {
          if (part === '..') {
            normalized.pop();
          } else if (part !== '.') {
            normalized.push(part);
          }
        }
        targetPath = normalized.join('\\');
        
        console.log('[Include Navigation] Opening file:', targetPath);
        
        // Dispatch event to open the file
        window.dispatchEvent(new CustomEvent('kaizer:open-include-file', {
          detail: { path: targetPath }
        }));
        
        // Prevent default Monaco behavior
        e.event.preventDefault();
        e.event.stopPropagation();
      }
    });

    // Disable Monaco's built-in "Go to Definition" for C/C++ to prevent errors
    // Our custom click handler above will handle include navigation
    const disposables = [];
    disposables.push(
      monaco.languages.registerDefinitionProvider('cpp', {
        provideDefinition: () => null
      })
    );
    disposables.push(
      monaco.languages.registerDefinitionProvider('c', {
        provideDefinition: () => null
      })
    );

    // Load saved editor settings and apply theme
    const savedSettings = localStorage.getItem('kaizer-editor-settings');
    let settings = {
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
      minimap: true,
      lineNumbers: true,
      theme: 'kaizer-dark',
      fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
      cursorStyle: 'line',
      renderWhitespace: 'selection',
      bracketPairColorization: true,
      formatOnSave: false
    };
    
    if (savedSettings) {
      settings = { ...settings, ...JSON.parse(savedSettings) };
    }

    // Apply all editor settings
    editor.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers ? 'on' : 'off',
      fontFamily: settings.fontFamily,
      cursorStyle: settings.cursorStyle,
      renderWhitespace: settings.renderWhitespace,
      bracketPairColorization: { enabled: settings.bracketPairColorization },
      formatOnType: settings.formatOnSave,
      formatOnPaste: settings.formatOnSave
    });

    // Set theme from settings
    monaco.editor.setTheme(settings.theme);

    // Clear decorations when the USER edits. Monaco also fires this
    // event for programmatic setValue() calls (which happen every time
    // React updates the Editor's value prop — e.g. when the AI writes
    // a file and the tab's content changes). The `isFlush` flag
    // distinguishes those: true for setValue, false for user typing.
    // We only want to clear on actual user edits, so we keep diff
    // decorations alive through setValue.
    editor.onDidChangeModelContent((e) => {
      if (e && e.isFlush) return;
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
              key={`${activeTabData.path}-${editorKey}`}
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
        
        {/* Floating action buttons for plan.md preview files */}
        {isPlanPreview && activeTabData && (
          <div className="plan-action-buttons">
            <button 
              className="plan-action-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('kaizer:improve-plan', {
                  detail: { planPath: activeTab, planContent: activeTabData.content }
                }));
              }}
              title="Improve Plan"
            >
              ✨ Improve Plan
            </button>
            <button 
              className="plan-action-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('kaizer:ask-about-plan', {
                  detail: { planPath: activeTab, planContent: activeTabData.content }
                }));
              }}
              title="Ask Questions"
            >
              💬 Ask Questions
            </button>
          </div>
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



