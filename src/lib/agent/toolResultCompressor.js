const DEFAULT_TOKEN_SAVER = {
  enabled: true,
  targetTokenBudget: 2000,
  hardCharLimit: 8000,
  adaptiveMode: true,
  deduplicateLines: true,
  showCompressionBadge: true,
  perTool: {
    run_command: { budget: 2000, strategy: 'semantic' },
    read_file: { budget: 3000, strategy: 'structural' },
    search_files: { budget: 1500, strategy: 'grouped' },
    grep_index: { budget: 1500, strategy: 'grouped' },
    search_index: { budget: 1500, strategy: 'grouped' },
    list_directory: { budget: 800, strategy: 'capped' },
  },
};

const ERROR_PATTERN = /error|fail|fatal|exception|traceback|panic|abort|exit code [^0]|\[exit:\s*[^0\]]/i;
const WARNING_PATTERN = /warn|deprecated|todo|fixme/i;
const PROGRESS_PATTERN = /^\s*(\[?[=>.#\-\s]+\]?\s*)?\d{1,3}%|^\s*[|/\\-]\s*$|^\s*=+\s*$|^\s*-{4,}\s*$/;
const DIFF_PATTERN = /^diff --git |^index [a-f0-9]+\.\.|^--- |^\+\+\+ |^@@ /;

export function compressToolResult(toolName, args, result, settings = {}, contextBudgetRemaining = null) {
  const tokenSaver = normalizeSettings(settings);
  const raw = stringifyResult(result);

  if (!tokenSaver.enabled || !raw) {
    return raw;
  }

  const toolConfig = tokenSaver.perTool?.[toolName] || {};
  let budget = Number(toolConfig.budget || tokenSaver.targetTokenBudget || 2000);
  let strategy = toolConfig.strategy || selectStrategy(toolName);

  if (tokenSaver.adaptiveMode && Number.isFinite(contextBudgetRemaining) && contextBudgetRemaining < budget * 2) {
    budget = Math.max(400, Math.floor(budget / 2));
    if (strategy === 'structural') strategy = 'capped';
  }

  const originalTokens = estimateTokens(raw);
  const hardCharLimit = Number(tokenSaver.hardCharLimit || 8000);

  if (originalTokens <= budget && raw.length <= hardCharLimit) {
    return raw;
  }

  const normalized = tokenSaver.deduplicateLines ? deduplicateLines(raw) : raw;
  const compressed = applyStrategy(strategy, toolName, args || {}, normalized, budget);
  const capped = enforceCharLimit(compressed, hardCharLimit);
  const compressedTokens = estimateTokens(capped);

  if (compressedTokens >= originalTokens && raw.length <= hardCharLimit) {
    return raw;
  }

  return buildEnvelope({
    toolName,
    strategy,
    originalTokens,
    compressedTokens,
    originalLines: raw.split('\n').length,
    compressedLines: capped.split('\n').length,
    content: capped,
  });
}

export function estimateTokens(str, mode = 'code') {
  const text = stringifyResult(str);
  return Math.ceil(text.length / (mode === 'prose' ? 4.2 : 3.7));
}

function normalizeSettings(settings) {
  return {
    ...DEFAULT_TOKEN_SAVER,
    ...(settings || {}),
    perTool: {
      ...DEFAULT_TOKEN_SAVER.perTool,
      ...((settings && settings.perTool) || {}),
    },
  };
}

function stringifyResult(result) {
  if (typeof result === 'string') return result;
  if (result === null || result === undefined) return '';
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function selectStrategy(toolName) {
  if (toolName === 'run_command') return 'semantic';
  if (toolName === 'read_file') return 'structural';
  if (toolName === 'search_files' || toolName === 'grep_index' || toolName === 'search_index') return 'grouped';
  if (toolName === 'list_directory') return 'capped';
  return 'capped';
}

function deduplicateLines(text) {
  const lines = text.split('\n');
  const seen = new Set();
  const out = [];
  let similarCount = 0;
  let lastSignature = '';

  for (const line of lines) {
    const normalized = line.trim();
    const signature = normalized.replace(/\d+/g, '#').replace(/[a-f0-9]{8,}/gi, '#');

    if (normalized && seen.has(normalized)) {
      continue;
    }

    if (signature && signature === lastSignature) {
      similarCount++;
      continue;
    }

    if (similarCount > 0) {
      out.push(`[${similarCount} similar lines omitted]`);
      similarCount = 0;
    }

    if (normalized) seen.add(normalized);
    lastSignature = signature;
    out.push(line);
  }

  if (similarCount > 0) {
    out.push(`[${similarCount} similar lines omitted]`);
  }

  return out.join('\n');
}

function applyStrategy(strategy, toolName, args, text, budget) {
  if (strategy === 'semantic') return compressSemantic(text, budget);
  if (strategy === 'structural') return compressStructural(text, args, budget);
  if (strategy === 'grouped') return compressGrouped(text, budget);
  return compressCapped(text, budget, toolName);
}

function compressSemantic(text, budget) {
  const lines = text.split('\n');
  const targetChars = budget * 3.7;

  if (looksLikeDiff(lines)) {
    return compressDiff(lines, targetChars);
  }

  const required = [];
  const warnings = [];
  const normal = [];

  lines.forEach((line, index) => {
    if (ERROR_PATTERN.test(line)) {
      pushWithContext(required, lines, index, 3);
    } else if (WARNING_PATTERN.test(line)) {
      warnings.push(line);
    } else if (line.trim() && !PROGRESS_PATTERN.test(line)) {
      normal.push(line);
    }
  });

  const sections = [];
  sections.push(...uniqueLines(lines.slice(0, 12)));
  if (required.length > 0) sections.push('\n--- high-priority lines ---', ...uniqueLines(required));
  if (warnings.length > 0) sections.push('\n--- warnings ---', ...warnings.slice(0, 30));
  sections.push('\n--- tail ---', ...lines.slice(-30));

  const primary = uniqueLines(sections).join('\n');
  if (primary.length >= targetChars) return headTail(primary, targetChars);

  const remaining = normal.filter(line => !primary.includes(line)).slice(0, 80).join('\n');
  return [primary, remaining && '\n--- additional signal ---', remaining].filter(Boolean).join('\n');
}

function compressDiff(lines, targetChars) {
  const kept = [];
  let removedContext = 0;

  for (const line of lines) {
    if (DIFF_PATTERN.test(line) || line.startsWith('+') || line.startsWith('-')) {
      kept.push(line);
    } else if (line.trim()) {
      removedContext++;
    }

    if (kept.join('\n').length > targetChars) break;
  }

  if (removedContext > 0) kept.push(`[${removedContext} unchanged/context diff lines omitted]`);
  return headTail(kept.join('\n'), targetChars);
}

function compressStructural(text, args, budget) {
  const lines = text.split('\n');
  const targetChars = budget * 3.7;
  const anchors = [];
  const importPattern = /^\s*(import|export|const .* = require\(|let .* = require\(|var .* = require\(|from\s+\S+\s+import|#include|using\s+)/;
  const symbolPattern = /^\s*(export\s+)?(async\s+)?(function|class|const|let|var)\s+[A-Za-z_$][\w$]*|^\s*(public|private|protected)?\s*(static\s+)?[\w<>[\],\s]+\s+[A-Za-z_$][\w$]*\s*\([^)]*\)\s*[{;]?/;

  lines.slice(0, 40).forEach((line, index) => {
    if (index < 8 || importPattern.test(line)) anchors.push(formatLine(index + 1, line));
  });

  lines.forEach((line, index) => {
    if (symbolPattern.test(line)) anchors.push(formatLine(index + 1, line));
  });

  const fromLine = Number(args.fromLine || args.line || args.startLine);
  const toLine = Number(args.toLine || args.endLine);
  if (Number.isFinite(fromLine)) {
    const start = Math.max(0, fromLine - 8);
    const end = Math.min(lines.length, Number.isFinite(toLine) ? toLine + 7 : fromLine + 25);
    anchors.push('\n--- requested range context ---');
    lines.slice(start, end).forEach((line, index) => anchors.push(formatLine(start + index + 1, line)));
  }

  const content = uniqueLines(anchors).join('\n') || headTail(text, targetChars);
  return `${headTail(content, targetChars)}\n[${Math.max(0, lines.length - content.split('\n').length)} lines omitted. Use read_file with fromLine/toLine to retrieve a specific section.]`;
}

function compressGrouped(text, budget) {
  const lines = text.split('\n');
  const targetChars = budget * 3.7;
  const groups = [];
  let current = null;

  for (const line of lines) {
    const isHeader = line.trim() && !line.startsWith(' ') && !line.startsWith('\t') && (line.includes('/') || line.includes('\\') || line.includes(':'));
    if (isHeader) {
      current = { header: line, matches: [] };
      groups.push(current);
    } else if (current) {
      current.matches.push(line);
    } else {
      groups.push({ header: line, matches: [] });
    }
  }

  const topGroups = groups.slice(0, 20).map(group => {
    const matches = group.matches.filter(line => line.trim()).slice(0, 6);
    return [group.header, ...matches].join('\n');
  });

  const omittedGroups = Math.max(0, groups.length - topGroups.length);
  const output = topGroups.join('\n\n') + (omittedGroups ? `\n\n[${omittedGroups} more result groups omitted]` : '');
  return headTail(output, targetChars);
}

function compressCapped(text, budget, toolName) {
  const lines = text.split('\n');
  const maxLines = toolName === 'list_directory' ? 80 : Math.max(40, Math.floor(budget / 12));
  const output = lines.slice(0, maxLines).join('\n');
  const omitted = Math.max(0, lines.length - maxLines);
  return omitted ? `${output}\n[${omitted} more lines omitted]` : output;
}

function buildEnvelope({ toolName, strategy, originalTokens, compressedTokens, originalLines, compressedLines, content }) {
  const omittedLines = Math.max(0, originalLines - compressedLines);
  return `[TOKEN SAVER - original: ~${formatNumber(originalTokens)} tokens -> compressed: ~${formatNumber(compressedTokens)} tokens]
strategy: ${strategy} | tool: ${toolName} | omitted: ${formatNumber(omittedLines)} lines

--- COMPRESSED OUTPUT ---
${content}
--- END ---

Model guidance: High-priority signal retained. To retrieve omitted sections use read_file with fromLine/toLine, or re-run the tool with a narrower scope.`;
}

function looksLikeDiff(lines) {
  return lines.some(line => line.startsWith('diff --git ') || line.startsWith('@@ '));
}

function pushWithContext(out, lines, index, radius) {
  const start = Math.max(0, index - radius);
  const end = Math.min(lines.length, index + radius + 1);
  out.push(...lines.slice(start, end));
}

function uniqueLines(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const key = String(line);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function headTail(text, targetChars) {
  if (text.length <= targetChars) return text;
  const half = Math.max(500, Math.floor((targetChars - 120) / 2));
  return `${text.slice(0, half)}\n\n[...${formatNumber(text.length - half * 2)} chars omitted... ]\n\n${text.slice(-half)}`;
}

function enforceCharLimit(text, hardCharLimit) {
  if (!hardCharLimit || text.length <= hardCharLimit) return text;
  return headTail(text, hardCharLimit);
}

function formatLine(lineNumber, line) {
  return `${String(lineNumber).padStart(5, ' ')}  ${line}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}
