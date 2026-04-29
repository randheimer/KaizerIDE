/**
 * Tool definitions in OpenAI function calling format
 */
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a file. Use fromLine/toLine for ranges. Prefer ranges when you know the location.',
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
      description: 'Write content to a file, creating it if needed.',
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
      description: 'List entries in a directory.',
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
      description: 'Execute a shell command (requires user permission).',
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
      description: 'Grep for text across workspace files.',
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
      description: 'Search the workspace index by name, path, symbols, or content. Returns matches with code snippets.',
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
      description: 'Line-level search across indexed files. Returns file:line:content grouped by file.',
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
      description: 'Get structured outline of a file (functions, classes, exports) without reading full content.',
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
      description: 'Replace exact oldText with newText in a file. More surgical than write_file.',
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
      description: 'Find where a symbol is defined. Returns file, line, and surrounding context.',
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
      description: 'Find all usages of a symbol across the workspace.',
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
