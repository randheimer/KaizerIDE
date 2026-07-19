import { useState, useEffect, useCallback } from 'react';

/**
 * @deprecated This file has been moved to `./events/useFileChanges.js`
 * Please update your imports:
 * 
 * ```js
 * // Old:
 * import { useFileChanges } from './hooks/useFileChanges';
 * 
 * // New:
 * import { useFileChanges } from './hooks/events';
 * // or
 * import { useFileChanges } from './hooks';
 * ```
 */
export function useFileChanges() {
  const [fileChanges, setFileChanges] = useState([]);

  useEffect(() => {
    const handleFileWritten = (event) => {
      const { path, type, content } = event.detail;
      setFileChanges(prev => {
        const existingIndex = prev.findIndex(f => f.path === path);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { path, type, content, timestamp: Date.now() };
          return updated;
        } else {
          return [...prev, { path, type, content, timestamp: Date.now() }];
        }
      });
    };

    window.addEventListener('kaizer:file-written', handleFileWritten);
    
    return () => {
      window.removeEventListener('kaizer:file-written', handleFileWritten);
    };
  }, []);

  const trackFileChange = useCallback((filePath, toolName) => {
    if (toolName === 'write-file' || toolName === 'write_file' || 
        toolName === 'replace_string_in_file' || toolName === 'insert_edit_into_file') {
      if (filePath) {
        setFileChanges(prev => {
          const existing = prev.find(f => f.path === filePath);
          if (existing) {
            return prev.map(f => f.path === filePath ? { ...f, timestamp: Date.now() } : f);
          }
          return [...prev, { path: filePath, timestamp: Date.now(), type: toolName }];
        });
      }
    }
  }, []);

  const clearFileChanges = useCallback(() => {
    setFileChanges([]);
  }, []);

  const getFileChange = useCallback((filePath) => {
    return fileChanges.find(f => f.path === filePath);
  }, [fileChanges]);

  return {
    fileChanges,
    trackFileChange,
    clearFileChanges,
    getFileChange
  };
}
