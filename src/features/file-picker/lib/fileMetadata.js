export const FILE_ICONS = {
  js: { bg: '#f7df1e', text: 'JS', color: '#000' },
  mjs: { bg: '#f7df1e', text: 'JS', color: '#000' },
  ts: { bg: '#3178c6', text: 'TS', color: '#fff' },
  jsx: { bg: '#61dafb', text: 'JSX', color: '#000' },
  tsx: { bg: '#61dafb', text: 'TSX', color: '#000' },
  py: { bg: '#3572A5', text: 'PY', color: '#fff' },
  lua: { bg: '#000080', text: 'LUA', color: '#fff' },
  rs: { bg: '#ce422b', text: 'RS', color: '#fff' },
  cpp: { bg: '#00599c', text: 'C++', color: '#fff' },
  c: { bg: '#555555', text: 'C', color: '#fff' },
  cs: { bg: '#178600', text: 'C#', color: '#fff' },
  go: { bg: '#00add8', text: 'GO', color: '#fff' },
  java: { bg: '#b07219', text: 'JAVA', color: '#fff' },
  html: { bg: '#e44d26', text: 'HTM', color: '#fff' },
  css: { bg: '#563d7c', text: 'CSS', color: '#fff' },
  json: { bg: '#cbcb41', text: '{}', color: '#000' },
  md: { bg: '#083fa1', text: 'MD', color: '#fff' },
  txt: { bg: '#888888', text: 'TXT', color: '#fff' },
};

export function getFileIcon(filename) {
  const extension = filename.split('.').pop()?.toLowerCase();
  return FILE_ICONS[extension] || { bg: '#666666', text: 'FILE', color: '#fff' };
}

export function getFileType(entry) {
  if (entry.type === 'dir') return 'Folder';
  const extension = entry.name.split('.').pop()?.toLowerCase();
  const types = {
    js: 'JS File',
    mjs: 'JS File',
    ts: 'TS File',
    jsx: 'JSX File',
    tsx: 'TSX File',
    py: 'Python File',
    lua: 'Lua File',
    rs: 'Rust File',
    cpp: 'C++ File',
    c: 'C File',
    cs: 'C# File',
    go: 'Go File',
    java: 'Java File',
    html: 'HTML File',
    css: 'CSS File',
    json: 'JSON File',
    md: 'Markdown',
    txt: 'Text File',
  };
  return types[extension] || 'File';
}

export function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, unitIndex)).toFixed(1))} ${units[unitIndex]}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${month} ${date.getDate()} ${time}`;
}
