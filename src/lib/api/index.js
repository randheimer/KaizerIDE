/**
 * Main API router - delegates to the appropriate provider
 */
import * as openaiCompatible from './providers/openai-compatible.js';
import * as anthropic from './providers/anthropic.js';

const providers = {
  'openai-compatible': openaiCompatible,
  'anthropic': anthropic
};

/**
 * Stream chat completion using the configured provider
 * @param {Object} params
 * @param {Array} params.messages - Chat messages
 * @param {Object} params.settings - Settings object with provider, endpoint, apiKey, selectedModel
 * @param {Function} params.onToken - Called with each token
 * @param {Function} params.onDone - Called when stream completes
 * @param {AbortSignal} params.signal - Abort signal
 */
export async function streamChat({ messages, settings, onToken, onDone, signal }) {
  const provider = settings.provider || 'openai-compatible';
  
  if (!providers[provider]) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  return providers[provider].streamChat({
    messages,
    settings,
    onToken,
    onDone,
    signal
  });
}
