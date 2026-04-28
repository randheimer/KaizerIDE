import { AgentBase } from '../core/AgentBase';
import { buildSystemPrompt } from '../systemPrompt';
import { TOOLS } from '../tools';
import { executeTool } from '../toolExecutor';
import { compressToolResult, estimateTokens } from '../toolResultCompressor';
import { consumeStream } from '../streamProcessor';
import { indexer } from '../../indexer';

/**
 * AskAgent - Read-only agent for explanations and Q&A
 * Strictly read-only, no modifications allowed
 */
export class AskAgent extends AgentBase {
  constructor(config = {}) {
    super('ask', config);
    this.maxIterations = config.maxIterations || 3; // Minimal iterations for Q&A
  }

  /**
   * Get agent capabilities - strictly read-only
   */
  getCapabilities() {
    return {
      canRead: true,
      canWrite: false,
      canExecute: false,
      allowedTools: [
        'read_file',
        'list_directory',
        'search_files',
        'search_index',
        'grep_index'
      ]
    };
  }

  /**
   * Get agent-specific system prompt
   */
  getSystemPrompt(context) {
    const basePrompt = buildSystemPrompt(
      context.workspacePath,
      context.settings?.selectedModel?.id,
      context.settings?.systemPrompts
    );

    const askPrompt = `

${basePrompt}

ASK MODE - SPECIAL INSTRUCTIONS:
You are in ASK mode. Your role is to answer questions, provide explanations, and help users understand their codebase without making any modifications.

CAPABILITIES:
- You can READ files to understand code
- You can SEARCH the codebase for information
- You can EXPLAIN concepts, patterns, and implementations
- You CANNOT write files or make any changes
- You CANNOT execute commands

YOUR TASK:
1. Understand the user's question thoroughly
2. Read relevant files if needed to provide accurate answers
3. Provide clear, concise explanations
4. Use examples from the actual codebase when helpful
5. Suggest where to look for more information

RESPONSE STYLE:
- Be direct and informative
- Use code examples when helpful
- Reference specific files and line numbers when relevant
- Explain complex concepts in simple terms
- If you don't know something, say so clearly

IMPORTANT:
- You are READ-ONLY - never suggest making changes
- Focus on explanation and understanding
- If the user asks you to make changes, politely explain that you're in Ask mode and suggest switching to Agent mode
- Keep responses focused and relevant to the question`;

    return askPrompt;
  }

  /**
   * Main execution logic
   */
  async doExecute(context) {
    const { endpoint, apiKey, selectedModel } = context.settings;
    
    // Process messages
    const processedMessages = await this.processMessages(context);
    
    // Add context
    const messagesWithContext = this.addContext(processedMessages, context);
    
    // Initialize loop messages
    let loopMessages = [
      { 
        role: 'system', 
        content: this.getSystemPrompt(context)
      },
      ...messagesWithContext
    ];
    
    try {
      // Q&A loop (minimal iterations)
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        context.incrementIteration();
        
        if (context.isAborted()) {
          context.logger?.info('[AskAgent] Execution aborted');
          break;
        }
        
        context.logger?.debug(`[AskAgent] Iteration ${iteration + 1}/${this.maxIterations}`);
        
        // Make API call
        const { content, thinkingContent, message } = await this.makeApiCall(
          endpoint,
          apiKey,
          selectedModel,
          loopMessages,
          context,
          iteration
        );
        
        // Add assistant message
        loopMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        });
        
        // If no tool calls, we're done
        if (!message.tool_calls || message.tool_calls.length === 0) {
          context.logger?.info('[AskAgent] Answer complete');
          break;
        }
        
        // Execute read-only tools
        const toolResultMessages = await this.executeTools(
          message.tool_calls,
          context
        );
        
        loopMessages.push(...toolResultMessages);
      }
      
      if (context.onDone) {
        context.onDone();
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        if (context.onDone) context.onDone();
        return;
      }
      throw error;
    }
  }

  /**
   * Process messages
   */
  /**
   * Process messages to include attached file contents
   * Note: User messages are NOT compressed, only attached file context
   */
  async processMessages(context) {
    return await Promise.all(context.messages.map(async (msg) => {
      if (msg.role === 'user' && msg.context && msg.context.length > 0) {
        let contextContent = '';
        
        for (const ctx of msg.context) {
          if (ctx.type === 'file' && ctx.data) {
            try {
              const result = await window.electron.readFile(ctx.data);
              if (result && result.success && result.content !== null) {
                const fileContent = result.content;
                
                // Compress attached file content if too large
                const tokens = estimateTokens(fileContent);
                let compressedFileContent = fileContent;
                
                if (tokens > 3000) {
                  const lines = fileContent.split('\n');
                  const maxLines = 150;
                  if (lines.length > maxLines) {
                    const head = lines.slice(0, 75).join('\n');
                    const tail = lines.slice(-75).join('\n');
                    compressedFileContent = `${head}\n\n[... ${lines.length - maxLines} lines omitted ...]\n\n${tail}`;
                  }
                }
                
                contextContent += `\n\n<attached_file path="${ctx.data}">\n${compressedFileContent}\n</attached_file>`;
              }
            } catch (e) {
              context.logger?.error('[AskAgent] Failed to read attached file:', ctx.data, e);
            }
          }
        }
        
        if (contextContent) {
          return {
            role: 'user',
            content: (msg.content || '') + contextContent
          };
        }
      }
      
      return {
        role: msg.role,
        content: msg.content || ''
      };
    }));
  }

  /**
   * Add context to messages
   * Compresses large files and context to save tokens
   */
  addContext(messages, context) {
    if (messages.length === 0) return messages;

    // Add active file context with compression
    if (context.activeFile && context.activeFileContent) {
      const firstUserMsgIndex = messages.findIndex(m => m.role === 'user');
      if (firstUserMsgIndex !== -1) {
        const fileName = context.activeFile.split(/[\\/]/).pop();
        
        // Compress active file content if too large
        const tokens = estimateTokens(context.activeFileContent);
        let compressedContent = context.activeFileContent;
        
        if (tokens > 3000) {
          const lines = context.activeFileContent.split('\n');
          const maxLines = 150;
          if (lines.length > maxLines) {
            const head = lines.slice(0, 75).join('\n');
            const tail = lines.slice(-75).join('\n');
            compressedContent = `${head}\n\n[... ${lines.length - maxLines} lines omitted ...]\n\n${tail}`;
          }
        }
        
        const openFileContext = `\n\n<currently_open_file path="${context.activeFile}">\n${compressedContent}\n</currently_open_file>`;
        
        messages[firstUserMsgIndex] = {
          ...messages[firstUserMsgIndex],
          content: (messages[firstUserMsgIndex].content || '') + openFileContext
        };
      }
    }

    // Add indexer context
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const relevantContext = indexer.getRelevantContext(lastUserMsg);
    
    if (relevantContext) {
      const lastUserMsgIndex = messages.length - 1;
      if (messages[lastUserMsgIndex]?.role === 'user') {
        messages[lastUserMsgIndex] = {
          ...messages[lastUserMsgIndex],
          content: relevantContext + '\n\n' + (messages[lastUserMsgIndex].content || '')
        };
      }
    }

    return messages;
  }

  /**
   * Make API call
   */
  async makeApiCall(endpoint, apiKey, selectedModel, loopMessages, context, iteration) {
    const headers = {
      'Content-Type': 'application/json',
      'anthropic-beta': 'interleaved-thinking-2025-05-14'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Filter tools to only read-only ones
    const allowedTools = TOOLS.filter(tool => 
      this.canUseTool(tool.function.name)
    );
    
    const body = {
      model: selectedModel.id,
      messages: loopMessages,
      tools: allowedTools,
      tool_choice: 'auto',
      stream: true,
      max_tokens: selectedModel.maxOutputTokens
    };
    
    if (selectedModel.thinking) {
      body.thinking = { type: 'enabled', budget_tokens: 8000 };
    }
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: context.abortSignal
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${response.status}: ${errorText}`);
    }
    
    return await consumeStream(
      response, 
      context.onToken, 
      context.onThinkingToken, 
      iteration > 0
    );
  }

  /**
   * Execute tools (read-only)
   */
  async executeTools(toolCalls, context) {
    const toolResultMessages = [];
    
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      let args;
      
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        args = {};
      }
      
      // Check if tool is allowed
      if (!this.canUseTool(toolName)) {
        context.logger?.warn(`[AskAgent] Tool not allowed: ${toolName}`);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Tool '${toolName}' is not allowed in Ask mode. Only read-only tools are available.`
        });
        continue;
      }
      
      if (context.onToolCall) {
        context.onToolCall({
          id: toolCall.id,
          name: toolName,
          args: args
        });
      }
      
      let result;
      try {
        const startTime = Date.now();
        result = await executeTool(toolName, args, context.workspacePath);
        const duration = Date.now() - startTime;
        context.metrics?.recordToolExecution(toolName, duration, true);
      } catch (error) {
        context.logger?.error(`[AskAgent] Tool execution failed: ${toolName}`, error);
        result = `Error executing tool: ${error.message}`;
        context.metrics?.recordToolExecution(toolName, 0, false);
      }
      
      const rawContent = typeof result === 'string' ? result : JSON.stringify(result);
      const compressedContent = compressToolResult(
        toolName,
        args,
        result,
        context.settings?.tokenSaver
      );
      const compressed = compressedContent !== rawContent;
      const showCompressionBadge = context.settings?.tokenSaver?.showCompressionBadge !== false;

      if (context.onToolResult) {
        context.onToolResult({
          id: toolCall.id,
          name: toolName,
          result: result,
          compressed: compressed && showCompressionBadge,
          modelResult: compressed ? compressedContent : null
        });
      }
      
      toolResultMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: compressedContent
      });
    }
    
    return toolResultMessages;
  }
}
