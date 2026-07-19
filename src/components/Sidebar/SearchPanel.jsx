import React, { useState, useRef, useEffect } from 'react';
import './SearchPanel.css';

function SearchPanel({ editor, onClose, workspacePath, onOpenFileAtLine }) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [searchMode, setSearchMode] = useState('editor'); // 'editor' | 'workspace'
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [workspaceResults, setWorkspaceResults] = useState([]);
  const [workspaceSearching, setWorkspaceSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState(new Set());

  const searchInputRef = useRef(null);
  const decorationsRef = useRef([]);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();

    if (editor && searchMode === 'editor') {
      const selection = editor.getSelection();
      const selectedText = editor.getModel()?.getValueInRange(selection);
      if (selectedText) {
        setSearchText(selectedText);
      }
    }

    return () => {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    };
  }, [editor, searchMode]);

  // Editor search
  useEffect(() => {
    if (searchMode !== 'editor' || !editor || !searchText) {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      if (searchMode === 'editor') {
        setTotalMatches(0);
        setCurrentMatch(0);
      }
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      searchText,
      true,
      useRegex,
      matchCase,
      wholeWord ? '\\b' : null,
      true
    );

    setTotalMatches(matches.length);

    const newDecorations = matches.map((match, index) => ({
      range: match.range,
      options: {
        className: index === currentMatch ? 'search-match-current' : 'search-match',
        stickiness: 1
      }
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    if (matches.length > 0 && currentMatch < matches.length) {
      editor.revealRangeInCenter(matches[currentMatch].range);
    }
  }, [searchText, matchCase, wholeWord, useRegex, currentMatch, editor, searchMode]);

  // Workspace search (debounced)
  useEffect(() => {
    if (searchMode !== 'workspace' || !workspacePath || !searchText) {
      setWorkspaceResults([]);
      setTotalMatches(0);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setWorkspaceSearching(true);
      try {
        const result = await window.electron?.searchFiles?.(searchText, workspacePath, {
          matchCase,
          wholeWord,
          useRegex
        });
        if (result?.success) {
          setWorkspaceResults(result.results);
          setTotalMatches(result.results.length);
          // Expand all files with results
          const files = new Set(result.results.map(r => r.file));
          setExpandedFiles(files);
        } else {
          setWorkspaceResults([]);
          setTotalMatches(0);
        }
      } catch {
        setWorkspaceResults([]);
        setTotalMatches(0);
      }
      setWorkspaceSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchText, matchCase, wholeWord, useRegex, searchMode, workspacePath]);

  const handleNext = () => {
    if (totalMatches > 0) {
      setCurrentMatch((prev) => (prev + 1) % totalMatches);
    }
  };

  const handlePrevious = () => {
    if (totalMatches > 0) {
      setCurrentMatch((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

  const handleReplace = () => {
    if (!editor || !searchText || totalMatches === 0) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      searchText,
      true,
      useRegex,
      matchCase,
      wholeWord ? '\\b' : null,
      true
    );

    if (matches.length > 0 && currentMatch < matches.length) {
      const match = matches[currentMatch];
      editor.executeEdits('search-replace', [{
        range: match.range,
        text: replaceText
      }]);
      handleNext();
    }
  };

  const handleReplaceAll = () => {
    if (!editor || !searchText || totalMatches === 0) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      searchText,
      true,
      useRegex,
      matchCase,
      wholeWord ? '\\b' : null,
      true
    );

    const edits = matches.map(match => ({
      range: match.range,
      text: replaceText
    }));

    editor.executeEdits('search-replace-all', edits);
    setSearchText('');
  };

  const handleWorkspaceReplaceAll = async () => {
    if (!workspaceResults.length || !replaceText) return;

    const files = {};
    for (const result of workspaceResults) {
      if (!files[result.file]) files[result.file] = [];
      files[result.file].push(result);
    }

    for (const [filePath, matches] of Object.entries(files)) {
      try {
        const content = await window.electron?.readFile?.(filePath);
        if (!content?.success) continue;

        let newContent = content.content;
        if (useRegex) {
          const flags = matchCase ? 'g' : 'gi';
          const pattern = new RegExp(searchText, flags);
          newContent = newContent.replace(pattern, replaceText);
        } else {
          const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = wholeWord
            ? new RegExp(`\\b${escaped}\\b`, matchCase ? 'g' : 'gi')
            : new RegExp(escaped, matchCase ? 'g' : 'gi');
          newContent = newContent.replace(pattern, replaceText);
        }

        await window.electron?.writeFile?.(filePath, newContent);
      } catch {
        // Skip files that fail
      }
    }

    // Re-run search
    setSearchText(searchText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (searchMode === 'editor') {
        if (e.shiftKey) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
    }
  };

  const toggleFileExpanded = (file) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  const getRelativePath = (filePath) => {
    if (!workspacePath) return filePath;
    return filePath.replace(workspacePath, '').replace(/^[/\\]/, '');
  };

  const groupedResults = workspaceResults.reduce((acc, result) => {
    if (!acc[result.file]) acc[result.file] = [];
    acc[result.file].push(result);
    return acc;
  }, {});

  return (
    <div className="search-panel">
      {/* Mode toggle */}
      <div className="search-mode-toggle">
        <button
          className={`search-mode-btn ${searchMode === 'editor' ? 'active' : ''}`}
          onClick={() => setSearchMode('editor')}
        >
          Editor
        </button>
        <button
          className={`search-mode-btn ${searchMode === 'workspace' ? 'active' : ''}`}
          onClick={() => setSearchMode('workspace')}
        >
          Workspace
        </button>
      </div>

      <div className="search-row">
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder={searchMode === 'workspace' ? 'Search workspace...' : 'Find'}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="search-controls">
          <button
            className={`search-toggle ${matchCase ? 'active' : ''}`}
            onClick={() => setMatchCase(!matchCase)}
            title="Match Case (Alt+C)"
          >
            Aa
          </button>
          <button
            className={`search-toggle ${wholeWord ? 'active' : ''}`}
            onClick={() => setWholeWord(!wholeWord)}
            title="Match Whole Word (Alt+W)"
          >
            Ab|
          </button>
          <button
            className={`search-toggle ${useRegex ? 'active' : ''}`}
            onClick={() => setUseRegex(!useRegex)}
            title="Use Regular Expression (Alt+R)"
          >
            .*
          </button>
        </div>
        {searchMode === 'editor' && (
          <div className="search-navigation">
            <span className="search-count">
              {totalMatches > 0 ? `${currentMatch + 1}/${totalMatches}` : 'No results'}
            </span>
            <button
              className="search-nav-btn"
              onClick={handlePrevious}
              disabled={totalMatches === 0}
              title="Previous Match (Shift+Enter)"
            >
              ▲
            </button>
            <button
              className="search-nav-btn"
              onClick={handleNext}
              disabled={totalMatches === 0}
              title="Next Match (Enter)"
            >
              ▼
            </button>
          </div>
        )}
        {searchMode === 'workspace' && (
          <div className="search-navigation">
            <span className="search-count">
              {workspaceSearching ? '...' : totalMatches > 0 ? `${totalMatches} results` : 'No results'}
            </span>
          </div>
        )}
        <button
          className="search-expand-btn"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace"
        >
          {showReplace ? '◀' : '▶'}
        </button>
        <button
          className="search-close-btn"
          onClick={onClose}
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      {showReplace && (
        <div className="search-row">
          <input
            type="text"
            className="search-input"
            placeholder="Replace"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="search-replace-controls">
            {searchMode === 'editor' ? (
              <>
                <button
                  className="search-replace-btn"
                  onClick={handleReplace}
                  disabled={totalMatches === 0}
                  title="Replace"
                >
                  Replace
                </button>
                <button
                  className="search-replace-btn"
                  onClick={handleReplaceAll}
                  disabled={totalMatches === 0}
                  title="Replace All"
                >
                  Replace All
                </button>
              </>
            ) : (
              <button
                className="search-replace-btn"
                onClick={handleWorkspaceReplaceAll}
                disabled={totalMatches === 0}
                title="Replace All in Workspace"
              >
                Replace All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Workspace results */}
      {searchMode === 'workspace' && workspaceResults.length > 0 && (
        <div className="workspace-results">
          {Object.entries(groupedResults).map(([file, matches]) => (
            <div key={file} className="workspace-result-file">
              <div
                className="workspace-result-file-header"
                onClick={() => toggleFileExpanded(file)}
              >
                <span className="workspace-result-expand">
                  {expandedFiles.has(file) ? '▼' : '▶'}
                </span>
                <span className="workspace-result-filename">
                  {getRelativePath(file)}
                </span>
                <span className="workspace-result-count">{matches.length}</span>
              </div>
              {expandedFiles.has(file) && (
                <div className="workspace-result-matches">
                  {matches.map((match, i) => (
                    <div
                      key={i}
                      className="workspace-result-match"
                      onClick={() => onOpenFileAtLine?.(file, match.line)}
                    >
                      <span className="workspace-result-line">:{match.line}</span>
                      <span className="workspace-result-content">{match.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchPanel;
