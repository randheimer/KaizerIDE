/**
 * RelevanceScorer
 *
 * Scores indexed files for relevance to the current conversation,
 * going beyond simple keyword matching. Considers:
 *   1. Query text match (delegated to SearchEngine)
 *   2. Files already mentioned in conversation (deprioritize duplicates)
 *   3. Files attached via context pills (boost)
 *   4. File type relevance to the query
 *   5. Recency of indexing
 *
 * Used by ExecutorAgent to select the most useful files to inject
 * into the AI's context before the first API call.
 */

import { estimateTokens } from './toolResultCompressor';

/** Maximum tokens to spend on injected index context */
const INDEX_CONTEXT_BUDGET = 2500;

/** Maximum number of files to inject */
const MAX_FILES = 6;

/** Snippet lines to show around a match */
const SNIPPET_CONTEXT = 3;

export class RelevanceScorer {
  /**
   * @param {import('../indexer/search/SearchEngine').SearchEngine} searchEngine
   */
  constructor(searchEngine) {
    this.searchEngine = searchEngine;
  }

  /**
   * Build a relevance-ranked context block for the conversation.
   *
   * @param {string} query          The user's latest message text
   * @param {Array}  messages       Full conversation messages (to detect already-mentioned files)
   * @param {Array}  contextPills   User-attached context pills [{type, data}]
   * @param {object} indexer        The workspace indexer instance
   * @returns {string|null}         Context block to prepend, or null if nothing relevant
   */
  buildRelevantContext(query, messages = [], contextPills = [], indexer = null) {
    if (!query || !indexer) return null;

    const indexFiles = indexer.index || [];
    if (indexFiles.length === 0) return null;

    // Extract file paths already mentioned in conversation
    const mentionedFiles = this._extractMentionedFiles(messages);

    // Extract file paths from context pills
    const pillFiles = new Set(
      (contextPills || [])
        .filter(p => p.type === 'file' && p.data)
        .map(p => p.data)
    );

    // Search for relevant files
    const searchResults = this.searchEngine.search(query, MAX_FILES * 3);

    // Score and rank
    const scored = searchResults.map(file => {
      let score = this.searchEngine.scorer.score(file, this.searchEngine.queryParser.parse(query));

      // Boost: files attached via context pills (user explicitly wants these)
      if (pillFiles.has(file.path)) {
        score += 15;
      }

      // Penalty: files already heavily mentioned in conversation
      const mentionCount = mentionedFiles.get(file.path) || 0;
      if (mentionCount > 2) {
        score -= 5; // Already well-covered in conversation
      } else if (mentionCount > 0) {
        score += 2; // Mentioned once — probably relevant, slight boost
      }

      // Boost: recently indexed files (more likely to be actively worked on)
      if (file.indexed) {
        const age = Date.now() - file.indexed;
        if (age < 60_000) score += 3; // Indexed in last minute
      }

      // Boost: files with more symbols (richer context)
      if (file.symbols && file.symbols.length > 3) {
        score += 2;
      }

      return { file, score };
    });

    // Sort by score, deduplicate, take top N
    scored.sort((a, b) => b.score - a.score);

    const seen = new Set();
    const selected = [];
    for (const { file } of scored) {
      if (seen.has(file.path)) continue;
      seen.add(file.path);
      selected.push(file);
      if (selected.length >= MAX_FILES) break;
    }

    if (selected.length === 0) return null;

    // Build context block within token budget
    return this._buildContextBlock(selected, query);
  }

  /**
   * Extract file paths mentioned in conversation messages.
   * Returns a Map<path, mentionCount>.
   */
  _extractMentionedFiles(messages) {
    const counts = new Map();

    // Patterns that look like file paths
    const pathPattern = /(?:^|\s|["'`])([\w./\\-]+\.(?:js|jsx|ts|tsx|py|css|html|json|md|go|rs|java|cpp|c|h|lua|rb|php|sql|yml|yaml|sh|bat))(?:\s|["'`]|$)/gi;

    for (const msg of messages) {
      if (!msg.content) continue;
      const text = typeof msg.content === 'string' ? msg.content : '';

      // Look for file paths in content
      let match;
      while ((match = pathPattern.exec(text)) !== null) {
        const path = match[1].toLowerCase();
        counts.set(path, (counts.get(path) || 0) + 1);
      }

      // Also check tool call arguments for file paths
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          try {
            const args = JSON.parse(tc.function?.arguments || '{}');
            if (args.path) {
              const normalized = args.path.toLowerCase();
              counts.set(normalized, (counts.get(normalized) || 0) + 1);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }

    return counts;
  }

  /**
   * Build a compact context block from selected files.
   * Stays within INDEX_CONTEXT_BUDGET tokens.
   */
  _buildContextBlock(files, query) {
    const needle = query.toLowerCase();
    const lines = ['━━━ RELEVANT FILES FROM INDEX ━━━'];
    let totalTokens = estimateTokens(lines[0], 'prose');

    for (const file of files) {
      const symbols = (file.symbols || [])
        .slice(0, 5)
        .map(s => typeof s === 'string' ? s : s?.name)
        .filter(Boolean)
        .join(', ');

      const header = `• ${file.path} (${file.lines || 0}L) — ${symbols || 'no symbols'}`;
      const snippet = this._extractSnippet(file.preview, needle);

      const block = snippet ? `${header}\n${snippet}` : header;
      const blockTokens = estimateTokens(block, 'code');

      if (totalTokens + blockTokens > INDEX_CONTEXT_BUDGET) break;

      lines.push(block);
      totalTokens += blockTokens;
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
  }

  /**
   * Extract a short code snippet around the match location.
   */
  _extractSnippet(preview, needle) {
    if (!preview || typeof preview !== 'string') return '';

    const previewLines = preview.split('\n');
    const matchIdx = previewLines.findIndex(ln =>
      ln.toLowerCase().includes(needle)
    );

    let from, to;
    if (matchIdx !== -1) {
      from = Math.max(0, matchIdx - SNIPPET_CONTEXT);
      to = Math.min(previewLines.length, matchIdx + SNIPPET_CONTEXT + 1);
    } else {
      from = 0;
      to = Math.min(previewLines.length, 5);
    }

    const slice = previewLines.slice(from, to);
    if (slice.length === 0) return '';

    const width = String(to).length;
    return slice
      .map((ln, i) => `  ${String(from + 1 + i).padStart(width, ' ')}  ${ln}`)
      .join('\n');
  }
}
