import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing chat history persistence.
 * 
 * Handles loading, saving, and managing chat sessions with workspace-scoped storage.
 * Uses Electron IPC for file system persistence.
 * 
 * @param {string} workspacePath - The current workspace path for scoping chat history
 * @returns {Object} Chat history state and management functions
 * @returns {Array} chatHistory - Array of saved chat sessions
 * @returns {string|null} currentChatId - ID of the currently active chat
 * @returns {boolean} isLoading - Loading state for initial history fetch
 * @returns {Function} saveChat - Save or update a chat session
 * @returns {Function} loadChat - Load a specific chat by ID
 * @returns {Function} deleteChat - Delete a chat session
 * @returns {Function} newChat - Start a new chat session
 * 
 * @example
 * const { chatHistory, saveChat, loadChat } = useChatHistory(workspacePath);
 */
export function useChatHistory(workspacePath) {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!workspacePath) return;
      
      setIsLoading(true);
      try {
        const result = await window.electron.loadChatHistory(workspacePath);
        if (result.success) {
          setChatHistory(result.data);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistory();
  }, [workspacePath]);

  const saveChat = useCallback(async (messages) => {
    if (messages.length === 0 || !workspacePath) return;
    
    const chatTitle = messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Chat';
    const timestamp = Date.now();
    
    let updatedHistory;
    
    if (currentChatId) {
      // Update existing chat
      updatedHistory = chatHistory.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages, title: chatTitle, timestamp }
          : chat
      );
    } else {
      // Create new chat
      const newChat = {
        id: timestamp,
        title: chatTitle,
        messages,
        timestamp
      };
      setCurrentChatId(timestamp);
      updatedHistory = [newChat, ...chatHistory].slice(0, 50); // Keep last 50 chats
    }
    
    setChatHistory(updatedHistory);
    await window.electron.saveChatHistory(updatedHistory, workspacePath);
  }, [chatHistory, currentChatId, workspacePath]);

  const loadChat = useCallback((chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      return chat.messages;
    }
    return null;
  }, [chatHistory]);

  const deleteChat = useCallback(async (chatId) => {
    const updatedHistory = chatHistory.filter(c => c.id !== chatId);
    setChatHistory(updatedHistory);
    await window.electron.saveChatHistory(updatedHistory, workspacePath);
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      return true; // Signal to reset current chat
    }
    return false;
  }, [chatHistory, currentChatId, workspacePath]);

  const newChat = useCallback(() => {
    setCurrentChatId(null);
  }, []);

  return {
    chatHistory,
    currentChatId,
    isLoading,
    saveChat,
    loadChat,
    deleteChat,
    newChat
  };
}
