import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWindowsPath } from '../src/shared/lib/path.js';

test('normalizeWindowsPath converts separators', () => {
  assert.equal(normalizeWindowsPath('C:/work/file.js'), 'C:\\work\\file.js');
  assert.equal(normalizeWindowsPath(''), '');
});
