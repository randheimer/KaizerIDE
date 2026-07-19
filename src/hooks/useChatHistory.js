import { useState, useEffect, useCallback } from 'react';

/**
 * @deprecated This file has been moved to `./chat/useChatHistory.js`
 * Please update your imports:
 * 
 * ```js
 * // Old:
 * import { useChatHistory } from './hooks/useChatHistory';
 * 
 * // New:
 * import { useChatHistory } from './hooks/chat';
 * // or
 * import { useChatHistory } from './hooks';
 * ```
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
