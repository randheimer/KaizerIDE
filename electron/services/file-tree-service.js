import fs from 'node:fs';
import path from 'node:path';

export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'release',
  '__pycache__',
  '.vscode',
  '.idea',
]);

function parseGitignore(workspaceRoot) {
  const ignored = new Set();
  try {
    const content = fs.readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf-8');
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('!') || /[*?\[\]]/.test(line)) continue;
      const name = line.replace(/^\/+/, '').replace(/\/+$/, '');
      if (name && !name.includes('/')) ignored.add(name);
    }
  } catch {
    // Missing or unreadable .gitignore files are non-fatal.
  }
  return ignored;
}

export async function buildFileTree(dirPath, depth = 0, maxDepth = 7, ignoredSet = null) {
  if (depth > maxDepth) return null;
  const ignored =
    ignoredSet ??
    (depth === 0 ? new Set([...IGNORED_DIRS, ...parseGitignore(dirPath)]) : IGNORED_DIRS);

  try {
    const name = path.basename(dirPath);
    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) return { name, path: dirPath, type: 'file' };
    if (ignored.has(name)) return null;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const childResults = await Promise.all(
      entries.map(async (entry) => {
        if (ignored.has(entry.name)) return null;
        const childPath = path.join(dirPath, entry.name);
        if (entry.isFile()) return { name: entry.name, path: childPath, type: 'file' };
        return buildFileTree(childPath, depth + 1, maxDepth, ignored);
      })
    );

    const children = childResults.filter(Boolean).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });
    return { name, path: dirPath, type: 'dir', children, expanded: depth === 0 };
  } catch {
    return null;
  }
}
