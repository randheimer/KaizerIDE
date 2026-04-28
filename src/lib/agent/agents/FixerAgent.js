import { AgentBase } from '../core/AgentBase';
import { buildSystemPrompt } from '../systemPrompt';
import { TOOLS } from '../tools';
import { executeTool } from '../toolExecutor';
import { compressToolResult, estimateTokens } from '../toolResultCompressor';
import { consumeStream } from '../streamProcessor';
import { indexer } from '../../indexer';

/**
 * FixerAgent - Debugging and repair agent
 * Focuses on analyzing errors and producing fixes
 */
export class FixerAgent extends AgentBase {
  constructor(config = {}) {
    super('fixer', config);
    this.maxIterations = config.maxIterations || 8;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return {
      canRead: true,
      canWrite: true,
      canExecute: true,
      allowedTools: null // All tools allowed for debugging
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

    const fixerPrompt = `

${basePrompt}

FIXER MODE - SPECIAL INSTRUCTIONS:
You are in FIXER mode. Your role is to debug issues, analyze errors, and produce targeted fixes for existing problems.

CAPABILITIES:
- You can READ files to understand the problem and context
- You can WRITE files to fix issues and bugs
- You can SEARCH for related code and error patterns
- You can EXECUTE commands to test fixes

YOUR APPROACH:
1. **Understand the Error**: Carefully analyze error messages, stack traces, and symptoms
2. **Locate the Root Cause**: Use search and read tools to find the problematic code
3. **Analyze Context**: Understand surrounding code and dependencies
4. **Design Minimal Fix**: Create the smallest change that solves the problem
5. **Verify the Fix**: Explain how to verify the fix works

DEBUGGING METHODOLOGY:
- Start by reading error messages and stack traces carefully
- Look for common patterns: typos, missing imports, incorrect types, logic errors
- Check recent changes that might have introduced the bug
- Consider edge cases and boundary conditions
- Test your assumptions before making changes

FIX PRINCIPLES:
- Make MINIMAL changes - don't refactor unrelated code
- Preserve existing functionality
- Add comments explaining the fix if it's not obvious
- Consider adding error handling if appropriate
- Don't introduce new issues while fixing old ones

RESPONSE FORMAT:
When fixing an issue, structure your response like this:

## Problem Analysis
[Describe what's wrong and why]

## Root Cause
[Explain the underlying issue]

## Fix
[Describe the fix you're applying]

## Verification
[How to verify the fix works]

IMPORTANT:
- Focus on fixing the specific issue, not general improvements
- Be surgical - change only what's necessary
- Explain your reasoning
- If you can't fix it, explain why and suggest alternatives`;

    return fixerPrompt;
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
      // Debugging loop
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        context.incrementIteration();
        
        if (context.isAborted()) {
          context.logger?.info('[FixerAgent] Execution aborted');
          break;
        }
        
        if (context.hasReachedMaxIterations()) {
          context.logger?.warn('[FixerAgent] Max iterations reached');
          break;
        }
        
        context.logger?.debug(`[FixerAgent] Iteration ${iteration + 1}/${this.maxIterations}`);
        
        // Make API call
        const { content, thinkingContent, message } = await this.makeApiCall(
          endpoint,
          apiKey,
          selectedModel,
          loopMessages,
          context,
          iteration
        );
        
        context.logger?.debug(`[FixerAgent] Response: content="${content?.slice(0, 50)}...", tool_calls=${message.tool_calls?.length || 0}`);
        
        // Add assistant message
        loopMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        });
        
        // If no tool calls, we're done
        if (!message.tool_calls || message.tool_calls.length === 0) {
          context.logger?.info('[FixerAgent] Fix complete');
          break;
        }
        
        context.logger?.info(`[FixerAgent] Executing ${message.tool_calls.length} tool(s)`);
        
        // Execute tools
        const toolResultMessages = await this.executeTools(
          message.tool_calls,
          context
        );
        
        loopMessages.push(...toolResultMessages);
        
        context.logger?.debug(`[FixerAgent] Added ${toolResultMessages.length} tool result(s), continuing loop...`);
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
              context.logger?.error('[FixerAgent] Failed to read attached file:', ctx.data, e);
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
    
    const body = {
      model: selectedModel.id,
      messages: loopMessages,
      tools: TOOLS,
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
   * Execute tools
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
        context.logger?.warn(`[FixerAgent] Tool not allowed: ${toolName}`);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Tool '${toolName}' is not allowed for this agent`
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
        context.logger?.error(`[FixerAgent] Tool execution failed: ${toolName}`, error);
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

      if (context.onToolResult) {
        context.onToolResult({
          id: toolCall.id,
          name: toolName,
          result: result,
          compressed,
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
