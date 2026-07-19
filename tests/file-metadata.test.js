import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  getFileIcon,
  getFileType,
} from '../src/features/file-picker/lib/fileMetadata.js';

test('file metadata helpers provide stable labels', () => {
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(getFileType({ type: 'dir', name: 'src' }), 'Folder');
  assert.equal(getFileType({ type: 'file', name: 'app.js' }), 'JS File');
  assert.equal(getFileIcon('unknown.bin').text, 'FILE');
});
