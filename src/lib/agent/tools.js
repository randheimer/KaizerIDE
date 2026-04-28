/**
 * Tool definitions in OpenAI function calling format
 */
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file. If fromLine/toLine are provided, only that 1-indexed inclusive range is returned, prefixed with line numbers. Use a range when you already know where to look (e.g., from search_index symbol line numbers) so you don\'t pull entire large files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read (relative to workspace root)'
          },
          fromLine: {
            type: 'number',
            description: 'Optional 1-indexed start line (inclusive). If omitted, reads from line 1.'
          },
          toLine: {
            type: 'number',
            description: 'Optional 1-indexed end line (inclusive). If omitted, reads to end of file.'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write (relative to workspace root)'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List entries in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the directory to list (relative to workspace root, or empty for root)'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute'
          },
          cwd: {
            type: 'string',
            description: 'Working directory (relative to workspace root, optional)'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search for text across files in the workspace',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Text to search for'
          },
          directory: {
            type: 'string',
            description: 'Directory to search in (relative to workspace root, optional)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_index',
      description: 'Search the workspace index for files by name, path, symbols, or content. Returns code files only. Returns each match with file metadata AND a short code snippet (5 lines around the hit), so you can usually answer without a follow-up read_file. Much faster than list_directory.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (filename, symbol name, or keyword)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 20)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'grep_index',
      description: 'Line-level text search across the first ~50 lines of every indexed file. Returns code files only. Returns file path, line number, and matching line content grouped by file. Use this to quickly locate usages/definitions without reading files. Case-insensitive literal match.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Literal text to match (case-insensitive).'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of matches to return (default: 30).'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_file_outline',
      description: 'Get a structured outline of a file showing all functions, classes, methods, and exports. Returns AST-based structure without reading the entire file content. Perfect for understanding file organization quickly.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to analyze (relative to workspace root)'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'patch_file',
      description: 'Apply a precise patch to a file by replacing specific old text with new text. More surgical than rewriting entire files. Useful for making targeted changes to large files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to patch (relative to workspace root)'
          },
          oldText: {
            type: 'string',
            description: 'Exact text to find and replace (must match exactly including whitespace)'
          },
          newText: {
            type: 'string',
            description: 'New text to replace the old text with'
          }
        },
        required: ['path', 'oldText', 'newText']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_symbol_definition',
      description: 'Find the definition location of a symbol (function, class, variable, etc.). Returns file path, line number, and surrounding code context.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Name of the symbol to find (e.g., function name, class name, variable name)'
          },
          contextFile: {
            type: 'string',
            description: 'Optional: file path where the symbol is used (helps with scoping)'
          }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_references',
      description: 'Find all references/usages of a symbol across the workspace. Returns list of locations where the symbol is used with file path, line number, and code context.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Name of the symbol to find references for'
          },
          definitionFile: {
            type: 'string',
            description: 'Optional: file path where the symbol is defined (helps with accuracy)'
          }
        },
        required: ['symbol']
      }
    }
  }
];
