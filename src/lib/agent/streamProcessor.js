/**
 * Consume SSE stream and accumulate content + tool calls + thinking
 */
export async function consumeStream(response, onToken, onThinkingToken, alreadyStartedThinking = false) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let mainContent = '';
  let fullThinking = '';
  let thinkBuffer = '';
  let inThink = false;
  let hasStartedThinking = alreadyStartedThinking;
  let toolCallMap = {};
  
  console.log('[StreamProcessor] Starting stream consumption');
  
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
          const delta = parsed?.choices?.[0]?.delta;
          
          if (!delta) continue;
          
          // Method 1: reasoning_content field (OpenAI-compatible)
          if (delta.reasoning_content) {
            if (!hasStartedThinking) {
              console.log('[StreamProcessor] 🧠 Thinking started (reasoning_content)');
              hasStartedThinking = true;
            }
            fullThinking += delta.reasoning_content;
            if (onThinkingToken) onThinkingToken(delta.reasoning_content);
          }
          
          // Method 2: thinking delta type (Anthropic-style via proxy)
          if (delta.type === 'thinking' || delta.thinking) {
            if (!hasStartedThinking) {
              console.log('[StreamProcessor] 🧠 Thinking started (thinking delta)');
              hasStartedThinking = true;
            }
            const thinkingText = delta.thinking || '';
            fullThinking += thinkingText;
            if (onThinkingToken) onThinkingToken(thinkingText);
          }
          
          // Method 3: <think> tags inside content - parse character by character
          if (delta.content) {
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
                    console.log('[StreamProcessor] 🧠 Thinking started (<think> tag)');
                    onThinkingToken('__START__');
                    hasStartedThinking = true;
                  } else if (onThinkingToken && hasStartedThinking) {
                    // New thinking block after previous one ended
                    console.log('[StreamProcessor] 🧠 Thinking started (<think> tag) - new block');
                    onThinkingToken('__START__');
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
                  console.log('[StreamProcessor] ✅ Thinking completed (</think> tag)');
                  const parts = thinkBuffer.split('</think>');
                  const thinkContent = parts[0];
                  if (thinkContent) {
                    fullThinking += thinkContent;
                    if (onThinkingToken) onThinkingToken(thinkContent);
                  }
                  if (onThinkingToken) onThinkingToken('__END__');
                  inThink = false;
                  hasStartedThinking = false; // Reset for next thinking block
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
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!tc) continue;
              const idx = tc.index;
              if (idx === undefined || idx === null) continue;
              
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
  
  if (fullThinking) {
    console.log('[StreamProcessor] ✅ Thinking completed. Total length:', fullThinking.length, 'characters');
  }
  
  console.log('[StreamProcessor] Stream consumption complete. Content length:', mainContent.length, 'Tool calls:', toolCallsArray.length);
  
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
