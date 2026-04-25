import { useState, useCallback } from 'react';

/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Use `chatStore` from `src/lib/stores/chatStore.js` instead.
 * 
 * Migration guide:
 * ```js
 * // Old way:
 * import { useUIState } from '../hooks/useUIState';
 * const { uiState, toggleContextMenu, toggleModeMenu, closeAllMenus } = useUIState();
 * 
 * // New way:
 * import { useChatStore, POPUP_CONTEXT, POPUP_MODE, POPUP_MODEL } from '../lib/stores/chatStore';
 * const openPopup = useChatStore((s) => s.openPopup);
 * const openPopupMenu = useChatStore((s) => s.openPopupMenu);
 * const closePopup = useChatStore((s) => s.closePopup);
 * 
 * // Usage:
 * openPopupMenu(POPUP_CONTEXT, anchorRect); // Open context menu
 * openPopupMenu(POPUP_MODE, anchorRect);    // Open mode menu
 * openPopupMenu(POPUP_MODEL, anchorRect);   // Open model menu
 * closePopup();                              // Close all popups
 * 
 * // Check if open:
 * const isContextOpen = openPopup === POPUP_CONTEXT;
 * ```
 * 
 * @see src/lib/stores/chatStore.js for the new implementation
 */
export function useUIState() {
  const [uiState, setUIState] = useState({
    showContextMenu: false,
    showModeMenu: false,
    showModelMenu: false,
    showChatList: false
  });

  const toggleContextMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, showContextMenu: !prev.showContextMenu }));
  }, []);

  const toggleModeMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, showModeMenu: !prev.showModeMenu }));
  }, []);

  const toggleModelMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, showModelMenu: !prev.showModelMenu }));
  }, []);

  const toggleChatList = useCallback(() => {
    setUIState(prev => ({ ...prev, showChatList: !prev.showChatList }));
  }, []);

  const closeAllMenus = useCallback(() => {
    setUIState({
      showContextMenu: false,
      showModeMenu: false,
      showModelMenu: false,
      showChatList: false
    });
  }, []);

  return {
    uiState,
    toggleContextMenu,
    toggleModeMenu,
    toggleModelMenu,
    toggleChatList,
    closeAllMenus
  };
}
