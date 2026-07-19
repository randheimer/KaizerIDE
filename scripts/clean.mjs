import { rm } from 'node:fs/promises';

const generatedDirectories = ['dist', 'release', 'release-final', 'coverage'];
await Promise.all(
  generatedDirectories.map((directory) => rm(directory, { recursive: true, force: true }))
);
console.log(`Removed generated directories: ${generatedDirectories.join(', ')}`);
