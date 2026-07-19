export function normalizeWindowsPath(value) {
  if (!value) return value;
  return value.replace(/\//g, '\\');
}
