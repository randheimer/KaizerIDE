import { useReducer } from 'react';

/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Use `chatStore` from `src/lib/stores/chatStore.js` instead.
 * 
 * Migration guide:
 * ```js
 * // Old way:
 * import { useChatState } from '../hooks/useChatState';
 * const { state, actions } = useChatState();
 * actions.addMessage({ role: 'user', content: 'Hello' });
 * actions.setStreaming(true);
 * 
 * // New way:
 * import { useChatStore } from '../lib/stores/chatStore';
 * const messages = useChatStore((s) => s.messages);
 * const addMessage = useChatStore((s) => s.addMessage);
 * const isStreaming = useChatStore((s) => s.isStreaming);
 * const setIsStreaming = useChatStore((s) => s.setIsStreaming);
 * 
 * // Usage:
 * addMessage({ role: 'user', content: 'Hello' });
 * setIsStreaming(true);
 * ```
 * 
 * @see src/lib/stores/chatStore.js for the new implementation
 */

const initialState = {
  messages: [],
  isStreaming: false,
  currentTool: null,
  thinkingContent: '',
  showThinking: false
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case 'UPDATE_LAST_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg, idx) => 
          idx === state.messages.length - 1 
            ? { ...msg, ...action.payload }
            : msg
        )
      };
    
    case 'UPDATE_LAST_ASSISTANT_MESSAGE':
      const messages = [...state.messages];
      let lastAssistantIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          lastAssistantIdx = i;
          break;
        }
      }
      
      if (lastAssistantIdx === -1) {
        messages.push({ role: 'assistant', content: action.payload });
      } else {
        messages[lastAssistantIdx] = {
          ...messages[lastAssistantIdx],
          content: messages[lastAssistantIdx].content + action.payload
        };
      }
      
      return { ...state, messages };
    
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload
      };
    
    case 'TOGGLE_MESSAGE_EXPANDED':
      return {
        ...state,
        messages: state.messages.map((msg, idx) =>
          idx === action.payload ? { ...msg, expanded: !msg.expanded } : msg
        )
      };
    
    case 'SET_STREAMING':
      return {
        ...state,
        isStreaming: action.payload
      };
    
    case 'SET_CURRENT_TOOL':
      return {
        ...state,
        currentTool: action.payload
      };
    
    case 'APPEND_THINKING':
      return {
        ...state,
        thinkingContent: state.thinkingContent + action.payload
      };
    
    case 'RESET_THINKING':
      return {
        ...state,
        thinkingContent: '',
        showThinking: false
      };
    
    case 'TOGGLE_THINKING':
      return {
        ...state,
        showThinking: !state.showThinking
      };
    
    case 'RESET_CHAT':
      return initialState;
    
    default:
      return state;
  }
}

export function useChatState() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  
  return {
    state,
    dispatch,
    actions: {
      addMessage: (message) => dispatch({ type: 'ADD_MESSAGE', payload: message }),
      updateLastMessage: (updates) => dispatch({ type: 'UPDATE_LAST_MESSAGE', payload: updates }),
      updateLastAssistantMessage: (token) => dispatch({ type: 'UPDATE_LAST_ASSISTANT_MESSAGE', payload: token }),
      setMessages: (messages) => dispatch({ type: 'SET_MESSAGES', payload: messages }),
      toggleMessageExpanded: (index) => dispatch({ type: 'TOGGLE_MESSAGE_EXPANDED', payload: index }),
      setStreaming: (isStreaming) => dispatch({ type: 'SET_STREAMING', payload: isStreaming }),
      setCurrentTool: (tool) => dispatch({ type: 'SET_CURRENT_TOOL', payload: tool }),
      appendThinking: (content) => dispatch({ type: 'APPEND_THINKING', payload: content }),
      resetThinking: () => dispatch({ type: 'RESET_THINKING' }),
      toggleThinking: () => dispatch({ type: 'TOGGLE_THINKING' }),
      resetChat: () => dispatch({ type: 'RESET_CHAT' })
    }
  };
}
