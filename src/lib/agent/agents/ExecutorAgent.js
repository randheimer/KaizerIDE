import { AgentBase } from '../core/AgentBase';
import { buildSystemPrompt } from '../systemPrompt';
import { TOOLS } from '../tools';
import { executeTool } from '../toolExecutor';
import { compressToolResult, estimateTokens } from '../toolResultCompressor';
import { consumeStream } from '../streamProcessor';
import { ContextWindowManager } from '../contextWindowManager';
import { RelevanceScorer } from '../relevanceScorer';
import { indexer } from '../../indexer';

/**
 * ExecutorAgent - Main agent for executing tasks with tool calling
 * Refactored from agentLoop.js to use AgentBase architecture
 */
export class ExecutorAgent extends AgentBase {
  constructor(config = {}) {
    super('executor', config);
    this.maxIterations = config.maxIterations || 8;
    // Cached system prompt — rebuilt only when workspace/model changes
    this._cachedSystemPrompt = null;
    this._cachedPromptKey = null;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return {
      canRead: true,
      canWrite: true,
      canExecute: true,
      allowedTools: null // All tools allowed
    };
  }

  /**
   * Get agent-specific system prompt (cached — only rebuilt when workspace/model changes)
   */
  getSystemPrompt(context) {
    const modelId = context.settings?.selectedModel?.id || '';
    const workspacePath = context.workspacePath || '';
    const indexStatus = indexer.status;
    const indexCount = indexer.index?.length || 0;

    // Cache key: changes when workspace, model, or indexer state changes
    const cacheKey = `${workspacePath}|${modelId}|${indexStatus}|${indexCount}`;

    if (this._cachedPromptKey === cacheKey && this._cachedSystemPrompt) {
      return this._cachedSystemPrompt;
    }

    const basePrompt = buildSystemPrompt(
      workspacePath,
      modelId,
      context.settings?.systemPrompts
    );

    const executorPrompt = `

${basePrompt}

AGENT MODE - SPECIAL INSTRUCTIONS:
You are in AGENT mode (Executor). Your role is to autonomously execute tasks, implement features, and make changes to the codebase.

CAPABILITIES:
- You can READ files to understand the codebase
- You can WRITE files to implement features and fix issues
- You can EXECUTE commands to run tests, build, install packages, etc.
- You can SEARCH the codebase to find relevant code
- You have FULL ACCESS to all tools

WORKFLOW:
1. **Understand** - Read relevant files and explore the project structure
2. **Plan** - Think through the solution approach
3. **Implement** - Make precise, targeted changes
4. **Verify** - Test your changes when possible
5. **Report** - Summarize what you accomplished

BEST PRACTICES:
- Always read files before editing them
- Make surgical, minimal changes that match existing code style
- Use the indexer to find relevant files quickly
- Execute commands to verify your changes work
- Handle errors gracefully and fix issues autonomously
- Think step-by-step using <think>...</think> tags

STREAMING PROGRESS:
- After executing tools, briefly describe what you learned or accomplished before requesting more tools
- Stream progress updates between tool batches so the user knows what you're doing
- Example: "Read config files, found auth settings" or "Modified 3 components, now testing"
- Keep the user informed during multi-step operations

You are the primary agent for getting work done. Be proactive, thorough, and reliable.`;

    this._cachedSystemPrompt = executorPrompt;
    this._cachedPromptKey = cacheKey;
    return executorPrompt;
  }

  /**
   * Main execution logic
   */
  async doExecute(context) {
    const { endpoint, apiKey, selectedModel } = context.settings;
    
    // Initialize context window manager with model's context limit
    const maxContextTokens = selectedModel?.maxContextTokens || 128000;
    const cwm = new ContextWindowManager({ maxContextTokens });
    
    // Process messages to include attached file contents
    const processedMessages = await this.processMessages(context);
    
    // Add currently open file as context
    const messagesWithActiveFile = this.addActiveFileContext(
      processedMessages,
      context.activeFile,
      context.activeFileContent
    );
    
    // Get relevant context from indexer
    const messagesWithIndexContext = this.addIndexerContext(
      messagesWithActiveFile,
      context
    );
    
    // Build system prompt (cached)
    const rawSystemPrompt = this.getSystemPrompt(context);
    
    // Prune messages to fit within context window
    const { systemPrompt, messages: prunedMessages, stats } = cwm.pruneMessages(
      rawSystemPrompt,
      messagesWithIndexContext
    );
    
    if (stats.pruned) {
      context.logger?.info('[ExecutorAgent] Context pruned', {
        before: stats.totalBefore,
        after: stats.totalAfter,
        collapsedToolPairs: stats.collapsedToolPairs || 0,
        prunedOldMessages: stats.prunedOldMessages || 0,
      });
    }
    
    // Initialize loop messages with pruned system prompt
    let loopMessages = [
      { role: 'system', content: systemPrompt },
      ...prunedMessages
    ];
    
    // Track token usage for adaptive compression
    cwm.recordUsage(cwm.estimateTotal(systemPrompt, prunedMessages));
    
    try {
      // Main agent loop
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        context.incrementIteration();

        // Notify UI of iteration progress
        if (context.onIterationUpdate) {
          context.onIterationUpdate(iteration + 1, this.maxIterations);
        }

        // Check for abort
        if (context.isAborted()) {
          context.logger?.info('[ExecutorAgent] Execution aborted');
          break;
        }

        // Check max iterations
        if (context.hasReachedMaxIterations()) {
          context.logger?.warn('[ExecutorAgent] Max iterations reached');
          break;
        }

        context.logger?.debug(`[ExecutorAgent] Iteration ${iteration + 1}/${this.maxIterations}`);
        
        // Make API call
        const { content, thinkingContent, message } = await this.makeApiCall(
          endpoint,
          apiKey,
          selectedModel,
          loopMessages,
          context,
          iteration
        );
        
        context.logger?.debug(`[ExecutorAgent] Response: content="${content?.slice(0, 50)}...", thinking="${thinkingContent?.slice(0, 50)}...", tool_calls=${message.tool_calls?.length || 0}`);
        
        // Track token usage from the response
        const responseTokens = estimateTokens(content || '', 'code');
        cwm.recordUsage(responseTokens);
        
        // Add assistant message to loop
        loopMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        });
        
        // If no tool calls, we're done
        if (!message.tool_calls || message.tool_calls.length === 0) {
          context.logger?.info('[ExecutorAgent] No tool calls, finishing');
          break;
        }
        
        context.logger?.info(`[ExecutorAgent] Executing ${message.tool_calls.length} tool(s)`);
        
        // Execute tools and collect results
        const toolResultMessages = await this.executeTools(
          message.tool_calls,
          context,
          cwm
        );
        
        // Add tool results to loop messages
        loopMessages.push(...toolResultMessages);
        
        // Mid-loop pruning: if we're accumulating too many messages,
        // prune older tool exchanges to keep context manageable
        if (iteration > 0 && iteration % 3 === 0) {
          const loopTokens = cwm.estimateTotal(systemPrompt, loopMessages.slice(1));
          if (loopTokens > maxContextTokens * 0.7) {
            context.logger?.info('[ExecutorAgent] Mid-loop pruning triggered', { loopTokens });
            const midPrune = cwm.pruneMessages(systemPrompt, loopMessages.slice(1));
            loopMessages = [{ role: 'system', content: systemPrompt }, ...midPrune.messages];
          }
        }
        
        context.logger?.debug(`[ExecutorAgent] Added ${toolResultMessages.length} tool result(s), continuing loop...`);
      }
      
      // Done
      if (context.onDone) {
        context.onDone();
      }
      
    } catch (error) {
      // Handle abort
      if (error.name === 'AbortError') {
        if (context.onDone) {
          context.onDone();
        }
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

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
              if (result && result.success && result.content !== null && result.content !== undefined) {
                const fileName = ctx.data.split(/[\\/]/).pop();
                const fileContent = result.content;
                
                // Compress attached file content if too large (but not user's message)
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
              context.logger?.error('[ExecutorAgent] Failed to read attached file:', ctx.data, e);
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
   * Add active file context to messages
   * Compresses large files to save tokens
   */
  addActiveFileContext(messages, activeFile, activeFileContent) {
    if (!activeFile || !activeFileContent || messages.length === 0) {
      return messages;
    }

    const firstUserMsgIndex = messages.findIndex(m => m.role === 'user');
    if (firstUserMsgIndex === -1 || !messages[firstUserMsgIndex]) {
      return messages;
    }

    const fileName = activeFile.split(/[\\/]/).pop();
    
    // Compress active file content if too large
    const tokens = estimateTokens(activeFileContent);
    let compressedContent = activeFileContent;
    
    if (tokens > 3000) {
      const lines = activeFileContent.split('\n');
      const maxLines = 150;
      if (lines.length > maxLines) {
        const head = lines.slice(0, 75).join('\n');
        const tail = lines.slice(-75).join('\n');
        compressedContent = `${head}\n\n[... ${lines.length - maxLines} lines omitted ...]\n\n${tail}`;
      }
    }
    
    const openFileContext = `\n\n<currently_open_file path="${activeFile}">\n${compressedContent}\n</currently_open_file>`;
    
    const updatedMessages = [...messages];
    updatedMessages[firstUserMsgIndex] = {
      ...messages[firstUserMsgIndex],
      content: (messages[firstUserMsgIndex].content || '') + openFileContext
    };

    return updatedMessages;
  }

  /**
   * Add indexer context to messages using RelevanceScorer
   */
  addIndexerContext(messages, context) {
    if (messages.length === 0) return messages;

    const indexFileCount = indexer.index?.length || 0;
    
    // For large projects (> 140 files), use RelevanceScorer for smart selection
    // instead of dumping everything or nothing
    if (indexFileCount > 140) {
      // Use RelevanceScorer for intelligent file selection
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      const contextPills = context.settings?.contextPills || [];
      
      // Initialize scorer lazily
      if (!this._relevanceScorer && indexer.searchEngine) {
        this._relevanceScorer = new RelevanceScorer(indexer.searchEngine);
      }
      
      let relevantContext = null;
      if (this._relevanceScorer) {
        relevantContext = this._relevanceScorer.buildRelevantContext(
          lastUserMsg, messages, contextPills, indexer
        );
      }
      
      // Fallback if scorer isn't available or found nothing
      if (!relevantContext) {
        relevantContext = `
━━━ WORKSPACE CONTEXT (TRUNCATED) ━━━
Large project detected: ${indexFileCount} files indexed

⚠️ Full context not provided to save tokens.
Use these tools to discover relevant files:
• search_index(query) - Find files by name, path, or symbols (code files only)
• grep_index(query) - Search code content across all files (code files only)

Start by using search tools before reading files.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }

      const firstUserMsgIndex = messages.findIndex(m => m.role === 'user');
      if (firstUserMsgIndex === -1 || !messages[firstUserMsgIndex]) {
        return messages;
      }

      const updatedMessages = [...messages];
      updatedMessages[firstUserMsgIndex] = {
        ...messages[firstUserMsgIndex],
        content: relevantContext + '\n\n' + (messages[firstUserMsgIndex].content || '')
      };

      return updatedMessages;
    }

    // For smaller projects, use RelevanceScorer too (better than raw getRelevantContext)
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const contextPills = context.settings?.contextPills || [];
    
    if (!this._relevanceScorer && indexer.searchEngine) {
      this._relevanceScorer = new RelevanceScorer(indexer.searchEngine);
    }
    
    let relevantContext = null;
    if (this._relevanceScorer) {
      relevantContext = this._relevanceScorer.buildRelevantContext(
        lastUserMsg, messages, contextPills, indexer
      );
    }
    
    // Fallback to legacy method
    if (!relevantContext) {
      relevantContext = indexer.getRelevantContext?.(lastUserMsg) || null;
    }
    
    if (!relevantContext) return messages;

    const lastUserMsgIndex = messages.length - 1;
    if (!messages[lastUserMsgIndex] || messages[lastUserMsgIndex].role !== 'user') {
      return messages;
    }

    const updatedMessages = [...messages];
    updatedMessages[lastUserMsgIndex] = {
      ...messages[lastUserMsgIndex],
      content: relevantContext + '\n\n' + (messages[lastUserMsgIndex].content || '')
    };

    return updatedMessages;
  }

  /**
   * Make API call with streaming
   */
  async makeApiCall(endpoint, apiKey, selectedModel, loopMessages, context, iteration) {
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
      signal: context.abortSignal
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${response.status}: ${errorText}`);
    }
    
    // Consume stream and get full message
    return await consumeStream(
      response, 
      context.onToken, 
      context.onThinkingToken, 
      iteration > 0 // Don't start new thinking block on subsequent iterations
    );
  }

  /**
   * Execute tools and collect results
   */
  async executeTools(toolCalls, context, cwm = null) {
    const toolResultMessages = [];
    
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      let args;
      
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        args = {};
      }
      
      // Check if agent can use this tool
      if (!this.canUseTool(toolName)) {
        context.logger?.warn(`[ExecutorAgent] Tool not allowed: ${toolName}`);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Tool '${toolName}' is not allowed for this agent`
        });
        continue;
      }
      
      // Notify UI of tool call
      if (context.onToolCall) {
        context.onToolCall({
          id: toolCall.id,
          name: toolName,
          args: args
        });
      }
      
      // Execute tool with retry logic
      let result;
      try {
        const startTime = Date.now();
        result = await executeTool(toolName, args, context.workspacePath);
        const duration = Date.now() - startTime;
        
        context.metrics?.recordToolExecution(toolName, duration, true);
        
      } catch (error) {
        context.logger?.error(`[ExecutorAgent] Tool execution failed: ${toolName}`, error);
        result = `Error executing tool: ${error.message}`;
        context.metrics?.recordToolExecution(toolName, 0, false);
      }
      
      const rawContent = typeof result === 'string' ? result : JSON.stringify(result);
      // Pass remaining context budget to compressor for adaptive compression
      const contextBudgetRemaining = cwm ? cwm.getRemainingBudget() : null;
      const compressedContent = compressToolResult(
        toolName,
        args,
        result,
        context.settings?.tokenSaver,
        contextBudgetRemaining
      );
      const compressed = compressedContent !== rawContent;
      const showCompressionBadge = context.settings?.tokenSaver?.showCompressionBadge !== false;

      // Track tool result token usage
      if (cwm) {
        cwm.recordUsage(compressed ? estimateTokens(compressedContent, 'code') : estimateTokens(rawContent, 'code'));
      }

      // Notify UI of tool result
      if (context.onToolResult) {
        context.onToolResult({
          id: toolCall.id,
          name: toolName,
          result: result,
          compressed: compressed && showCompressionBadge,
          modelResult: compressed ? compressedContent : null
        });
      }
      
      // Add tool result message
      toolResultMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: compressedContent
      });
    }
    
    return toolResultMessages;
  }
}
