import { indexer } from '../indexer';
import { estimateTokens } from './toolResultCompressor';

/**
 * Compress system prompt if it exceeds budget
 */
function compressSystemPrompt(prompt, budget = 3000) {
  const tokens = estimateTokens(prompt, 'prose');
  if (tokens <= budget) return prompt;
  
  // Extract sections
  const sections = prompt.split(/\n\n/);
  const critical = [];
  const optional = [];
  
  for (const section of sections) {
    if (section.includes('IDENTITY') || section.includes('ENVIRONMENT') || section.includes('TOOLS') || section.includes('WORKFLOW')) {
      critical.push(section);
    } else {
      optional.push(section);
    }
  }
  
  // Start with critical sections
  let compressed = critical.join('\n\n');
  let currentTokens = estimateTokens(compressed, 'prose');
  
  // Add optional sections if budget allows
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
 * Maps raw model ID to a human-friendly name with provider
 */
function formatModelName(modelId) {
  if (!modelId || typeof modelId !== 'string') return 'an advanced language model';
  const id = modelId.toLowerCase();
  if (id.includes('claude'))   return 'Claude, developed by Anthropic';
  if (id.includes('gpt'))      return 'GPT, developed by OpenAI';
  if (id.includes('gemini'))   return 'Gemini, developed by Google';
  if (id.includes('qwen'))     return 'Qwen, developed by Alibaba Cloud';
  if (id.includes('grok'))     return 'Grok, developed by xAI';
  if (id.includes('llama'))    return 'Llama, developed by Meta';
  if (id.includes('mistral'))  return 'Mistral, developed by Mistral AI';
  if (id.includes('deepseek')) return 'DeepSeek, developed by DeepSeek';
  if (id.includes('codex'))    return 'Codex, developed by OpenAI';
  return 'an advanced language model';
}

/**
 * Build system prompt with workspace context
 */
export function buildSystemPrompt(workspacePath, selectedModelId, systemPrompts = {}) {
  const workspaceName = workspacePath ? workspacePath.split(/[\\/]/).pop() : null;
  const platform = navigator.userAgent.includes('Windows') ? 'windows' : 'unix';
  const shellHint = platform === 'windows'
    ? 'Use Windows CMD syntax for commands (dir, del, move, rmdir /s /q, type)'
    : 'Use Unix shell syntax (ls, rm, mv, cat)';
  const modelName = formatModelName(selectedModelId || '');

  // Debug: log workspace path
  console.log('[Agent] Building system prompt with workspacePath:', workspacePath);

  // Get indexer status
  const indexerStatus = indexer.status;
  const indexerEnabled = indexer.enabled;
  const indexProgress = indexer.progress;
  const indexFileCount = indexer.index.length;

  let indexStatusMessage = '';
  if (indexerEnabled) {
    if (indexerStatus === 'indexing') {
      indexStatusMessage = `\n- Workspace Indexer: ⏳ INDEXING IN PROGRESS (${indexProgress}% complete, ${indexer.indexedFiles}/${indexer.totalFiles} files)\n  ⚠️ For optimal codebase awareness, suggest waiting until indexing completes if the user asks complex questions about the entire project.`;
    } else if (indexerStatus === 'ready') {
      indexStatusMessage = `\n- Workspace Indexer: ✅ READY (${indexFileCount} files indexed)\n  You have instant access to the entire codebase structure, file types, and key symbols.`;
    } else if (indexerStatus === 'error') {
      indexStatusMessage = `\n- Workspace Indexer: ❌ ERROR\n  Indexing failed. You can still use file tools to explore the codebase manually.`;
    } else {
      indexStatusMessage = `\n- Workspace Indexer: ⏸️ NOT INDEXED\n  Indexing hasn't started yet. You can still use file tools to explore the codebase manually.`;
    }
  } else {
    indexStatusMessage = `\n- Workspace Indexer: 🔕 DISABLED\n  User has disabled workspace indexing. Use file tools to explore the codebase manually.`;
  }

  const basePrompt = `You are KaizerIDE — an AI coding assistant with direct filesystem and tool access.

IDENTITY: KaizerIDE powered by ${modelName}. If asked about model details, keep it simple.

ENVIRONMENT:
- Platform: ${platform} | Shell: ${shellHint}
- Workspace: ${workspacePath ? `"${workspaceName}"` : '⚠️ NO WORKSPACE'}${indexStatusMessage}

${!workspacePath ? `
⚠️ NO WORKSPACE: Ask user to open a folder via File → Open Folder.
` : `✅ WORKSPACE: "${workspaceName}" at ${workspacePath}`}

TOOLS: read_file, write_file, list_directory, search_index, grep_index, get_index_summary, search_files, run_command (requires permission)

WORKSPACE INDEXING AWARENESS:
${indexerStatus === 'indexing' ? `⏳ Indexing in progress (${indexProgress}%). For broad codebase questions, suggest waiting or proceed with file tools.` : indexerStatus === 'ready' ? `✅ Index ready (${indexFileCount} files). ${indexFileCount > 140 ? 'LARGE PROJECT: Context is truncated. Use search_index/grep_index tools to discover files before reading them.' : 'Use search_index/grep_index first, then read_file if needed.'}` : indexerStatus === 'error' ? `❌ Indexing failed. Use file tools manually.` : indexerEnabled ? `⏸️ Indexing not started. Use file tools.` : `🔕 Indexing disabled. Use file tools.`}

WORKFLOW: Understand → Analyze → Plan → Implement → Verify
- ${indexFileCount > 140 ? 'IMPORTANT: For large projects, always use search_index or grep_index BEFORE reading files' : 'Read files before editing'}
- Match existing code style
- Make minimal changes
- Use <think>...</think> for complex tasks

COMMUNICATION: Professional, concise, action-oriented. Show code in fenced blocks with language tags. List changed files briefly.`;

  // Get custom instructions first
  const customInstructions = systemPrompts[selectedModelId] || '';
  
  let finalPrompt = basePrompt;
  
  // Add custom instructions if present
  if (customInstructions) {
    finalPrompt += `\n\n─── CUSTOM INSTRUCTIONS ───\n${customInstructions}`;
  }
  
  // Compress system prompt to save tokens
  return compressSystemPrompt(finalPrompt, 3000);
}
