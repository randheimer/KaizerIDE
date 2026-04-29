import { indexer } from '../indexer';
import { RetryPolicy } from './reliability/RetryPolicy';
import { ErrorHandler } from './reliability/ErrorHandler';

// Create retry policy and error handler for tool execution
const retryPolicy = RetryPolicy.getPolicy('FAST');
const errorHandler = new ErrorHandler();

/**
 * Execute a tool call via Electron IPC with retry logic
 */
export async function executeTool(toolName, args, workspacePath, context = {}) {
  // Simple path joining for browser context
  const joinPath = (base, relative) => {
    if (!base) return relative;
    if (!relative) return base;
    const separator = base.includes('\\') ? '\\' : '/';
    return base.endsWith(separator) ? base + relative : base + separator + relative;
  };
  
  // Wrap tool execution with retry logic for transient failures
  const executeWithRetry = async (attemptNumber) => {
    switch (toolName) {
      case 'read_file': {
        const fullPath = workspacePath
          ? joinPath(workspacePath, args.path)
          : args.path;
        console.log('[Agent] read_file called for:', fullPath, {
          fromLine: args.fromLine,
          toLine: args.toLine,
        });
        const result = await window.electron.readFile(fullPath);
        if (!(result.success && result.content !== null && result.content !== undefined)) {
          const errorMsg = `Error reading file: ${result.error || 'File content is empty or null'}`;
          console.error('[Agent]', errorMsg, 'Path:', fullPath);
          throw new Error(errorMsg);
        }

        // Optional line-range slicing. 1-indexed, inclusive. Prevents the
        // agent from pulling whole huge files when it knows the region.
        const from = Number.isFinite(args.fromLine) ? Math.max(1, Math.floor(args.fromLine)) : null;
        const to = Number.isFinite(args.toLine) ? Math.max(from || 1, Math.floor(args.toLine)) : null;
        if (from === null && to === null) {
          return result.content;
        }

        const allLines = result.content.split('\n');
        const startIdx = (from ?? 1) - 1;
        const endIdx = Math.min(allLines.length, to ?? allLines.length);
        const sliced = allLines.slice(startIdx, endIdx);
        // Prefix each line with its absolute line number so the model can
        // reference positions confidently.
        const width = String(endIdx).length;
        return sliced
          .map((ln, i) => `${String(startIdx + 1 + i).padStart(width, ' ')}  ${ln}`)
          .join('\n');
      }
    
    case 'write_file': {
      const fullPath = workspacePath 
        ? joinPath(workspacePath, args.path)
        : args.path;
      
      // Read original content before writing
      const existsResult = await window.electron.readFile(fullPath);
      const fileType = existsResult.success ? 'modified' : 'added';
      const originalContent = (existsResult.success && existsResult.content !== null && existsResult.content !== undefined) ? existsResult.content : '';
      
      const result = await window.electron.writeFile(fullPath, args.content);
      if (result.success) {
        // Dispatch event to notify UI of file change with diff data
        window.dispatchEvent(new CustomEvent('kaizer:file-written', { 
          detail: { 
            path: fullPath,
            type: fileType,
            content: args.content,
            originalContent: originalContent,
            oldContent: originalContent,
            newContent: args.content
          } 
        }));
        return `File written successfully: ${args.path}`;
      } else {
        return `Error writing file: ${result.error}`;
      }
    }
    
    case 'list_directory': {
      const fullPath = workspacePath 
        ? joinPath(workspacePath, args.path || '')
        : args.path || '.';
      const result = await window.electron.listDir(fullPath);
      if (result.success) {
        return result.entries
          .map(e => `${e.type === 'directory' ? '[DIR] ' : '[FILE]'} ${e.name}`)
          .join('\n');
      } else {
        return `Error listing directory: ${result.error}`;
      }
    }
    
    case 'run_command': {
      const cwd = args.cwd 
        ? (workspacePath ? joinPath(workspacePath, args.cwd) : args.cwd)
        : workspacePath;
      
      // Request user permission before executing
      const permission = await new Promise((resolve) => {
        window.dispatchEvent(new CustomEvent('kaizer:request-command-permission', {
          detail: {
            command: args.command,
            cwd: cwd,
            onResponse: resolve
          }
        }));
      });
      
      if (!permission.allowed) {
        return `Command execution denied by user: ${args.command}`;
      }
      
      const result = await window.electron.runCommand(args.command, cwd);
      let output = `$ ${args.command}\n`;
      if (result.stdout) output += result.stdout + '\n';
      if (result.stderr) output += result.stderr + '\n';
      output += `[exit: ${result.exitCode}]`;
      return output;
    }
    
    case 'search_files': {
      const searchDir = args.directory 
        ? (workspacePath ? joinPath(workspacePath, args.directory) : args.directory)
        : workspacePath;
      const result = await window.electron.searchFiles(args.query, searchDir);
      if (result.success) {
        return result.results
          .map(r => `${r.file}:${r.line}  ${r.content}`)
          .join('\n');
      } else {
        return `Error searching files: ${result.error}`;
      }
    }
    
    case 'search_index': {
      const limit = args.limit || 20;
      const results = indexer.search(args.query, limit);
      if (results.length === 0) {
        return `No code files found matching "${args.query}" (documentation files excluded)`;
      }
      const needle = (args.query || '').toLowerCase();
      // Build a richer per-result block: metadata + a short code snippet
      // so the AI sees actual code, not just "Lines: 40".
      return results
        .map((f) => {
          const symbolsStr =
            (Array.isArray(f.symbols) ? f.symbols : [])
              .slice(0, 5)
              .map((s) => {
                if (!s) return null;
                if (typeof s === 'string') return s;
                return s.line ? `${s.name}:${s.line}` : s.name;
              })
              .filter(Boolean)
              .join(', ') || 'none';
          const header = `${f.path}\n  Type: ${f.ext} | Lines: ${f.lines} | Symbols: ${symbolsStr}`;

          if (!f.preview) return header;
          const lines = f.preview.split('\n');
          const matchIdx = lines.findIndex((ln) =>
            ln.toLowerCase().includes(needle)
          );
          let snippetLines;
          let startLine;
          if (matchIdx !== -1) {
            const from = Math.max(0, matchIdx - 2);
            const to = Math.min(lines.length, matchIdx + 3);
            snippetLines = lines.slice(from, to);
            startLine = from + 1;
          } else {
            snippetLines = lines.slice(0, 5);
            startLine = 1;
          }
          const snippet = snippetLines
            .map((ln, i) => `  ${String(startLine + i).padStart(4, ' ')}  ${ln}`)
            .join('\n');
          return `${header}\n${snippet}`;
        })
        .join('\n\n');
    }

    case 'grep_index': {
      const limit = args.limit || 30;
      const results = indexer.grep(args.query, limit);
      if (results.length === 0) {
        return `No matches for "${args.query}" in code files (documentation files excluded).`;
      }
      // Group by file for a compact, grep-like output.
      const byFile = new Map();
      for (const r of results) {
        if (!byFile.has(r.path)) byFile.set(r.path, []);
        byFile.get(r.path).push(r);
      }
      return Array.from(byFile.entries())
        .map(([path, matches]) => {
          const lines = matches
            .map((m) => `  ${String(m.line).padStart(4, ' ')}: ${m.content}`)
            .join('\n');
          return `${path}\n${lines}`;
        })
        .join('\n\n');
    }

    case 'get_file_outline': {
      const fullPath = workspacePath
        ? joinPath(workspacePath, args.path)
        : args.path;
      const result = await window.electron.getFileOutline(fullPath);
      if (result.success) {
        const outline = result.outline;
        if (!outline || outline.length === 0) {
          return `No symbols found in ${args.path}`;
        }
        return outline
          .map(item => {
            const indent = '  '.repeat(item.level || 0);
            return `${indent}${item.kind} ${item.name} (line ${item.line})`;
          })
          .join('\n');
      } else {
        return `Error getting file outline: ${result.error}`;
      }
    }

    case 'patch_file': {
      const fullPath = workspacePath
        ? joinPath(workspacePath, args.path)
        : args.path;
      
      // Read current content
      const readResult = await window.electron.readFile(fullPath);
      if (!readResult.success) {
        return `Error reading file for patching: ${readResult.error}`;
      }
      
      const originalContent = readResult.content;
      
      // Check if old text exists
      if (!originalContent.includes(args.oldText)) {
        return `Error: Could not find exact match for oldText in ${args.path}. The text may have changed or whitespace may not match exactly.`;
      }
      
      // Apply patch
      const newContent = originalContent.replace(args.oldText, args.newText);
      
      // Write patched content
      const writeResult = await window.electron.writeFile(fullPath, newContent);
      if (writeResult.success) {
        // Dispatch event to notify UI of file change
        window.dispatchEvent(new CustomEvent('kaizer:file-written', {
          detail: {
            path: fullPath,
            type: 'modified',
            content: newContent,
            originalContent: originalContent,
            oldContent: originalContent,
            newContent: newContent
          }
        }));
        return `File patched successfully: ${args.path}`;
      } else {
        return `Error writing patched file: ${writeResult.error}`;
      }
    }

    case 'get_symbol_definition': {
      const results = indexer.search(args.symbol, 50);
      if (results.length === 0) {
        return `No definition found for symbol "${args.symbol}"`;
      }
      
      // Filter for actual definitions (functions, classes, etc.)
      const definitions = results.filter(f => {
        if (!f.symbols || !Array.isArray(f.symbols)) return false;
        return f.symbols.some(s => {
          const name = typeof s === 'string' ? s : s.name;
          return name && name.toLowerCase().includes(args.symbol.toLowerCase());
        });
      });
      
      if (definitions.length === 0) {
        return `Symbol "${args.symbol}" found in files but no clear definition located. Try using search_index or grep_index for more results.`;
      }
      
      // Return top matches with context
      return definitions.slice(0, 5).map(f => {
        const symbolInfo = f.symbols
          .filter(s => {
            const name = typeof s === 'string' ? s : s.name;
            return name && name.toLowerCase().includes(args.symbol.toLowerCase());
          })
          .map(s => typeof s === 'string' ? s : `${s.name} (line ${s.line})`)
          .join(', ');
        
        let output = `${f.path}\n  Symbols: ${symbolInfo}`;
        if (f.preview) {
          const lines = f.preview.split('\n').slice(0, 10);
          const snippet = lines.map((ln, i) => `  ${String(i + 1).padStart(4, ' ')}  ${ln}`).join('\n');
          output += `\n${snippet}`;
        }
        return output;
      }).join('\n\n');
    }

    case 'find_references': {
      const results = indexer.grep(args.symbol, 100);
      if (results.length === 0) {
        return `No references found for symbol "${args.symbol}"`;
      }
      
      // Group by file
      const byFile = new Map();
      for (const r of results) {
        if (!byFile.has(r.path)) byFile.set(r.path, []);
        byFile.get(r.path).push(r);
      }
      
      return Array.from(byFile.entries())
        .map(([path, matches]) => {
          const lines = matches
            .map((m) => `  Line ${String(m.line).padStart(4, ' ')}: ${m.content.trim()}`)
            .join('\n');
          return `${path} (${matches.length} reference${matches.length > 1 ? 's' : ''})\n${lines}`;
        })
        .join('\n\n');
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
  };

  // Execute with retry logic for transient failures
  try {
    return await retryPolicy.execute(executeWithRetry, { errorHandler });
  } catch (error) {
    // Format error message for user
    const formattedError = errorHandler.formatErrorMessage(error);
    console.error('[Agent] Tool execution failed after retries:', toolName, error);
    return formattedError;
  }
}
