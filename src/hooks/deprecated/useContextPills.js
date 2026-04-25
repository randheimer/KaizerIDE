import { useState, useCallback } from 'react';

/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Use `chatStore` from `src/lib/stores/chatStore.js` instead.
 * 
 * Migration guide:
 * ```js
 * // Old way:
 * import { useContextPills } from '../hooks/useContextPills';
 * const { contextPills, addContext, removeContext, clearContext } = useContextPills();
 * 
 * // New way:
 * import { useChatStore } from '../lib/stores/chatStore';
 * const contextPills = useChatStore((s) => s.contextPills);
 * const addContextPill = useChatStore((s) => s.addContextPill);
 * const removeContextPill = useChatStore((s) => s.removeContextPill);
 * const clearContextPills = useChatStore((s) => s.clearContextPills);
 * 
 * // Usage:
 * addContextPill({ type: 'file', data: '/path/to/file', id: Date.now() });
 * removeContextPill(pillId);
 * clearContextPills();
 * ```
 * 
 * @see src/lib/stores/chatStore.js for the new implementation
 */
export function useContextPills() {
  const [contextPills, setContextPills] = useState([]);

  const addContext = useCallback((type, data) => {
    setContextPills(prev => [...prev, { type, data, id: Date.now() }]);
  }, []);

  const removeContext = useCallback((id) => {
    setContextPills(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearContext = useCallback(() => {
    setContextPills([]);
  }, []);

  return {
    contextPills,
    addContext,
    removeContext,
    clearContext
  };
}
