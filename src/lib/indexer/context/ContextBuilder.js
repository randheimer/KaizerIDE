/**
 * Builds a compact "RELEVANT FILES FROM INDEX" block that gets prepended
 * to the user's last message before the agent runs. Contains file path,
 * line count, top symbols with line numbers, and a few lines of snippet
 * near the query hit so the model sees actual code — not just filenames.
 */

const SNIPPET_CONTEXT = 2; // lines around the matched line
const MAX_RESULTS = 5;
const MAX_SNIPPET_LINES = 6;

export class ContextBuilder {
  constructor(searchEngine) {
    this.searchEngine = searchEngine;
  }

  build(query) {
    if (!query || typeof query !== 'string') return null;

    const results = this.searchEngine.search(query, MAX_RESULTS);
    if (results.length === 0) return null;

    const needle = query.toLowerCase();
    const blocks = results.map((f) => formatResult(f, needle));
    return 'RELEVANT FILES FROM INDEX:\n' + blocks.join('\n\n');
  }
}

function formatResult(file, needle) {
  const symbols = Array.isArray(file.symbols)
    ? file.symbols
        .slice(0, 5)
        .map((s) => {
          if (!s) return null;
          if (typeof s === 'string') return s;
          return s.line ? `${s.name}:${s.line}` : s.name;
        })
        .filter(Boolean)
        .join(', ')
    : '';

  const header = `\u2022 ${file.path || 'unknown'} (${file.lines || 0} lines)`;

  const snippet = extractSnippet(file.preview, needle);
  return snippet ? `${header}\n${snippet}` : header;
}

function extractSnippet(preview, needle) {
  if (!preview || typeof preview !== 'string') return '';
  const lines = preview.split('\n');
  const matchIdx = lines.findIndex((ln) => ln.toLowerCase().includes(needle));
  let from;
  let to;
  if (matchIdx !== -1) {
    from = Math.max(0, matchIdx - SNIPPET_CONTEXT);
    to = Math.min(lines.length, matchIdx + SNIPPET_CONTEXT + 1);
  } else {
    from = 0;
    to = Math.min(lines.length, MAX_SNIPPET_LINES);
  }
  const slice = lines.slice(from, to);
  if (slice.length === 0) return '';
  const width = String(to).length;
  return slice
    .map((ln, i) => `    ${String(from + 1 + i).padStart(width, ' ')}  ${ln}`)
    .join('\n');
}
