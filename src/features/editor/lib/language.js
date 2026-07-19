const LANGUAGE_BY_EXTENSION = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  css: 'css',
  scss: 'scss',
  html: 'html',
  json: 'json',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  vcxproj: 'xml',
  sln: 'sln',
  props: 'xml',
  targets: 'xml',
  csproj: 'xml',
  vbproj: 'xml',
  filters: 'xml',
  user: 'xml',
  sh: 'shell',
  bat: 'bat',
  cmd: 'bat',
  lua: 'lua',
  rs: 'rust',
  go: 'go',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  h: 'cpp',
  c: 'c',
  cs: 'csharp',
  java: 'java',
  php: 'php',
  rb: 'ruby',
  sql: 'sql',
  txt: 'plaintext',
  log: 'plaintext',
};

export function getLanguageFromPath(filePath = '') {
  const fileName = filePath.split(/[\\/]/).pop().toLowerCase();
  if (fileName.endsWith('.vcxproj.filters') || fileName.endsWith('.vcxproj.user')) {
    return 'xml';
  }
  const extension = fileName.split('.').pop().toLowerCase();
  return LANGUAGE_BY_EXTENSION[extension] || 'plaintext';
}
