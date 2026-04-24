import React, { createContext, useContext, useMemo } from 'react';

/**
 * Shared data about the files changed in the current agent turn. Fed
 * from ChatPanel.filesChangedCard down to every inline FileLink so each
 * file reference in the AI's markdown can show +N/-M badges and expand
 * the proper diff on click, without prop-drilling through react-markdown.
 */
const FilesChangedContext = createContext({
  getFileStats: () => null,
  getFileDiffData: () => null,
  onOpenFile: null,
});

export function FilesChangedProvider({ card, onOpenFile, children }) {
  const value = useMemo(() => {
    const byPath = new Map();
    if (card && Array.isArray(card.files)) {
      for (const f of card.files) {
        if (f && f.path) byPath.set(f.path, f);
      }
    }

    const findMatch = (path) => {
      if (!path) return null;
      if (byPath.has(path)) return byPath.get(path);
      // Fall back to suffix matching so the AI can use either absolute
      // or relative paths in its prose.
      for (const [p, file] of byPath) {
        if (p.endsWith(path) || path.endsWith(p)) return file;
      }
      return null;
    };

    return {
      getFileStats: (path) => {
        const f = findMatch(path);
        if (!f) return null;
        return {
          added: f.addedLines || 0,
          removed: f.removedLines || 0,
          isNew: !!f.isNew,
        };
      },
      getFileDiffData: (path) => {
        const f = findMatch(path);
        if (!f) return null;
        const originalContent =
          card?.undoStack && Object.prototype.hasOwnProperty.call(card.undoStack, f.path)
            ? card.undoStack[f.path]
            : null;
        return {
          originalContent,
          newContent: f.content || '',
          isNewFile: !!f.isNew || originalContent === null,
          fileName: f.name || (f.path ? f.path.split(/[\\/]/).pop() : 'file'),
          resolvedPath: f.path,
        };
      },
      onOpenFile,
    };
  }, [card, onOpenFile]);

  return (
    <FilesChangedContext.Provider value={value}>
      {children}
    </FilesChangedContext.Provider>
  );
}

export function useFilesChanged() {
  return useContext(FilesChangedContext);
}
