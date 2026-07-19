/**
 * Shared helpers used by individual tool renderers.
 */

const LANG_MAP = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  cpp: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  c: 'c',
  h: 'c',
  cs: 'csharp',
  java: 'java',
  go: 'go',
  rs: 'rust',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  lua: 'lua',
  css: 'css',
  scss: 'scss',
  html: 'html',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  ps1: 'powershell',
  sql: 'sql',
  toml: 'toml',
};

export function getLanguageFromFilename(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  return LANG_MAP[ext] || 'text';
}

export function basename(p = '') {
  return p.split(/[\\/]/).pop() || p;
}

/**
 * Shared Prism highlighter options used across tool renderers so they look
 * identical (gutter, font, background).
 */
export const codeBlockStyle = {
  margin: 0,
  borderRadius: 0,
  fontSize: '11px',
  background: 'var(--bg-0, #0d0d0d)',
  maxHeight: '400px',
  overflow: 'auto',
};

export const codeTagStyle = {
  fontFamily: 'var(--font-mono, monospace)',
  lineHeight: '1.4',
};
