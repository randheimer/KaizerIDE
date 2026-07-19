import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for tracking file changes via custom events.
 * 
 * Listens to 'kaizer:file-written' events and maintains a list of modified files
 * with their metadata. Useful for displaying file change indicators and managing
 * file modification state in the UI.
 * 
 * @returns {Object} File changes state and management functions
 * @returns {Array} fileChanges - Array of file change records with path, type, content, timestamp
 * @returns {Function} trackFileChange - Manually track a file change
 * @returns {Function} clearFileChanges - Clear all tracked changes
 * @returns {Function} getFileChange - Get change record for a specific file path
 * 
 * @example
 * const { fileChanges, trackFileChange, clearFileChanges } = useFileChanges();
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
