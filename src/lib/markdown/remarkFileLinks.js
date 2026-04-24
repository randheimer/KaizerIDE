/**
 * remark-file-links
 *
 * Walks the remark AST once and turns filename-shaped text inside `text`
 * and `inlineCode` nodes into `file://` links. Replaces the three
 * regex-over-string passes previously done in ChatMessage.jsx, so:
 *   - linkification runs once per markdown parse instead of once per
 *     render;
 *   - it is safe against already-linked content (we only visit text /
 *     inlineCode nodes, never existing links).
 */

const EXT = [
  'txt', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'css', 'scss', 'less', 'html', 'json', 'md', 'mdx',
  'py', 'rb', 'go', 'rs', 'php', 'swift', 'kt', 'scala',
  'java', 'cs', 'cpp', 'cc', 'c', 'h', 'hpp', 'hxx',
  'lua', 'pl', 'pm', 'sh', 'bash', 'zsh', 'ps1', 'bat',
  'xml', 'yaml', 'yml', 'toml', 'ini', 'lock', 'env',
  'asm', 's', 'sql',
];

// Match a path-shaped token: optional dirs + filename.ext
// Accepts `/`, `\`, `.`, alnum, underscore, dash in path segments.
const PATH_REGEX = new RegExp(
  `([A-Za-z0-9_./\\\\-]+\\.(?:${EXT.join('|')}))`,
  'g'
);

export default function remarkFileLinks() {
  return (tree) => visit(tree);
}

function visit(node, parent, index) {
  if (!node || typeof node !== 'object') return;

  // Replace inline code text like `foo.js` with a link-wrapped inlineCode.
  if (node.type === 'inlineCode' && parent && typeof index === 'number') {
    const text = node.value || '';
    const m = PATH_REGEX.exec(text);
    PATH_REGEX.lastIndex = 0;
    if (m && m[0] === text) {
      parent.children.splice(index, 1, {
        type: 'link',
        url: `file://${text}`,
        title: null,
        data: { hProperties: { className: 'file-link-inline' } },
        children: [{ type: 'inlineCode', value: text }],
      });
      return;
    }
  }

  // Walk text nodes and split out any filename matches.
  if (node.type === 'text' && parent && typeof index === 'number') {
    const replaced = splitTextNode(node.value || '');
    if (replaced.length !== 1 || replaced[0].type !== 'text') {
      parent.children.splice(index, 1, ...replaced);
      return;
    }
  }

  if (node.children && node.children.length > 0) {
    // Walk children backwards because we may splice.
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      // Never descend into an existing link — preserves hand-authored
      // anchors like [foo](bar) unchanged.
      if (child.type === 'link') continue;
      visit(child, node, i);
    }
  }
}

function splitTextNode(value) {
  const parts = [];
  let lastIndex = 0;
  PATH_REGEX.lastIndex = 0;
  let match;

  while ((match = PATH_REGEX.exec(value)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // Guard against false positives like "3.14.abc" where the part before
    // the match is a number-dot; require the char before to be a boundary.
    const prev = value[start - 1];
    if (prev && /[A-Za-z0-9_]/.test(prev)) continue;

    if (start > lastIndex) {
      parts.push({ type: 'text', value: value.slice(lastIndex, start) });
    }
    const path = match[0];
    parts.push({
      type: 'link',
      url: `file://${path}`,
      title: null,
      data: { hProperties: { className: 'file-link-inline' } },
      children: [{ type: 'text', value: path }],
    });
    lastIndex = end;
  }

  if (parts.length === 0) {
    return [{ type: 'text', value }];
  }
  if (lastIndex < value.length) {
    parts.push({ type: 'text', value: value.slice(lastIndex) });
  }
  return parts;
}
