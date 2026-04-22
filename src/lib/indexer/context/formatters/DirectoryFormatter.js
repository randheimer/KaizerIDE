import { MAX_FILES_IN_DIR_PREVIEW } from '../../config/constants';

/**
 * Formats directory structure for display
 */
export class DirectoryFormatter {
  format(dirs, maxDirs = 15) {
    return Object.entries(dirs)
      .slice(0, maxDirs)
      .map(([dir, files]) => {
        const fileList = files.slice(0, MAX_FILES_IN_DIR_PREVIEW).join(', ');
        const remaining = files.length > MAX_FILES_IN_DIR_PREVIEW 
          ? ` +${files.length - MAX_FILES_IN_DIR_PREVIEW} more` 
          : '';
        return `  ${dir}/: ${fileList}${remaining}`;
      });
  }

  groupByDirectory(indexStore) {
    const dirs = {};
    indexStore.forEach(f => {
      if (!f || !f.dir || !f.name) return;
      if (!dirs[f.dir]) dirs[f.dir] = [];
      dirs[f.dir].push(f.name);
    });
    return dirs;
  }
}
