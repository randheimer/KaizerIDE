import path from 'node:path';

export function requireAbsolutePath(value, label = 'Path') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  if (!path.isAbsolute(value)) {
    throw new Error(`${label} must be absolute`);
  }
  return path.normalize(value);
}

export function isPathInside(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
