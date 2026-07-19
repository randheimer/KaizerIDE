/**
 * Extracts lightweight documentation headings from a file so the AI can
 * orient itself inside large files quickly.
 *
 * - Markdown files: `# Heading`, `## Sub-heading`, etc. (first 10)
 * - Source files: the first `/**` JSDoc summary line per top-level block
 *   (first 5)
 *
 * Returned as `[{ text, line }]` — line is 1-indexed.
 */

const MAX_HEADINGS = 10;
const MAX_HEADING_LEN = 160;

export function extractHeadings(content, ext) {
  if (!content || typeof content !== 'string') return [];

  if (ext === '.md' || ext === '.markdown') {
    return extractMarkdownHeadings(content);
  }

  if (isJsLikeExt(ext)) {
    return extractJsDocHeadings(content);
  }

  return [];
}

function extractMarkdownHeadings(content) {
  const out = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length && out.length < MAX_HEADINGS; i++) {
    const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[i]);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim().slice(0, MAX_HEADING_LEN);
      if (text) out.push({ text: `${'#'.repeat(level)} ${text}`, line: i + 1 });
    }
  }
  return out;
}

function extractJsDocHeadings(content) {
  const out = [];
  // Match /** ... */ blocks and capture the first non-empty line inside.
  const regex = /\/\*\*([\s\S]*?)\*\//g;
  let match;
  while ((match = regex.exec(content)) !== null && out.length < 5) {
    const body = match[1];
    const firstLine = body
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .find((l) => l && !l.startsWith('@'));
    if (firstLine) {
      const line = lineOfOffset(content, match.index);
      out.push({ text: firstLine.slice(0, MAX_HEADING_LEN), line });
    }
  }
  return out;
}

function isJsLikeExt(ext) {
  return (
    ext === '.js' ||
    ext === '.jsx' ||
    ext === '.ts' ||
    ext === '.tsx' ||
    ext === '.mjs' ||
    ext === '.cjs'
  );
}

function lineOfOffset(content, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}
