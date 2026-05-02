/**
 * InlineCompletionProvider - Copilot-style ghost text completions
 * Registers with Monaco's InlineCompletionsProvider API
 */

import { streamChat } from '../api/index.js';

let abortController = null;
let lastRequestTime = 0;
const DEBOUNCE_MS = 500;
const MAX_CONTEXT_LINES = 50;
const MAX_PREFIX_LINES = 20;

/**
 * Create and register the inline completion provider with Monaco
 * @param {monaco} monaco - Monaco instance
 * @param {Function} getSettings - Returns current workspace settings
 * @returns {IDisposable} Disposable to unregister the provider
 */
export function registerInlineCompletionProvider(monaco, getSettings) {
  const provider = {
    provideInlineCompletions: async (model, position, context, token) => {
      // Check if inline completions are enabled
      const settings = getSettings();
      if (!settings?.inlineCompletions) return { items: [] };

      // Debounce
      const now = Date.now();
      if (now - lastRequestTime < DEBOUNCE_MS) return { items: [] };
      lastRequestTime = now;

      // Abort previous request
      if (abortController) abortController.abort();
      abortController = new AbortController();

      try {
        // Get context around cursor
        const fullContent = model.getValue();
        const offset = model.getOffsetAt(position);
        const prefix = fullContent.substring(0, offset);
        const suffix = fullContent.substring(offset);

        // Limit context size
        const prefixLines = prefix.split('\n');
        const contextPrefix = prefixLines.slice(-MAX_PREFIX_LINES).join('\n');
        const suffixLines = suffix.split('\n');
        const contextSuffix = suffixLines.slice(0, MAX_CONTEXT_LINES).join('\n');

        const language = model.getLanguageId();
        const fileName = model.uri?.path?.split('/').pop() || 'untitled';

        // Build prompt for completion
        const messages = [
          {
            role: 'system',
            content: `You are a code completion assistant. Complete the code at the cursor position. Return ONLY the completion text - no explanations, no markdown, no code fences. The completion should seamlessly continue from where the cursor is. Match the existing code style and indentation.`
          },
          {
            role: 'user',
            content: `File: ${fileName} (${language})

Code before cursor:
\`\`\`${language}
${contextPrefix}
\`\`\`

Code after cursor:
\`\`\`${language}
${contextSuffix}
\`\`\`

Complete the code at the cursor position. Return only the completion text.`
          }
        ];

        let completion = '';
        await streamChat({
          messages,
          settings: {
            ...settings,
            selectedModel: settings.selectedModel || settings.models?.[0],
          },
          onToken: (token) => {
            completion += token;
          },
          onDone: () => {},
          signal: abortController.signal,
        });

        if (token.isCancellationRequested || !completion.trim()) {
          return { items: [] };
        }

        // Clean up completion - remove leading/trailing whitespace artifacts
        completion = completion.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
        // Remove any leading text that matches what's already there
        const trimmedCompletion = completion.trimStart();

        return {
          items: [{
            insertText: trimmedCompletion,
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
            detail: 'AI Completion',
          }]
        };
      } catch (err) {
        if (err.name === 'AbortError') return { items: [] };
        console.error('[InlineCompletion] Error:', err);
        return { items: [] };
      }
    },

    freeInlineCompletions: () => {},
  };

  return monaco.languages.registerInlineCompletionsProvider('*', provider);
}
