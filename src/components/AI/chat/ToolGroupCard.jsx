import React, { useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Icon from '../../Common/Icon';
import { toast } from '../../../lib/stores/toastStore';
import { computeLineDiff, summarizeDiff } from '../../../lib/diff/lineDiff';
import {
  basename,
  codeBlockStyle,
  codeTagStyle,
  getLanguageFromFilename,
} from './toolRenderers/shared';

const RESULT_PREVIEW_LINES = 30;

/**
 * Map a tool name to its toolbar icon. Stored as Lucide icon names so
 * <Icon> resolves at render time.
 */
function toolIcon(name) {
  switch (name) {
    case 'read_file':
    case 'read-file':
      return 'FileText';
    case 'write_file':
    case 'write-file':
      return 'FilePlus2';
    case 'run_command':
    case 'run-command':
      return 'Terminal';
    case 'search_files':
    case 'search-files':
    case 'search_index':
    case 'grep_index':
      return 'Search';
    case 'list_directory':
    case 'list-directory':
      return 'FolderOpen';
    default:
      return 'Wrench';
  }
}

/**
 * Emit an IDE-wide open-file event. Any component (editor tabs) can listen.
 */
function openFileInEditor(absolutePath) {
  if (!absolutePath) return;
  window.dispatchEvent(
    new CustomEvent('kaizer:open-file', { detail: { path: absolutePath } })
  );
}

/**
 * Card that summarizes a group of tool calls executed in a single agent turn.
 * Shows aggregate stats in the header and expandable per-tool rows with
 * syntax-highlighted previews, copy-to-clipboard, and click-to-open filenames.
 */
function ToolGroupCard({ group, onToggleExpanded, onToggleRowExpanded }) {
  const isRunning = group.status === 'running';
  const isDone = group.status === 'done';
  const toolCount = group.tools.length;

  const stats = React.useMemo(() => {
    let filesRead = 0;
    let filesWritten = 0;
    let commandsRun = 0;
    let searches = 0;
    let totalLines = 0;

    group.tools.forEach((tool) => {
      switch (tool.name) {
        case 'read_file':
        case 'read-file':
          filesRead++;
          if (tool.result && typeof tool.result === 'string') {
            totalLines += tool.result.split('\n').length;
          }
          break;
        case 'write_file':
        case 'write-file':
          if (
            tool.result &&
            typeof tool.result === 'string' &&
            tool.result.includes('written successfully')
          ) {
            filesWritten++;
          }
          break;
        case 'run_command':
        case 'run-command':
          commandsRun++;
          break;
        case 'search_files':
        case 'search-files':
        case 'search_index':
        case 'grep_index':
          searches++;
          break;
        default:
          break;
      }
    });

    return { filesRead, filesWritten, commandsRun, searches, totalLines };
  }, [group.tools]);

  const statsText = React.useMemo(() => {
    const parts = [];
    if (stats.filesRead > 0) parts.push(`${stats.filesRead} read`);
    if (stats.filesWritten > 0) parts.push(`${stats.filesWritten} written`);
    if (stats.commandsRun > 0) parts.push(`${stats.commandsRun} cmd`);
    if (stats.searches > 0) parts.push(`${stats.searches} search`);
    if (stats.totalLines > 0) parts.push(`~${stats.totalLines} lines`);
    return parts.join(' \u2022 ');
  }, [stats]);

  return (
    <div className={`tool-group-card ${isRunning ? 'running' : ''} ${isDone ? 'done' : ''}`}>
      <div
        className="tool-group-header"
        onClick={() => onToggleExpanded(group.turnId)}
        role="button"
        tabIndex={0}
        aria-expanded={!!group.expanded}
      >
        <div className="tool-group-left">
          <span className={`tool-group-icon ${isRunning ? 'spinning' : ''}`}>
            <Icon
              name={isRunning ? 'Loader2' : 'CheckCircle2'}
              size={14}
              strokeWidth={2}
            />
          </span>
          <div className="tool-group-text-wrapper">
            <span className="tool-group-text">
              {isRunning ? 'Working...' : `Used ${toolCount} tool${toolCount !== 1 ? 's' : ''}`}
            </span>
            {isDone && statsText && (
              <span className="tool-group-stats">{statsText}</span>
            )}
          </div>
        </div>
        <Icon
          name={group.expanded ? 'ChevronDown' : 'ChevronRight'}
          size={14}
          className="tool-group-chevron"
        />
      </div>
      {group.expanded && (
        <div className="tool-group-rows">
          {group.tools.map((tool, idx) => (
            <ToolRow
              key={idx}
              tool={tool}
              index={idx}
              onToggleExpanded={() => onToggleRowExpanded(group.turnId, idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A single tool call row inside a group. Extracted so React.memo works at
 * the row level and so expanded rows can own their own local "show all" state.
 */
const ToolRow = React.memo(function ToolRow({ tool, index, onToggleExpanded }) {
  const [showAllLines, setShowAllLines] = useState(false);

  let parsedArgs = {};
  try {
    parsedArgs = typeof tool.args === 'string' ? JSON.parse(tool.args) : tool.args || {};
  } catch {
    parsedArgs = {};
  }

  const filePath =
    parsedArgs.path ||
    parsedArgs.filePath ||
    parsedArgs.command ||
    parsedArgs.query ||
    '';
  const fileName = basename(filePath) || filePath;
  const absolutePath = parsedArgs.path || parsedArgs.filePath || '';

  const isWriteTool = tool.name === 'write_file' || tool.name === 'write-file';
  const hasOriginalContent =
    isWriteTool && typeof tool.originalContent === 'string' && typeof parsedArgs.content === 'string';
  const resultIsString = typeof tool.result === 'string';
  // For write_file, the tool result is just a success string; show the
  // NEW file content instead so the user can inspect what was written.
  // For other tools, stringify the result.
  const fullResult = isWriteTool && typeof parsedArgs.content === 'string'
    ? parsedArgs.content
    : resultIsString
      ? tool.result
      : tool.result != null
        ? JSON.stringify(tool.result, null, 2)
        : '';
  const previewLabel = isWriteTool && typeof parsedArgs.content === 'string'
    ? 'new content'
    : null;
  const resultLanguage = isWriteTool
    ? getLanguageFromFilename(fileName)
    : resultIsString
      ? getLanguageFromFilename(fileName)
      : 'json';
  const resultLines = fullResult ? fullResult.split('\n') : [];
  const truncated = !showAllLines && resultLines.length > RESULT_PREVIEW_LINES;
  const displayedResult = truncated
    ? resultLines.slice(0, RESULT_PREVIEW_LINES).join('\n')
    : fullResult;

  // Line-count badge for read_file
  const lineCount =
    (tool.name === 'read_file' || tool.name === 'read-file') && resultIsString
      ? tool.result.split('\n').length
      : 0;

  const { badge, badgeClass } = (() => {
    if (tool.name === 'write_file' || tool.name === 'write-file')
      return { badge: '+', badgeClass: 'badge-add' };
    if (tool.name === 'read_file' || tool.name === 'read-file')
      return { badge: lineCount > 0 ? `${lineCount}L` : '', badgeClass: 'badge-read' };
    if (tool.name === 'run_command' || tool.name === 'run-command')
      return { badge: 'cmd', badgeClass: 'badge-cmd' };
    if (
      tool.name === 'search_files' ||
      tool.name === 'search-files' ||
      tool.name === 'search_index' ||
      tool.name === 'grep_index'
    )
      return { badge: 'search', badgeClass: 'badge-search' };
    return { badge: '', badgeClass: '' };
  })();

  const handleCopyResult = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullResult);
      toast.success('Tool output copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleOpenFile = (e) => {
    e.stopPropagation();
    if (absolutePath) openFileInEditor(absolutePath);
  };

  const isFileTool =
    tool.name === 'read_file' ||
    tool.name === 'read-file' ||
    tool.name === 'write_file' ||
    tool.name === 'write-file';

  return (
    <div className="tool-group-row">
      <div className="tool-row-main" onClick={onToggleExpanded}>
        <span className={`tool-row-icon ${tool.status === 'running' ? 'spinning' : ''}`}>
          <Icon
            name={
              tool.status === 'running'
                ? 'Loader2'
                : tool.status === 'error'
                  ? 'XCircle'
                  : 'Check'
            }
            size={12}
            strokeWidth={2}
          />
        </span>
        <span className="tool-row-tool-icon">
          <Icon name={toolIcon(tool.name)} size={12} />
        </span>
        <span className="tool-row-name">{tool.name}</span>
        {isFileTool && absolutePath ? (
          <button
            className="tool-row-file clickable"
            onClick={handleOpenFile}
            title={`Open ${absolutePath}`}
            type="button"
          >
            {fileName}
          </button>
        ) : (
          <span className="tool-row-file">{fileName}</span>
        )}
        {badge && <span className={`tool-row-badge ${badgeClass}`}>{badge}</span>}
      </div>
      {tool.expanded && hasOriginalContent && (
        <WriteFileDiff
          originalContent={tool.originalContent}
          newContent={parsedArgs.content}
        />
      )}
      {tool.expanded && !hasOriginalContent && fullResult && (
        <div className="tool-row-result">
          <div className="tool-row-result-header">
            <span className="tool-row-result-meta">
              {previewLabel ? `${previewLabel} \u00b7 ` : ''}
              {resultLines.length} line{resultLines.length !== 1 ? 's' : ''}
            </span>
            <div className="tool-row-result-actions">
              {truncated && (
                <button
                  className="tool-row-result-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllLines(true);
                  }}
                  type="button"
                >
                  Show all
                </button>
              )}
              <button
                className="tool-row-result-btn"
                onClick={handleCopyResult}
                title="Copy output"
                type="button"
              >
                <Icon name="Copy" size={11} />
              </button>
            </div>
          </div>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={resultLanguage}
            PreTag="div"
            customStyle={{
              ...codeBlockStyle,
              maxHeight: showAllLines ? '500px' : '280px',
              borderRadius: '0 0 6px 6px',
            }}
            codeTagProps={{ style: codeTagStyle }}
          >
            {displayedResult}
          </SyntaxHighlighter>
        </div>
      )}
      {tool.expanded && !fullResult && (
        <div className="tool-row-result">
          <div className="tool-row-result-empty">No result available</div>
        </div>
      )}
    </div>
  );
});

/**
 * Compact unified-diff preview shown under an expanded write_file row.
 * Shares the visual language with FilesChangedCard's inline diff so the
 * user sees the same thing whether they expand a tool row or a changed
 * file row.
 */
const WriteFileDiff = React.memo(function WriteFileDiff({ originalContent, newContent }) {
  const hunks = useMemo(() => {
    if (!originalContent) {
      return (newContent || '').split('\n').map((line, i) => ({
        kind: 'add',
        line,
        newNum: i + 1,
      }));
    }
    const full = computeLineDiff(originalContent, newContent || '');
    return summarizeDiff(full, { context: 1, maxLines: 16 });
  }, [originalContent, newContent]);

  const added = hunks.filter((h) => h.kind === 'add').length;
  const removed = hunks.filter((h) => h.kind === 'remove').length;

  if (hunks.length === 0) {
    return (
      <div className="inline-diff inline-diff-empty">
        No textual changes
      </div>
    );
  }

  return (
    <div className="inline-diff write-file-diff" role="region" aria-label="Write diff preview">
      <div className="tool-row-result-header">
        <span className="tool-row-result-meta">
          {`diff \u00b7 +${added} / -${removed}`}
        </span>
      </div>
      {hunks.map((h, i) => {
        if (h.kind === 'sep') {
          return (
            <div key={i} className="inline-diff-sep">
              <span>...</span>
            </div>
          );
        }
        const sign = h.kind === 'add' ? '+' : h.kind === 'remove' ? '-' : ' ';
        return (
          <div key={i} className={`inline-diff-line inline-diff-${h.kind}`}>
            <span className="inline-diff-sign">{sign}</span>
            <span className="inline-diff-text">{h.line}</span>
          </div>
        );
      })}
    </div>
  );
});

export default React.memo(ToolGroupCard);
