/**
 * Maps raw model ID to a human-friendly name with provider
 */
function formatModelName(modelId) {
  if (!modelId) return 'an advanced language model';
  const id = modelId.toLowerCase();
  if (id.includes('claude'))   return 'Claude, developed by Anthropic';
  if (id.includes('gpt'))      return 'GPT, developed by OpenAI';
  if (id.includes('gemini'))   return 'Gemini, developed by Google';
  if (id.includes('qwen'))     return 'Qwen, developed by Alibaba Cloud';
  if (id.includes('grok'))     return 'Grok, developed by xAI';
  if (id.includes('llama'))    return 'Llama, developed by Meta';
  if (id.includes('mistral'))  return 'Mistral, developed by Mistral AI';
  if (id.includes('deepseek')) return 'DeepSeek, developed by DeepSeek';
  if (id.includes('codex'))    return 'Codex, developed by OpenAI';
  return 'an advanced language model';
}

/**
 * Build system prompt with workspace context
 */
function buildSystemPrompt(workspacePath, selectedModelId, systemPrompts = {}) {
  const workspaceName = workspacePath ? workspacePath.split(/[\\/]/).pop() : null;
  const platform = navigator.userAgent.includes('Windows') ? 'windows' : 'unix';
  const shellHint = platform === 'windows'
    ? 'Use Windows CMD syntax for commands (dir, del, move, rmdir /s /q, type)'
    : 'Use Unix shell syntax (ls, rm, mv, cat)';
  const modelName = formatModelName(selectedModelId);

  // Debug: log workspace path
  console.log('[Agent] Building system prompt with workspacePath:', workspacePath);

  const basePrompt = `You are KaizerIDE — a professional AI coding assistant integrated directly into this development environment.

IDENTITY & CAPABILITIES:
You are an expert software engineer with direct access to the user's codebase, filesystem, and development tools. You can read files, write code, execute commands, search the project, and autonomously implement features or fix issues.

If asked about your identity: "I'm KaizerIDE, your AI coding assistant powered by ${modelName}."
If asked what model you are: "I'm running on ${modelName}."
If asked about model version or specifics: "I don't have access to the specific model version or identifier I'm running on, but I'm using the latest available ${modelName.split(',')[0]} model."
Never reveal specific model versions, API names, or technical identifiers. Keep it simple and professional.

ENVIRONMENT:
- Platform: ${platform}
- Shell: ${shellHint}
- Workspace: ${workspacePath ? `"${workspaceName}" at ${workspacePath}` : '⚠️ NO WORKSPACE OPEN'}

${!workspacePath ? `
⚠️ CRITICAL: NO WORKSPACE IS CURRENTLY OPEN

You cannot access files until the user opens a workspace folder.

Response template:
"I need access to your project files to help with that. Please open a workspace folder:
• Click 'File' → 'Open Folder' in the menu
• Or click the folder icon in the left sidebar

Once you've opened your project, I'll have full access to read, write, and modify files."

Do not attempt to use file tools without a workspace.
` : `
✅ WORKSPACE ACTIVE: "${workspaceName}"
- Root: ${workspacePath}
- Full filesystem access enabled
- All file operations available
`}

AVAILABLE TOOLS:
• read_file(path) — Read any file in the workspace
• write_file(path, content) — Create or overwrite files
• list_directory(path) — Explore project structure
• run_command(command, cwd?) — Execute shell commands (requires user permission)
• search_files(query, dir?) — Full-text search across codebase

IMPORTANT: Before using run_command, you MUST ask the user for permission. The user will be prompted to:
1. Allow Once - Execute this command one time
2. Allow Always - Auto-approve all future commands (use with caution)
3. Deny - Cancel the command

Never execute commands without explicit user approval.

THINKING PROCESS:
Before responding to ANY message, always reason through it first using <think>...</think> tags.
Even for simple tasks, write 2-3 sentences of thought.
Example: <think>The user wants X. I should first Y, then Z.</think>
Then proceed with your response and tool calls.

PROFESSIONAL WORKFLOW:
1. UNDERSTAND FIRST — Read relevant files and explore the project structure before making changes
2. ANALYZE CONTEXT — Consider the user's open files, recent changes, and project patterns
3. PLAN APPROACH — Think through the solution before implementing
4. IMPLEMENT PRECISELY — Make surgical, targeted changes that match the existing codebase style
5. VERIFY RESULTS — Confirm changes are correct and complete

CODING STANDARDS:
• Read files before editing — never assume content
• Match existing code style, naming conventions, and architecture
• Make minimal, focused changes — avoid unnecessary refactoring
• No superfluous comments — code should be self-documenting
• Verify file writes by re-reading when critical
• Handle errors gracefully — diagnose and fix issues autonomously

COMMUNICATION STYLE:
• Professional and concise — respect the user's time
• Action-oriented — do the work, then summarize what changed
• Clear and direct — no preamble or unnecessary explanations
• One focused question maximum if context is missing
• Show code in properly formatted blocks with language tags
• List changed files with brief descriptions of modifications

MARKDOWN FORMATTING:
Use markdown to structure your responses clearly:
• **Bold text** for emphasis: **important**
• *Italic text* for subtle emphasis: *note*
• ~~Strikethrough~~ for deprecated items: ~~old method~~
• \`inline code\` for variable names, commands, file names: \`myFunction()\`
• Headings for sections: # Main, ## Subsection, ### Detail
• Bullet lists with - or * for items
• Numbered lists with 1. 2. 3. for steps
• > Blockquotes for important notes or warnings
• --- for horizontal separators between sections
• [Links](url) for references (opens in new tab)
• Code blocks with language tags for syntax highlighting

THINKING:
When working on complex tasks, reason through the problem step by step before using tools or writing code. Use <think>...</think> tags to show your reasoning. Think about: what files to read, what changes to make, potential edge cases, and the best approach before executing.

RESPONSE FORMAT:
• Directory structures in fenced code blocks (no language tag):
  \`\`\`
  project/
  ├── src/
  │   └── main.js
  └── package.json
  \`\`\`

• Code snippets with correct language tags:
  .js/.mjs → javascript, .ts → typescript, .py → python, .lua → lua,
  .rs → rust, .cpp/.cc → cpp, .cs → csharp, .go → go, .html → html,
  .css → css, .json → json, .yaml/.yml → yaml, .md → markdown,
  .sh → bash, .toml → toml, .xml → xml

• File paths in backticks: \`src/components/App.jsx\`
• After changes: brief summary (1-3 sentences) + list of modified files

ERROR HANDLING:
• Diagnose issues using available tools
• Fix problems autonomously when possible
• Provide clear explanations when manual intervention is needed
• Never just report errors — attempt to resolve them

AGENTIC BEHAVIOR:
For complex tasks, execute multi-step workflows:
1. Explore: list_directory + search_files to understand the project
2. Read: read_file on relevant files to understand current implementation
3. Implement: write_file with precise, targeted changes
4. Verify: run_command to test if applicable
5. Summarize: concise report of what was accomplished

You are a professional development partner. Be efficient, accurate, and reliable.`;

  const customInstructions = systemPrompts[selectedModelId] || '';
  return customInstructions
    ? `${basePrompt}\n\n─── CUSTOM INSTRUCTIONS ───────────────────────────────────────\n${customInstructions}`
    : basePrompt;
}

/**
 * Tool definitions in OpenAI function calling format
 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read (relative to workspace root)'
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
  }
];

/**
 * Execute a tool call via Electron IPC
 */
async function executeTool(toolName, args, workspacePath) {
  // Simple path joining for browser context
  const joinPath = (base, relative) => {
    if (!base) return relative;
    if (!relative) return base;
    const separator = base.includes('\\') ? '\\' : '/';
    return base.endsWith(separator) ? base + relative : base + separator + relative;
  };
  
  switch (toolName) {
    case 'read_file': {
      const fullPath = workspacePath 
        ? joinPath(workspacePath, args.path)
        : args.path;
      const result = await window.electron.readFile(fullPath);
      if (result.success) {
        return result.content;
      } else {
        return `Error reading file: ${result.error}`;
      }
    }
    
    case 'write_file': {
      const fullPath = workspacePath 
        ? joinPath(workspacePath, args.path)
        : args.path;
      
      // Read original content before writing
      const existsResult = await window.electron.readFile(fullPath);
      const fileType = existsResult.success ? 'modified' : 'added';
      const originalContent = existsResult.success ? existsResult.content : '';
      
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
    
    default:
      return `Unknown tool: ${toolName}`;
  }
}

/**
 * Consume SSE stream and accumulate content + tool calls + thinking
 */
async function consumeStream(response, onToken, onThinkingToken, alreadyStartedThinking = false) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let mainContent = '';
  let fullThinking = '';
  let thinkBuffer = '';
  let inThink = false;
  let hasStartedThinking = alreadyStartedThinking;
  let toolCallMap = {};
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          
          // Method 1: reasoning_content field (OpenAI-compatible)
          if (delta?.reasoning_content) {
            fullThinking += delta.reasoning_content;
            if (onThinkingToken) onThinkingToken(delta.reasoning_content);
          }
          
          // Method 2: thinking delta type (Anthropic-style via proxy)
          if (delta?.type === 'thinking' || delta?.thinking) {
            const thinkingText = delta.thinking || '';
            fullThinking += thinkingText;
            if (onThinkingToken) onThinkingToken(thinkingText);
          }
          
          // Method 3: <think> tags inside content - parse character by character
          if (delta?.content) {
            const chunk = delta.content;
            
            for (let i = 0; i < chunk.length; i++) {
              const char = chunk[i];
              
              if (!inThink) {
                thinkBuffer += char;
                if (thinkBuffer.includes('<think>')) {
                  // Found opening tag
                  const before = thinkBuffer.split('<think>')[0];
                  if (before) {
                    mainContent += before;
                    if (onToken) onToken(before);
                  }
                  inThink = true;
                  thinkBuffer = '';
                  if (onThinkingToken && !hasStartedThinking) {
                    onThinkingToken('__START__');
                    hasStartedThinking = true;
                  }
                } else if (!'<think>'.startsWith(thinkBuffer)) {
                  // Not a partial match, flush buffer as content
                  mainContent += thinkBuffer;
                  if (onToken) onToken(thinkBuffer);
                  thinkBuffer = '';
                }
              } else {
                // Inside think block
                thinkBuffer += char;
                if (thinkBuffer.includes('</think>')) {
                  // Found closing tag
                  const parts = thinkBuffer.split('</think>');
                  const thinkContent = parts[0];
                  if (thinkContent) {
                    fullThinking += thinkContent;
                    if (onThinkingToken) onThinkingToken(thinkContent);
                  }
                  if (onThinkingToken) onThinkingToken('__END__');
                  inThink = false;
                  const after = parts[1] || '';
                  if (after) {
                    mainContent += after;
                    if (onToken) onToken(after);
                  }
                  thinkBuffer = '';
                } else if (!'</think>'.startsWith(thinkBuffer)) {
                  // Not building toward closing tag, stream the character
                  const charToStream = thinkBuffer.slice(0, -('<'.length));
                  if (charToStream) {
                    if (onThinkingToken) onThinkingToken(charToStream);
                    fullThinking += charToStream;
                  }
                  thinkBuffer = thinkBuffer.slice(-('<'.length));
                }
              }
            }
          }
          
          // Handle tool calls - accumulate by index
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallMap[idx]) {
                toolCallMap[idx] = {
                  id: '',
                  type: 'function',
                  function: {
                    name: '',
                    arguments: ''
                  }
                };
              }
              if (tc.id) toolCallMap[idx].id += tc.id;
              if (tc.function?.name) toolCallMap[idx].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallMap[idx].function.arguments += tc.function.arguments;
            }
          }
        } catch (e) {
          console.warn('Failed to parse SSE chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  const toolCallsArray = Object.values(toolCallMap);
  
  return {
    content: mainContent,
    thinkingContent: fullThinking,
    message: {
      role: 'assistant',
      content: mainContent || null,
      tool_calls: toolCallsArray.length > 0 ? toolCallsArray : undefined
    }
  };
}

/**
 * Main agent loop with tool calling
 */
export async function runAgentTurn({ 
  messages, 
  settings, 
  workspacePath,
  activeFile,
  activeFileContent,
  onToken, 
  onToolCall, 
  onToolResult, 
  onThinkingToken,
  onDone, 
  signal 
}) {
  const { endpoint, apiKey, selectedModel } = settings;
  const MAX_ITERATIONS = 12;
  
  // Process messages to include attached file contents
  const processedMessages = await Promise.all(messages.map(async (msg) => {
    if (msg.role === 'user' && msg.context && msg.context.length > 0) {
      // Read attached files and include their content
      let contextContent = '';
      for (const ctx of msg.context) {
        if (ctx.type === 'file' && ctx.data) {
          try {
            const result = await window.electron.readFile(ctx.data);
            if (result.success) {
              const fileName = ctx.data.split(/[\\/]/).pop();
              contextContent += `\n\n<attached_file path="${ctx.data}">\n${result.content}\n</attached_file>`;
            }
          } catch (e) {
            console.error('[Agent] Failed to read attached file:', ctx.data, e);
          }
        }
      }
      
      if (contextContent) {
        return {
          role: 'user',
          content: msg.content + contextContent
        };
      }
    }
    
    return {
      role: msg.role,
      content: msg.content
    };
  }));
  
  // Add currently open file as context to the first user message
  if (activeFile && activeFileContent && processedMessages.length > 0) {
    const firstUserMsgIndex = processedMessages.findIndex(m => m.role === 'user');
    if (firstUserMsgIndex !== -1) {
      const fileName = activeFile.split(/[\\/]/).pop();
      const openFileContext = `\n\n<currently_open_file path="${activeFile}">\n${activeFileContent}\n</currently_open_file>`;
      
      processedMessages[firstUserMsgIndex] = {
        ...processedMessages[firstUserMsgIndex],
        content: processedMessages[firstUserMsgIndex].content + openFileContext
      };
    }
  }
  
  let loopMessages = [
    { 
      role: 'system', 
      content: buildSystemPrompt(workspacePath, selectedModel.id, settings.systemPrompts) 
    },
    ...processedMessages
  ];
  
  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-beta': 'interleaved-thinking-2025-05-14'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const body = {
        model: selectedModel.id,
        messages: loopMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        stream: true,
        max_tokens: selectedModel.maxOutputTokens
      };
      
      // Enable thinking if model supports it
      if (selectedModel.thinking) {
        body.thinking = { type: 'enabled', budget_tokens: 8000 };
      }
      
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API ${response.status}: ${errorText}`);
      }
      
      // Consume stream and get full message
      // Pass true for alreadyStartedThinking on iterations after the first to prevent duplicate thinking blocks
      const { content, thinkingContent, message } = await consumeStream(
        response, 
        onToken, 
        onThinkingToken, 
        iteration > 0 // Don't start new thinking block on subsequent iterations
      );
      
      console.log(`[Agent] Iteration ${iteration}: content="${content?.slice(0, 50)}...", thinking="${thinkingContent?.slice(0, 50)}...", tool_calls=${message.tool_calls?.length || 0}`);
      
      // Add assistant message to loop
      loopMessages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls
      });
      
      // If no tool calls, we're done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        console.log('[Agent] No tool calls, finishing');
        break;
      }
      
      console.log(`[Agent] Executing ${message.tool_calls.length} tool(s)`);
      
      // Execute tools and collect results
      const toolResultMessages = [];
      
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let args;
        
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          args = {};
        }
        
        // Notify UI of tool call
        if (onToolCall) {
          onToolCall({
            id: toolCall.id,
            name: toolName,
            args: args
          });
        }
        
        // Execute tool
        let result;
        try {
          result = await executeTool(toolName, args, workspacePath);
        } catch (error) {
          result = `Error executing tool: ${error.message}`;
        }
        
        // Notify UI of tool result
        if (onToolResult) {
          onToolResult({
            id: toolCall.id,
            name: toolName,
            result: result
          });
        }
        
        // Add tool result message
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      }
      
      // Add all tool results to loop messages
      loopMessages.push(...toolResultMessages);
      
      console.log(`[Agent] Added ${toolResultMessages.length} tool result(s), continuing loop...`);
      
      // Continue loop - will send tool results and get final response
    }
    
    console.log('[Agent] Max iterations reached');
    
    // Done
    if (onDone) onDone();
    
  } catch (error) {
    // Handle abort
    if (error.name === 'AbortError') {
      if (onDone) onDone();
      return;
    }
    // Re-throw other errors
    throw error;
  }
}
