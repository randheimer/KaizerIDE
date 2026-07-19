/**
 * ContextWindowManager
 *
 * Tracks cumulative token usage across a conversation and provides
 * intelligent message pruning when the context window fills up.
 *
 * Strategy:
 *   1. System prompt + last N user/assistant exchanges are kept intact
 *   2. Older tool call/result pairs are collapsed to one-line summaries
 *   3. If still over budget, older user messages are summarized
 *   4. Target: keep total context under 85% of model's context window
 *
 * Usage:
 *   const cwm = new ContextWindowManager({ maxContextTokens: 128000 });
 *   const pruned = cwm.pruneMessages(systemPrompt, messages);
 */

import { estimateTokens } from './toolResultCompressor';

/** Safety margin — we aim for 85% of the context window to leave room
 *  for the model's response and any estimation误差. */
const UTILIZATION_TARGET = 0.85;

/** Number of recent exchanges (user+assistant pairs) to keep verbatim. */
const KEEP_RECENT_EXCHANGES = 4;

/** Maximum tokens we'll spend on the system prompt before compressing. */
const SYSTEM_PROMPT_BUDGET = 3500;

export class ContextWindowManager {
  /**
   * @param {object} opts
   * @param {number} opts.maxContextTokens  Model's context window size (default 128k)
   * @param {number} [opts.utilizationTarget] Fraction of window to use (0-1)
   * @param {number} [opts.keepRecentExchanges] How many recent exchanges to preserve
   */
  constructor(opts = {}) {
    this.maxContextTokens = opts.maxContextTokens || 128_000;
    this.utilizationTarget = opts.utilizationTarget ?? UTILIZATION_TARGET;
    this.keepRecentExchanges = opts.keepRecentExchanges ?? KEEP_RECENT_EXCHANGES;

    /** Running token count for the current turn (updated externally). */
    this._usedTokens = 0;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Return the token budget available for new content.
   * @returns {number}
   */
  getRemainingBudget() {
    return Math.max(0, this.getEffectiveBudget() - this._usedTokens);
  }

  /**
   * Record that `n` tokens were consumed (e.g. after an API response).
   * @param {number} n
   */
  recordUsage(n) {
    this._usedTokens += n;
  }

  /**
   * Reset the usage counter (e.g. at the start of a new conversation).
   */
  reset() {
    this._usedTokens = 0;
  }

  /**
   * Prune a message array to fit within the context window.
   *
   * @param {string} systemPrompt   The system prompt string
   * @param {Array}  messages       Conversation messages [{role, content, tool_calls?, tool_call_id?}]
   * @returns {{ systemPrompt: string, messages: Array, stats: object }}
   */
  pruneMessages(systemPrompt, messages) {
    const budget = this.getEffectiveBudget();

    // Measure what we're starting with
    const systemTokens = estimateTokens(systemPrompt, 'prose');
    const messageTokens = messages.reduce(
      (sum, m) => sum + estimateTokens(m.content || '', 'code'),
      0
    );
    const totalBefore = systemTokens + messageTokens;

    // If we're under budget, return as-is
    if (totalBefore <= budget) {
      return {
        systemPrompt,
        messages,
        stats: { pruned: false, totalBefore, totalAfter: totalBefore, systemTokens, messageTokens },
      };
    }

    // We need to prune. Start with the system prompt.
    let finalSystemPrompt = systemPrompt;
    let systemBudget = Math.min(SYSTEM_PROMPT_BUDGET, systemTokens);
    if (systemTokens > systemBudget) {
      finalSystemPrompt = this._compressSystemPrompt(systemPrompt, systemBudget);
    }
    const finalSystemTokens = estimateTokens(finalSystemPrompt, 'prose');

    // Available budget for messages
    let messageBudget = budget - finalSystemTokens;

    // Partition messages into recent (keep verbatim) and old (prune)
    const { recent, old } = this._partitionMessages(messages);

    // Measure recent messages
    const recentTokens = recent.reduce(
      (sum, m) => sum + estimateTokens(m.content || '', 'code'),
      0
    );

    // If recent alone exceeds budget, we have to truncate even recent
    if (recentTokens > messageBudget) {
      const truncated = this._hardTruncate(recent, messageBudget);
      return {
        systemPrompt: finalSystemPrompt,
        messages: truncated,
        stats: {
          pruned: true,
          totalBefore,
          totalAfter: finalSystemTokens + this._measureMessages(truncated),
          systemTokens: finalSystemTokens,
          messageTokens: this._measureMessages(truncated),
          prunedOldMessages: old.length,
          hardTruncated: true,
        },
      };
    }

    // Budget remaining for old messages
    const oldBudget = messageBudget - recentTokens;

    // Prune old messages to fit
    const prunedOld = this._pruneOldMessages(old, oldBudget);

    const finalMessages = [...prunedOld, ...recent];
    const totalAfter = finalSystemTokens + this._measureMessages(finalMessages);

    return {
      systemPrompt: finalSystemPrompt,
      messages: finalMessages,
      stats: {
        pruned: true,
        totalBefore,
        totalAfter,
        systemTokens: finalSystemTokens,
        messageTokens: totalAfter - finalSystemTokens,
        prunedOldMessages: old.length,
        collapsedToolPairs: this._countCollapsed(old, prunedOld),
      },
    };
  }

  /**
   * Estimate total tokens for a message array + system prompt.
   * Useful for pre-flight checks before making an API call.
   */
  estimateTotal(systemPrompt, messages) {
    const sys = estimateTokens(systemPrompt, 'prose');
    const msg = messages.reduce(
      (sum, m) => sum + estimateTokens(m.content || '', 'code'),
      0
    );
    return sys + msg;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  getEffectiveBudget() {
    return Math.floor(this.maxContextTokens * this.utilizationTarget);
  }

  /**
   * Split messages into "old" and "recent" partitions.
   * Recent = last N complete user+assistant exchanges.
   */
  _partitionMessages(messages) {
    // Find the boundary: count backwards N user messages
    let userCount = 0;
    let splitIndex = messages.length;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userCount++;
        if (userCount >= this.keepRecentExchanges) {
          splitIndex = i;
          break;
        }
      }
    }

    // Include any tool messages that belong to the most recent assistant turn
    // in the "recent" partition (they're part of the last exchange)
    if (splitIndex < messages.length && messages[splitIndex].role === 'tool') {
      // Walk back to find the start of this tool group
      while (splitIndex > 0 && messages[splitIndex - 1].role === 'tool') {
        splitIndex--;
      }
    }

    return {
      old: messages.slice(0, splitIndex),
      recent: messages.slice(splitIndex),
    };
  }

  /**
   * Prune old messages to fit within `budget` tokens.
   * Strategy:
   *   1. Collapse tool call/result pairs into one-line summaries
   *   2. If still over budget, drop oldest messages first
   */
  _pruneOldMessages(oldMessages, budget) {
    if (oldMessages.length === 0) return [];

    // First pass: collapse tool pairs
    const collapsed = this._collapseToolPairs(oldMessages);

    // Measure after collapse
    let tokens = this._measureMessages(collapsed);

    if (tokens <= budget) {
      return collapsed;
    }

    // Second pass: drop oldest messages until under budget
    const result = [...collapsed];
    while (result.length > 0 && tokens > budget) {
      const removed = result.shift();
      tokens -= estimateTokens(removed.content || '', 'code');
    }

    return result;
  }

  /**
   * Collapse consecutive assistant(tool_calls) + tool(result) pairs
   * into a single summary message.
   */
  _collapseToolPairs(messages) {
    const result = [];
    let i = 0;

    while (i < messages.length) {
      const msg = messages[i];

      // Check if this is an assistant message with tool_calls
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        // Collect the following tool result messages
        const toolResults = [];
        let j = i + 1;
        while (j < messages.length && messages[j].role === 'tool') {
          toolResults.push(messages[j]);
          j++;
        }

        // If we have matching tool results, collapse them
        if (toolResults.length > 0) {
          const summary = this._summarizeToolExchange(msg, toolResults);
          result.push({
            role: 'assistant',
            content: summary,
          });
          i = j; // Skip past the tool results
          continue;
        }
      }

      // Regular message — keep as-is
      result.push(msg);
      i++;
    }

    return result;
  }

  /**
   * Create a one-line summary of a tool call + result exchange.
   */
  _summarizeToolExchange(assistantMsg, toolResults) {
    const parts = [];

    // Keep any non-tool-call content from the assistant
    if (assistantMsg.content) {
      parts.push(assistantMsg.content);
    }

    // Summarize each tool call
    for (const tc of assistantMsg.tool_calls) {
      const name = tc.function?.name || 'unknown';
      let argsSummary = '';
      try {
        const args = JSON.parse(tc.function?.arguments || '{}');
        const argKeys = Object.keys(args);
        if (argKeys.length > 0) {
          // Show first arg value, truncated
          const firstVal = String(Object.values(args)[0] || '').slice(0, 60);
          argsSummary = argKeys.length === 1 ? `(${firstVal})` : `(${argKeys.length} args)`;
        }
      } catch {
        argsSummary = '(...)';
      }

      // Find matching result
      const result = toolResults.find(r => r.tool_call_id === tc.id);
      const resultPreview = result
        ? String(result.content || '').slice(0, 80).replace(/\n/g, ' ')
        : 'no result';

      parts.push(`[Used ${name}${argsSummary} → ${resultPreview}]`);
    }

    return parts.join('\n');
  }

  /**
   * Count how many tool pairs were collapsed (for stats).
   */
  _countCollapsed(original, pruned) {
    let count = 0;
    for (const msg of original) {
      if (msg.role === 'assistant' && msg.tool_calls) {
        count += msg.tool_calls.length;
      }
    }
    return count;
  }

  /**
   * Hard-truncate messages to fit within budget.
   * Keeps the most recent messages, drops oldest.
   */
  _hardTruncate(messages, budget) {
    const result = [];
    let tokens = 0;

    // Walk from the end (most recent) backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(messages[i].content || '', 'code');
      if (tokens + msgTokens > budget) break;
      result.unshift(messages[i]);
      tokens += msgTokens;
    }

    return result;
  }

  /**
   * Compress system prompt to fit within budget.
   */
  _compressSystemPrompt(prompt, budget) {
    const tokens = estimateTokens(prompt, 'prose');
    if (tokens <= budget) return prompt;

    // Split into sections and keep critical ones
    const sections = prompt.split(/\n\n+/);
    const critical = [];
    const optional = [];

    for (const section of sections) {
      const isCritical =
        section.includes('IDENTITY') ||
        section.includes('ENVIRONMENT') ||
        section.includes('TOOLS') ||
        section.includes('WORKFLOW') ||
        section.includes('CAPABILITIES');
      (isCritical ? critical : optional).push(section);
    }

    let compressed = critical.join('\n\n');
    let currentTokens = estimateTokens(compressed, 'prose');

    for (const section of optional) {
      const sectionTokens = estimateTokens(section, 'prose');
      if (currentTokens + sectionTokens <= budget) {
        compressed += '\n\n' + section;
        currentTokens += sectionTokens;
      }
    }

    return compressed + `\n\n[System prompt compressed: ${tokens} → ${currentTokens} tokens]`;
  }

  /**
   * Measure total tokens for a message array.
   */
  _measureMessages(messages) {
    return messages.reduce(
      (sum, m) => sum + estimateTokens(m.content || '', 'code'),
      0
    );
  }
}
