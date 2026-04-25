/**
 * OpenAI-compatible API provider
 * Works with OpenAI, OpenRouter, local LLMs, and other OpenAI-compatible endpoints
 */
export async function streamChat({ messages, settings, onToken, onDone, signal }) {
  const { endpoint, apiKey, selectedModel } = settings;

  const systemPrompt = "You are KaizerIDE's AI coding assistant — an intelligent agent running inside a VS Code-style IDE built on Electron. CLIENT: KaizerIDE v0.1.0. Be direct and concise. Format code in fenced blocks. Match existing code style. Make surgical edits.";

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const body = {
    model: selectedModel.id,
    messages: apiMessages,
    stream: true,
    max_tokens: selectedModel.maxOutputTokens
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
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
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            fullContent += token;
            onToken(token);
          }
        } catch (e) {
          console.warn('Failed to parse SSE chunk:', e);
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
