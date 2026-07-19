/**
 * Anthropic API provider
 * Native support for Claude models via Anthropic's API
 */
export async function streamChat({ messages, settings, onToken, onDone, signal }) {
  const { endpoint, apiKey, selectedModel } = settings;

  const systemPrompt = "You are KaizerIDE's AI coding assistant — an intelligent agent running inside an IDE built on Electron. CLIENT: KaizerIDE v0.1.0. Be direct and concise. Format code in fenced blocks. Match existing code style. Make surgical edits.";

  // Anthropic expects system message separately
  const anthropicMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));

  const body = {
    model: selectedModel.id,
    messages: anthropicMessages,
    system: systemPrompt,
    stream: true,
    max_tokens: selectedModel.maxOutputTokens
  };

  const headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01'
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  try {
    const apiEndpoint = endpoint || 'https://api.anthropic.com/v1';
    const response = await fetch(`${apiEndpoint}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

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
        
        try {
          const parsed = JSON.parse(data);
          
          // Handle different event types
          if (parsed.type === 'content_block_delta') {
            const token = parsed.delta?.text;
            if (token) {
              fullContent += token;
              onToken(token);
            }
          }
        } catch (e) {
          console.warn('Failed to parse Anthropic SSE chunk:', e);
        }
      }
    }

    onDone(fullContent);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request cancelled');
    }
    throw error;
  }
}
