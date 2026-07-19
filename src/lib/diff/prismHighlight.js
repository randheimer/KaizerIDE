/**
 * Tiny Prism wrapper for per-line syntax highlighting.
 *
 * We can't reuse the `<SyntaxHighlighter>` component for diffs because
 * we render one line at a time inside a grid layout. So we call
 * `Prism.highlight()` directly and drop the resulting HTML into a span
 * via dangerouslySetInnerHTML. The token classes are styled by scoped
 * CSS at `.inline-diff-prism .token.*`.
 */

import Prism from 'prismjs';
// Load the language grammars we care about. Order matters for the ones
// that depend on others (jsx needs javascript; tsx needs jsx; etc.).
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';

const LANG_ALIAS = {
  // Extensions
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  svg: 'markup',
  vue: 'markup',
  rs: 'rust',
  // Full language names used by getLanguageFromFilename output.
  // Most are identity; the ones that need mapping point at the grammar
  // that actually exists in our bundle.
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  bash: 'bash',
  yaml: 'yaml',
  markdown: 'markdown',
  rust: 'rust',
  go: 'go',
  java: 'java',
  json: 'json',
  css: 'css',
  scss: 'css',
  less: 'css',
  // Not bundled → fall back to a near-match grammar.
  cpp: 'clike',
  c: 'clike',
  csharp: 'clike',
  kotlin: 'java',
  swift: 'clike',
  lua: 'clike',
  powershell: 'bash',
  sql: 'clike',
  toml: 'yaml',
  php: 'clike',
  ruby: 'python',
  // Plain text — skip highlighting.
  text: null,
  txt: null,
  plaintext: null,
};

export function resolveLang(lang) {
  if (!lang) return null;
  const lower = String(lang).toLowerCase();
  // Use `in` so explicit `null` entries (e.g. 'text') short-circuit to
  // the fallback-escape path rather than re-looking up 'text' grammar.
  if (lower in LANG_ALIAS) return LANG_ALIAS[lower];
  return lower;
}

/**
 * Highlight a single line of code. Returns an HTML string with Prism
 * token spans. Safe against missing grammars — falls back to escaped
 * plain text.
 */
export function highlightLine(code, lang) {
  if (code == null) return '';
  const resolved = resolveLang(lang);
  const grammar = resolved ? Prism.languages[resolved] : null;
  if (!grammar) return escapeHtml(code);
  try {
    return Prism.highlight(code, grammar, resolved);
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
