import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { runAgentTurn } from '../../../lib/agent';
import FilePicker from '../../Common/FilePicker';
import Icon from '../../Common/Icon';
import StreamingCodeBlock from './StreamingCodeBlock';
import FilesChangedCard from './FilesChangedCard';
import ChatHeader from './ChatHeader';
import EmptyState from './EmptyState';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import Composer from './Composer/Composer';
import MessageActions from './MessageActions';
import FileLink from './FileLink';
import ChatHistoryModal from './modals/ChatHistoryModal';
import AddModelModal from './modals/AddModelModal';
import { useChatStore } from '../../../lib/stores/chatStore';
import { toast } from '../../../lib/stores/toastStore';
import remarkFileLinks from '../../../lib/markdown/remarkFileLinks';
import './ChatPanel.css';

// Shared ReactMarkdown plugin list + link renderer. We inject these
// into every place the chat renders assistant markdown so the remark
// pass runs once per parse and file links get consistent hover previews.
const CHAT_REMARK_PLUGINS = [remarkGfm, remarkFileLinks];
const MARKDOWN_LINK_RENDERER = ({ node, href, children, ...props }) => {
  if (href && href.startsWith('file://')) {
    const path = href.replace('file://', '');
    return <FileLink path={path}>{children}</FileLink>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};

function ChatPanel({ workspacePath, activeFile, activeFileContent, settings, onOpenFile }) {
  const [messages, setMessages] = useState([]);
  const [streamingMsg, setStreamingMsg] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [toolGroups, setToolGroups] = useState({});
  const [currentTurnId, setCurrentTurnId] = useState(null);

  // Composer-related state lives in chatStore (consumed directly by Composer
  // and its sub-pickers; mirrored here via selectors so existing handlers work).
  const input = useChatStore((s) => s.input);
  const setInput = useChatStore((s) => s.setInput);
  const contextPills = useChatStore((s) => s.contextPills);
  const setContextPills = useChatStore((s) => s.setContextPills);
  const currentMode = useChatStore((s) => s.currentMode);
  const setCurrentMode = useChatStore((s) => s.setCurrentMode);
  const closePopup = useChatStore((s) => s.closePopup);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [commandPermissionRequest, setCommandPermissionRequest] = useState(null);
  const thinkStartTime = useRef(null);
  const [autoApproveCommands, setAutoApproveCommands] = useState(false);
  const [filesChangedCard, setFilesChangedCard] = useState(null);
  
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  // Tracks whether the user has manually scrolled away from the bottom.
  const isUserScrolledUp = useRef(false);
  const streamingMsgRef = useRef(null);
  const streamingUpdateTimer = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

  // Update streaming message with throttling
  const updateStreaming = useCallback((patch) => {
    streamingMsgRef.current = { ...streamingMsgRef.current, ...patch };
    // Throttle to ~30fps to prevent flicker
    if (!streamingUpdateTimer.current) {
      streamingUpdateTimer.current = setTimeout(() => {
        setStreamingMsg({ ...streamingMsgRef.current });
        streamingUpdateTimer.current = null;
      }, 33);
    }
  }, []);

  // Detect when the user manually scrolls away from the bottom so we stop
  // auto-following. A small threshold avoids flip-flopping on sub-pixel deltas.
  const handleMessagesScroll = useCallback((e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isUserScrolledUp.current = !atBottom;
  }, []);

  // Smooth-scroll to bottom if the user isn't actively reading older messages.
  const scrollToBottom = useCallback((force = false) => {
    if (!force && isUserScrolledUp.current) return;
    requestAnimationFrame(() => {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Follow new messages and streaming token updates.
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMsg, scrollToBottom]);

  // Handle drag and drop from file explorer
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (messagesContainerRef.current) {
        messagesContainerRef.current.classList.add('drag-over');
      }
    };

    const handleDragLeave = (e) => {
      if (messagesContainerRef.current && !messagesContainerRef.current.contains(e.relatedTarget)) {
        messagesContainerRef.current.classList.remove('drag-over');
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      if (messagesContainerRef.current) {
        messagesContainerRef.current.classList.remove('drag-over');
      }
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.path) {
          setContextPills(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              type: data.type === 'dir' ? 'folder' : 'file',
              data: data.path
            }
          ]);
          showToast(`Added ${data.name} to context`);
        }
      } catch (err) {
        console.error('Drop error:', err);
      }
    };

    const messagesEl = messagesContainerRef.current;
    if (messagesEl) {
      messagesEl.addEventListener('dragover', handleDragOver);
      messagesEl.addEventListener('dragleave', handleDragLeave);
      messagesEl.addEventListener('drop', handleDrop);
      return () => {
        messagesEl.removeEventListener('dragover', handleDragOver);
        messagesEl.removeEventListener('dragleave', handleDragLeave);
        messagesEl.removeEventListener('drop', handleDrop);
      };
    }
  }, []);

  // Popup dismissal is handled by Floating UI's useDismiss inside Composer.
  // This effect only wires up the agent/context window events.
  useEffect(() => {
    const handleAttachContext = (e) => {
      const { items } = e.detail;
      setContextPills(prev => [
        ...prev,
        ...items.map(item => ({
          id: Date.now() + Math.random(),
          type: item.type === 'dir' ? 'folder' : 'file',
          data: item.path
        }))
      ]);
    };

    const handlePasteToChat = (e) => {
      const { text, type } = e.detail;
      
      // Format based on type
      let formattedText = text;
      if (type === 'terminal') {
        formattedText = '```terminal\n' + text + '\n```';
      } else if (type === 'code') {
        formattedText = '```\n' + text + '\n```';
      }
      
      setInput(prev => prev + (prev ? '\n\n' : '') + formattedText);
      textareaRef.current?.focus();
    };

    const handleCommandPermission = (e) => {
      const { command, cwd, onResponse } = e.detail;
      
      // Auto-approve if enabled
      if (autoApproveCommands) {
        onResponse({ allowed: true });
        return;
      }
      
      // Show permission dialog
      setCommandPermissionRequest({
        command,
        cwd,
        onResponse
      });
    };

    const handleFileWritten = async (e) => {
      const { path, type, content, originalContent } = e.detail;
      
      // Validate path
      if (!path || typeof path !== 'string') {
        console.warn('[ChatPanel] Invalid path in file-written event:', path);
        return;
      }

      // Annotate the matching write_file tool row(s) with the captured
      // originalContent so the ToolGroupCard can render a real inline diff
      // when that row is expanded. We match by absolute path.
      setToolGroups(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [turnId, group] of Object.entries(prev)) {
          const updatedTools = group.tools.map((tool) => {
            if (tool.name !== 'write_file' && tool.name !== 'write-file') return tool;
            if (tool.originalContent !== undefined) return tool;
            let parsed = {};
            try {
              parsed = typeof tool.args === 'string' ? JSON.parse(tool.args) : tool.args || {};
            } catch {
              parsed = {};
            }
            const toolPath = parsed.path || parsed.filePath;
            if (!toolPath || !path.endsWith(toolPath.replace(/^[\\/]+/, ''))) return tool;
            changed = true;
            return { ...tool, originalContent: originalContent ?? '' };
          });
          if (updatedTools !== group.tools) {
            next[turnId] = { ...group, tools: updatedTools };
          }
        }
        return changed ? next : prev;
      });

      // Add or update file in filesChangedCard
      setFilesChangedCard(prev => {
        const newLines = content ? content.split('\n') : [];
        const oldLines = originalContent ? originalContent.split('\n') : [];
        
        let addedLines = newLines.length;
        let removedLines = oldLines.length;
        
        const fileName = path.split(/[\\/]/).pop() || 'unknown';
        
        const newFile = { 
          path, 
          name: fileName, 
          addedLines, 
          removedLines, 
          content, 
          isNew: !originalContent || type === 'added'
        };
        
        const newUndoEntry = {
          [path]: originalContent !== undefined ? originalContent : null
        };
        
        if (!prev) {
          // Create new card
          return {
            files: [newFile],
            undoStack: newUndoEntry
          };
        }
        
        // Merge with existing card
        const existingFileIdx = prev.files.findIndex(f => f.path === path);
        
        if (existingFileIdx >= 0) {
          // Update existing file
          return {
            files: prev.files.map((f, idx) => idx === existingFileIdx ? newFile : f),
            undoStack: { ...prev.undoStack, ...newUndoEntry }
          };
        } else {
          // Add new file
          return {
            files: [...prev.files, newFile],
            undoStack: { ...prev.undoStack, ...newUndoEntry }
          };
        }
      });
    };

    const handleImprovePlan = (e) => {
      const { planPath, planContent } = e.detail;
      
      // Add the plan file as context instead of pasting content
      setContextPills(prev => [...prev, {
        id: Date.now(),
        type: 'file',
        data: planPath
      }]);
      
      setInput(`Improve the plan in this file. Focus on making it more detailed, actionable, and comprehensive.`);
      setCurrentMode('plan');
      textareaRef.current?.focus();
    };

    const handleAskAboutPlan = (e) => {
      const { planPath, planContent } = e.detail;
      
      // Add the plan file as context instead of pasting content
      setContextPills(prev => [...prev, {
        id: Date.now(),
        type: 'file',
        data: planPath
      }]);
      
      setInput(`I have questions about this plan:`);
      setCurrentMode('ask');
      textareaRef.current?.focus();
    };

    const handleFocusChat = () => {
      textareaRef.current?.focus();
    };
    const handleNewChatShortcut = () => {
      handleNewChat();
    };

    window.addEventListener('kaizer:attach-context', handleAttachContext);
    window.addEventListener('kaizer:paste-to-chat', handlePasteToChat);
    window.addEventListener('kaizer:request-command-permission', handleCommandPermission);
    window.addEventListener('kaizer:file-written', handleFileWritten);
    window.addEventListener('kaizer:improve-plan', handleImprovePlan);
    window.addEventListener('kaizer:ask-about-plan', handleAskAboutPlan);
    window.addEventListener('kaizer:focus-chat', handleFocusChat);
    window.addEventListener('kaizer:new-chat', handleNewChatShortcut);
    return () => {
      window.removeEventListener('kaizer:attach-context', handleAttachContext);
      window.removeEventListener('kaizer:paste-to-chat', handlePasteToChat);
      window.removeEventListener('kaizer:request-command-permission', handleCommandPermission);
      window.removeEventListener('kaizer:file-written', handleFileWritten);
      window.removeEventListener('kaizer:improve-plan', handleImprovePlan);
      window.removeEventListener('kaizer:ask-about-plan', handleAskAboutPlan);
      window.removeEventListener('kaizer:focus-chat', handleFocusChat);
      window.removeEventListener('kaizer:new-chat', handleNewChatShortcut);
    };
  }, [autoApproveCommands, setInput, setContextPills, setCurrentMode]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160)
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Load chat history from AppData on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (workspacePath && window.electron?.loadChatHistory) {
        const result = await window.electron.loadChatHistory(workspacePath);
        if (result.success && result.data) {
          setChatHistory(result.data);
        }
      }
    };
    loadHistory();
  }, [workspacePath]);

  // Save chat to history
  const saveCurrentChat = useCallback(async () => {
    if (messages.length === 0) return;
    
    const chatTitle = messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Chat';
    const timestamp = Date.now();
    
    // Filter out empty assistant messages and only keep user/assistant/error messages
    const cleanMessages = messages.filter(m => 
      (m.role === 'user' || m.role === 'assistant' || m.role === 'error') &&
      (m.role !== 'assistant' || m.content.trim() !== '')
    );
    
    let updatedHistory;
    
    if (currentChatId) {
      // Update existing chat
      updatedHistory = chatHistory.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: cleanMessages, toolGroups, title: chatTitle, timestamp }
          : chat
      );
    } else {
      // Create new chat
      const newChat = {
        id: timestamp,
        title: chatTitle,
        messages: cleanMessages,
        toolGroups,
        timestamp
      };
      setCurrentChatId(timestamp);
      updatedHistory = [newChat, ...chatHistory].slice(0, 50); // Keep last 50 chats
    }
    
    setChatHistory(updatedHistory);
    if (window.electron?.saveChatHistory) {
      await window.electron.saveChatHistory(updatedHistory, workspacePath);
    }
  }, [messages, currentChatId, chatHistory, workspacePath, toolGroups]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input.trim(), context: [...contextPills] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setContextPills([]);
    setIsStreaming(true);
    setIsAgentRunning(true);

    // Reset scroll state and force scroll to bottom
    isUserScrolledUp.current = false;
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    });

    // Create new turn ID for this agent turn
    const turnId = Date.now();
    setCurrentTurnId(turnId);
    
    // Initialize tool group for this turn
    const newToolGroup = {
      turnId,
      status: 'running',
      tools: [],
      expanded: true
    };
    
    setToolGroups(prev => ({
      ...prev,
      [turnId]: newToolGroup
    }));

    // Initialize streaming message
    streamingMsgRef.current = {
      content: '',
      contentSegments: [''], // Track content between thinking blocks
      thinkingBlocks: [], // Array of thinking sessions
      currentThinkingIndex: -1,
      isThinking: false,
      thinkingExpanded: true
    };
    setStreamingMsg({ ...streamingMsgRef.current });

    abortControllerRef.current = new AbortController();

    try {
      await runAgentTurn({
        messages: newMessages,
        settings,
        workspacePath,
        activeFile,
        activeFileContent,
        mode: currentMode, // Pass the selected mode (agent/plan/ask/fixer)
        onToken: (token) => {
          streamingMsgRef.current.content += token;
          // Append to the current content segment (after last thinking block)
          const segmentIndex = streamingMsgRef.current.thinkingBlocks.length;
          if (!streamingMsgRef.current.contentSegments[segmentIndex]) {
            streamingMsgRef.current.contentSegments[segmentIndex] = '';
          }
          streamingMsgRef.current.contentSegments[segmentIndex] += token;
          
          // Debug: log every 100 characters
          if (streamingMsgRef.current.content.length % 100 === 0) {
            console.log('[ChatPanel] 📄 Content length:', streamingMsgRef.current.content.length, 'Segment:', segmentIndex);
          }
          
          updateStreaming({ 
            content: streamingMsgRef.current.content,
            contentSegments: [...streamingMsgRef.current.contentSegments]
          });
          
          // Scroll to bottom
          if (!isUserScrolledUp.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        },
        onThinkingToken: (token) => {
          if (token === '__START__') {
            console.log('[ChatPanel] 🧠 Thinking block started');
            thinkStartTime.current = Date.now();
            // Add new thinking block
            const newBlock = {
              content: '',
              isThinking: true,
              expanded: true,
              duration: null
            };
            streamingMsgRef.current.thinkingBlocks.push(newBlock);
            streamingMsgRef.current.currentThinkingIndex = streamingMsgRef.current.thinkingBlocks.length - 1;
            // Start a new content segment after this thinking block
            streamingMsgRef.current.contentSegments.push('');
            console.log('[ChatPanel] Created thinking block at index:', streamingMsgRef.current.currentThinkingIndex);
            updateStreaming({ 
              thinkingBlocks: [...streamingMsgRef.current.thinkingBlocks],
              contentSegments: [...streamingMsgRef.current.contentSegments],
              currentThinkingIndex: streamingMsgRef.current.currentThinkingIndex
            });
            return;
          }
          
          if (token === '__END__') {
            const duration = Date.now() - thinkStartTime.current;
            const currentIdx = streamingMsgRef.current.currentThinkingIndex;
            console.log('[ChatPanel] ✅ Thinking block ended at index:', currentIdx, 'Duration:', duration, 'ms');
            if (currentIdx >= 0 && currentIdx < streamingMsgRef.current.thinkingBlocks.length) {
              streamingMsgRef.current.thinkingBlocks[currentIdx].isThinking = false;
              streamingMsgRef.current.thinkingBlocks[currentIdx].expanded = false;
              streamingMsgRef.current.thinkingBlocks[currentIdx].duration = duration;
            }
            streamingMsgRef.current.currentThinkingIndex = -1;
            updateStreaming({ 
              thinkingBlocks: [...streamingMsgRef.current.thinkingBlocks],
              currentThinkingIndex: -1
            });
            return;
          }
          
          // Append to current thinking block
          const currentIdx = streamingMsgRef.current.currentThinkingIndex;
          if (currentIdx >= 0 && currentIdx < streamingMsgRef.current.thinkingBlocks.length) {
            streamingMsgRef.current.thinkingBlocks[currentIdx].content += token;
            updateStreaming({ thinkingBlocks: [...streamingMsgRef.current.thinkingBlocks] });
          }
        },
        onToolCall: ({ id, name, args }) => {
          // Add tool to current turn's group
          setToolGroups(prev => {
            const group = prev[turnId];
            if (!group) return prev;
            
            const updatedGroup = {
              ...group,
              tools: [
                ...group.tools,
                {
                  id,
                  name,
                  args: JSON.stringify(args),
                  status: 'running',
                  result: null,
                  expanded: false
                }
              ]
            };
            
            return {
              ...prev,
              [turnId]: updatedGroup
            };
          });
        },
        onToolResult: ({ id, name, result }) => {
          // Update tool status in current turn's group
          setToolGroups(prev => {
            const group = prev[turnId];
            if (!group) return prev;
            
            const updatedGroup = {
              ...group,
              tools: group.tools.map(tool =>
                tool.id === id
                  ? { ...tool, status: 'done', result }
                  : tool
              )
            };
            
            return {
              ...prev,
              [turnId]: updatedGroup
            };
          });
        },
        onDone: () => {
          clearTimeout(streamingUpdateTimer.current);
          streamingUpdateTimer.current = null;
          
          // Commit streaming message to messages (only if exists)
          if (streamingMsgRef.current) {
            console.log('[ChatPanel] 📝 Finalizing message. Content length:', streamingMsgRef.current.content.length);
            console.log('[ChatPanel] 📝 Content segments:', streamingMsgRef.current.contentSegments.length);
            console.log('[ChatPanel] 📝 Thinking blocks:', streamingMsgRef.current.thinkingBlocks.length);
            
            const finalMsg = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: streamingMsgRef.current.content || '',
              contentSegments: streamingMsgRef.current.contentSegments || [''], // Save segments!
              thinkingBlocks: streamingMsgRef.current.thinkingBlocks || []
            };
            
            setMessages(prev => [...prev, finalMsg]);
          }
          
          setStreamingMsg(null);
          setIsStreaming(false);
          setIsAgentRunning(false);
          streamingMsgRef.current = null;
          
          // Mark tool group as done and collapse it
          setToolGroups(prev => {
            const group = prev[turnId];
            if (!group) return prev;
            
            return {
              ...prev,
              [turnId]: {
                ...group,
                status: 'done',
                expanded: false
              }
            };
          });
          
          setCurrentTurnId(null);
          thinkStartTime.current = null;
          
          // Scroll to bottom when agent finishes
          isUserScrolledUp.current = false;
          requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          });
          
          saveCurrentChat();
        },
        signal: abortControllerRef.current.signal
      });
    } catch (error) {
        // Parse error message for better display
        let errorMessage = error.message;
        
        // Check if it's an API error with JSON
        const apiErrorMatch = errorMessage.match(/API (\d+): (.+)/);
        if (apiErrorMatch) {
          const statusCode = apiErrorMatch[1];
          try {
            const errorData = JSON.parse(apiErrorMatch[2]);
            const innerMessage = errorData.error?.message || '';
            
            // Extract model name and reason
            const modelMatch = innerMessage.match(/\[kiro\/([^\]]+)\]/);
            const statusMatch = innerMessage.match(/\[(\d+)\]/);
            
            let modelName = '';
            let reason = innerMessage;
            
            if (modelMatch) {
              modelName = modelMatch[1]; // Get model name without kiro/ prefix
            }
            
            // Extract the main error message (after all brackets)
            const reasonMatch = innerMessage.match(/\]\s*:\s*(.+)$/);
            if (reasonMatch) {
              reason = reasonMatch[1];
              
              // Split by parentheses to separate main message and additional info
              const parts = reason.match(/^([^(]+)(?:\s*\((.+)\))?$/);
              if (parts) {
                const mainReason = parts[1].trim();
                const additionalInfo = parts[2] ? parts[2].trim() : '';
                
                errorMessage = `Error: API ${statusCode}`;
                if (modelName) errorMessage += `\n${modelName}`;
                errorMessage += `\n${mainReason}`;
                if (additionalInfo) errorMessage += `\n${additionalInfo}`;
              } else {
                errorMessage = `Error: API ${statusCode}`;
                if (modelName) errorMessage += `\n${modelName}`;
                errorMessage += `\n${reason}`;
              }
            } else {
              errorMessage = `Error: API ${statusCode}`;
              if (modelName) errorMessage += `\n${modelName}`;
              errorMessage += `\n${innerMessage}`;
            }
          } catch (e) {
            // If JSON parsing fails, use original message
            errorMessage = `Error: API ${statusCode}\n${apiErrorMatch[2]}`;
          }
        }
        
        setMessages(prev => [...prev, {
          role: 'error',
          content: errorMessage
        }]);
        
        requestAnimationFrame(() => {
          if (!isUserScrolledUp.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        });
        
        setIsStreaming(false);
        setIsAgentRunning(false);
        setCurrentTurnId(null);
        thinkStartTime.current = null;
        setStreamingMsg(null);
        streamingMsgRef.current = null;
        clearTimeout(streamingUpdateTimer.current);
        streamingUpdateTimer.current = null;
        
        // Mark tool group as done on error
        if (turnId && toolGroups[turnId]) {
          setToolGroups(prev => ({
            ...prev,
            [turnId]: {
              ...prev[turnId],
              status: 'done',
              expanded: false
            }
          }));
        }
        
        saveCurrentChat();
      }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      
      clearTimeout(streamingUpdateTimer.current);
      streamingUpdateTimer.current = null;
      
      // Commit partial content to messages
      if (streamingMsgRef.current) {
        const finalMsg = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: streamingMsgRef.current.content,
          thinkingBlocks: streamingMsgRef.current.thinkingBlocks || []
        };
        setMessages(prev => [...prev, finalMsg]);
      }
      
      setStreamingMsg(null);
      streamingMsgRef.current = null;
      setIsStreaming(false);
      setIsAgentRunning(false);
      
      // Mark current tool group as done
      if (currentTurnId && toolGroups[currentTurnId]) {
        setToolGroups(prev => ({
          ...prev,
          [currentTurnId]: {
            ...prev[currentTurnId],
            status: 'done',
            expanded: false
          }
        }));
      }
      
      setCurrentTurnId(null);
      thinkStartTime.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const handleLoadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages || []);
      setToolGroups(chat.toolGroups || {});
      setCurrentChatId(chatId);
      setShowHistoryModal(false);
    }
  };

  const handleDeleteChat = async (chatId) => {
    const updatedHistory = chatHistory.filter(c => c.id !== chatId);
    setChatHistory(updatedHistory);
    if (window.electron?.saveChatHistory) {
      await window.electron.saveChatHistory(updatedHistory, workspacePath);
    }
    
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setContextPills([]);
    setCurrentChatId(null);
    setToolGroups({});
    setCurrentTurnId(null);
  };

  const handleToggleGroupExpanded = (turnId) => {
    setToolGroups(prev => ({
      ...prev,
      [turnId]: {
        ...prev[turnId],
        expanded: !prev[turnId].expanded
      }
    }));
  };

  const handleToggleRowExpanded = (turnId, rowIdx) => {
    console.log('[ChatPanel] Toggling row:', turnId, rowIdx);
    setToolGroups(prev => {
      const group = prev[turnId];
      if (!group) {
        console.log('[ChatPanel] Group not found:', turnId);
        return prev;
      }
      
      const tool = group.tools[rowIdx];
      console.log('[ChatPanel] Tool to toggle:', tool);
      
      return {
        ...prev,
        [turnId]: {
          ...group,
          tools: group.tools.map((tool, idx) =>
            idx === rowIdx
              ? { ...tool, expanded: !tool.expanded }
              : tool
          )
        }
      };
    });
  };

  const handleAddContext = (type, data) => {
    setContextPills((prev) => [...prev, { type, data, id: Date.now() }]);
    closePopup();
  };

  /**
   * Context-menu type selection bridge. ContextMenu passes a type id
   * (files / docs / terminal); we translate into the existing effects.
   */
  const handleAttachContextType = (id) => {
    if (id === 'files') {
      window.dispatchEvent(
        new CustomEvent('kaizer:open-filepicker', {
          detail: { startPath: workspacePath },
        })
      );
    } else if (id === 'docs') {
      // eslint-disable-next-line no-alert
      alert('Coming soon');
    } else if (id === 'terminal') {
      handleAddContext('terminal', 'Terminal');
    }
  };

  // Backward-compat wrapper; real toast system lives in `toastStore`.
  const showToast = (message) => toast.success(message);

  // ── Per-message actions ──────────────────────────────────────────────
  const handleCopyMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content ?? '');
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  /** Truncate messages at `idx` and reload that user message into the composer. */
  const handleEditMessage = (msg, idx) => {
    if (isStreaming) {
      toast.warn('Stop the agent before editing');
      return;
    }
    setInput(msg.content ?? '');
    setContextPills(msg.context ? [...msg.context] : []);
    setMessages((prev) => prev.slice(0, idx));
    textareaRef.current?.focus();
  };

  /** Drop everything after `idx` and re-run this user message through the agent. */
  const handleRetryMessage = (msg, idx) => {
    if (isStreaming) {
      toast.warn('Stop the agent before retrying');
      return;
    }
    setMessages((prev) => prev.slice(0, idx));
    setInput(msg.content ?? '');
    setContextPills(msg.context ? [...msg.context] : []);
    // Defer one tick so state flushes before submission.
    setTimeout(() => handleSend(), 0);
  };

  /** Start a new chat seeded with the prefix up to (and including) this message. */
  const handleForkMessage = (_msg, idx) => {
    const prefix = messages.slice(0, idx + 1);
    setMessages(prefix);
    setCurrentChatId(null);
    setToolGroups({});
    setCurrentTurnId(null);
    toast.info('Forked into a new chat');
  };

  const handlePinMessage = (_msg, idx) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, pinned: !m.pinned } : m))
    );
  };

  const extractFileFromArgs = (argsStr) => {
    try {
      const args = JSON.parse(argsStr);
      const path = args.path || args.filePath || args.command || args.query || '';
      return path.split(/[\\/]/).pop() || path;
    } catch (e) {
      return '';
    }
  };

  const toggleThinking = useCallback((msgId, blockIndex) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const blocks = [...(m.thinkingBlocks || [])];
      if (blockIndex >= 0 && blockIndex < blocks.length) {
        blocks[blockIndex].expanded = !blocks[blockIndex].expanded;
      }
      return { ...m, thinkingBlocks: blocks };
    }));
  }, []);

  const renderStreamingMessage = (msg) => {
    return (
      // `is-streaming` opts this row out of the .message-row entry animation
      // so rapid token updates don't restart it on every render.
      <div className="message-row assistant-row is-streaming" key="streaming">
        <div className="message-assistant">
          <div className="assistant-avatar" aria-hidden="true">K</div>
          {/* Interleave content segments and thinking blocks */}
          {msg.contentSegments && msg.contentSegments.map((segment, idx) => (
            <React.Fragment key={`segment-${idx}`}>
              {/* Render content segment */}
              {segment && (
                <div className="assistant-message">
                  <ReactMarkdown 
                    remarkPlugins={CHAT_REMARK_PLUGINS}
                    unwrapDisallowed={true}
                    components={{
                      a: MARKDOWN_LINK_RENDERER,
                      code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        
                        if (!inline) {
                          const codeContent = String(children).replace(/\n$/, '');
                          
                          return (
                            <div className="code-block-wrapper">
                              {language && (
                                <div className="code-block-header">
                                  <span className="code-language">{language}</span>
                                </div>
                              )}
                              <StreamingCodeBlock code={codeContent} language={language} />
                            </div>
                          );
                        }
                        return <code className={className} {...props}>{children}</code>;
                      }
                    }}
                  >
                    {segment}
                  </ReactMarkdown>
                </div>
              )}
              
              {/* Render thinking block after this segment (if exists) */}
              {msg.thinkingBlocks && msg.thinkingBlocks[idx] && (
                <div className="thinking-block">
                  <div 
                    className="thinking-header"
                    onClick={() => {
                      const blocks = [...streamingMsgRef.current.thinkingBlocks];
                      blocks[idx].expanded = !blocks[idx].expanded;
                      streamingMsgRef.current.thinkingBlocks = blocks;
                      updateStreaming({ thinkingBlocks: blocks });
                    }}
                  >
                    {msg.thinkingBlocks[idx].isThinking ? (
                      <span className="thinking-spinner"></span>
                    ) : (
                      <Icon name="CheckCircle2" size={12} style={{ color: '#22c55e' }} />
                    )}
                    <span className="thinking-label">
                      {msg.thinkingBlocks[idx].isThinking
                        ? 'Thinking...'
                        : `Thought for ${((msg.thinkingBlocks[idx].duration || 0) / 1000).toFixed(1)}s${
                            (msg.thinkingBlocks[idx].content || '').length > 0
                              ? ` • ${(msg.thinkingBlocks[idx].content || '').length} chars`
                              : ''
                          }`}
                    </span>
                    <Icon
                      name={msg.thinkingBlocks[idx].expanded ? 'ChevronDown' : 'ChevronRight'}
                      size={12}
                      className="thinking-chevron"
                    />
                  </div>
                  {msg.thinkingBlocks[idx].expanded && (
                    <div className="thinking-body">
                      <pre>{msg.thinkingBlocks[idx].content}</pre>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderMessage = (msg, idx) => {
    if (msg.role === 'user') {
      return (
        <div key={idx} className={`message-row user-row ${msg.pinned ? 'is-pinned' : ''}`}>
          <div className="user-message">
            {msg.content}
            {msg.context && msg.context.length > 0 && (
              <div className="message-context-pills">
                {msg.context.map((ctx) => (
                  <div key={ctx.id} className="context-pill-attached">
                    <span className="context-pill-icon">
                      {ctx.type === 'file' ? '📄' : ctx.type === 'folder' ? '📁' : '💻'}
                    </span>
                    <span className="context-pill-name">
                      {ctx.data.split(/[\\/]/).pop()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <MessageActions
              role="user"
              pinned={!!msg.pinned}
              onCopy={() => handleCopyMessage(msg, idx)}
              onEdit={() => handleEditMessage(msg, idx)}
              onRetry={() => handleRetryMessage(msg, idx)}
              onPin={() => handlePinMessage(msg, idx)}
            />
          </div>
        </div>
      );
    }

    if (msg.role === 'assistant') {
      return (
        <div key={idx} className="message-row assistant-row">
          <div className="message-assistant">
            <div className="assistant-avatar" aria-hidden="true">K</div>
            {/* Interleave content segments and thinking blocks */}
            {msg.contentSegments && msg.contentSegments.length > 0 ? (
              // New format with segments
              msg.contentSegments.map((segment, segIdx) => (
                <React.Fragment key={`segment-${segIdx}`}>
                  {/* Render content segment */}
                  {segment && (
                    <div className="assistant-message">
                      <ReactMarkdown 
                        remarkPlugins={CHAT_REMARK_PLUGINS}
                        unwrapDisallowed={true}
                        components={{
                          a: MARKDOWN_LINK_RENDERER,
                          code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            
                            if (!inline) {
                              const codeContent = String(children).replace(/\n$/, '');
                              
                              return (
                                <div className="code-block-wrapper">
                                  {language && (
                                    <div className="code-block-header">
                                      <span className="code-block-lang">{language}</span>
                                      <button
                                        className="code-copy-btn"
                                        onClick={async () => {
                                          try {
                                            await navigator.clipboard.writeText(codeContent);
                                            toast.success('Copied');
                                          } catch {
                                            toast.error('Copy failed');
                                          }
                                        }}
                                        title="Copy"
                                        aria-label="Copy code"
                                        type="button"
                                      >
                                        <Icon name="Copy" size={12} />
                                      </button>
                                    </div>
                                  )}
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={language || 'text'}
                                    PreTag="div"
                                    customStyle={{
                                      margin: 0,
                                      borderRadius: language ? '0 0 8px 8px' : '8px',
                                      fontSize: '12.5px',
                                      background: 'var(--bg-2)',
                                    }}
                                    codeTagProps={{
                                      style: {
                                        fontFamily: 'var(--font-mono)',
                                        lineHeight: '1.5'
                                      }
                                    }}
                                    {...props}
                                  >
                                    {codeContent}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            }
                            
                            return (
                              <code className="inline-code" {...props}>
                                {children}
                              </code>
                            );
                          },
                          p: ({ children }) => <div className="assistant-paragraph">{children}</div>,
                          strong: ({ children }) => <strong className="assistant-bold">{children}</strong>,
                          em: ({ children }) => <em className="assistant-italic">{children}</em>,
                          h1: ({ children }) => <h1 className="assistant-h1">{children}</h1>,
                          h2: ({ children }) => <h2 className="assistant-h2">{children}</h2>,
                          h3: ({ children }) => <h3 className="assistant-h3">{children}</h3>,
                          h4: ({ children }) => <h4 className="assistant-h4">{children}</h4>,
                          h5: ({ children }) => <h5 className="assistant-h5">{children}</h5>,
                          h6: ({ children }) => <h6 className="assistant-h6">{children}</h6>,
                          ul: ({ children }) => <ul className="assistant-ul">{children}</ul>,
                          ol: ({ children }) => <ol className="assistant-ol">{children}</ol>,
                          li: ({ children }) => <li className="assistant-li">{children}</li>,
                          blockquote: ({ children }) => <blockquote className="assistant-blockquote">{children}</blockquote>,
                          hr: () => <hr className="assistant-hr" />,
                          a: ({ href, children }) => <a className="assistant-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                          del: ({ children }) => <del className="assistant-strikethrough">{children}</del>
                        }}
                      >
                        {segment}
                      </ReactMarkdown>
                    </div>
                  )}
                  
                  {/* Render thinking block after this segment (if exists) */}
                  {msg.thinkingBlocks && msg.thinkingBlocks[segIdx] && (
                    <div className="thinking-block">
                      <div 
                        className="thinking-header"
                        onClick={() => {
                          setMessages(prev => prev.map((m, i) => {
                            if (i !== idx) return m;
                            const blocks = [...(m.thinkingBlocks || [])];
                            if (segIdx >= 0 && segIdx < blocks.length) {
                              blocks[segIdx] = { ...blocks[segIdx], expanded: !blocks[segIdx].expanded };
                            }
                            return { ...m, thinkingBlocks: blocks };
                          }));
                        }}
                      >
                        <Icon name="CheckCircle2" size={12} style={{ color: '#22c55e' }} />
                        <span className="thinking-label">
                          {msg.thinkingBlocks[segIdx].duration
                            ? `Thought for ${(msg.thinkingBlocks[segIdx].duration / 1000).toFixed(1)}s${
                                (msg.thinkingBlocks[segIdx].content || '').length > 0
                                  ? ` • ${(msg.thinkingBlocks[segIdx].content || '').length} chars`
                                  : ''
                              }`
                            : 'Thinking'}
                        </span>
                        <Icon
                          name={msg.thinkingBlocks[segIdx].expanded ? 'ChevronDown' : 'ChevronRight'}
                          size={12}
                          className="thinking-chevron"
                        />
                      </div>
                      {msg.thinkingBlocks[segIdx].expanded && (
                        <div className="thinking-body">
                          <pre>{msg.thinkingBlocks[segIdx].content}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))
            ) : (
              // Old format fallback - all thinking blocks first, then content
              <>
                {msg.thinkingBlocks && msg.thinkingBlocks.map((block, blockIdx) => (
              <div key={blockIdx} className="thinking-block">
                <div 
                  className="thinking-header"
                  onClick={() => {
                    // Toggle the expanded state directly in the messages array
                    setMessages(prev => prev.map((m, i) => {
                      if (i !== idx) return m;
                      const blocks = [...(m.thinkingBlocks || [])];
                      if (blockIdx >= 0 && blockIdx < blocks.length) {
                        blocks[blockIdx] = { ...blocks[blockIdx], expanded: !blocks[blockIdx].expanded };
                      }
                      return { ...m, thinkingBlocks: blocks };
                    }));
                  }}
                >
                  <Icon name="CheckCircle2" size={12} style={{ color: '#22c55e' }} />
                  <span className="thinking-label">
                    {block.duration
                      ? `Thought for ${(block.duration / 1000).toFixed(1)}s${
                          (block.content || '').length > 0
                            ? ` • ${(block.content || '').length} chars`
                            : ''
                        }`
                      : 'Thinking'}
                  </span>
                  <Icon
                    name={block.expanded ? 'ChevronDown' : 'ChevronRight'}
                    size={12}
                    className="thinking-chevron"
                  />
                </div>
                {block.expanded && (
                  <div className="thinking-body">
                    <pre>{block.content}</pre>
                  </div>
                )}
              </div>
            ))}
            
            {msg.content && (
              <div className="assistant-message">
                <ReactMarkdown 
                  remarkPlugins={CHAT_REMARK_PLUGINS}
                  unwrapDisallowed={true}
                  components={{
                    a: MARKDOWN_LINK_RENDERER,
                    code: ({ node, inline, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      
                      if (!inline) {
                        const codeContent = String(children).replace(/\n$/, '');
                        
                        return (
                          <div className="code-block-wrapper">
                            {language && (
                              <div className="code-block-header">
                                <span className="code-block-lang">{language}</span>
                                <button
                                  className="code-copy-btn"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(codeContent);
                                      toast.success('Copied');
                                    } catch {
                                      toast.error('Copy failed');
                                    }
                                  }}
                                  title="Copy"
                                  aria-label="Copy code"
                                  type="button"
                                >
                                  <Icon name="Copy" size={12} />
                                </button>
                              </div>
                            )}
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={language || 'text'}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                borderRadius: language ? '0 0 8px 8px' : '8px',
                                fontSize: '12.5px',
                                background: 'var(--bg-2)',
                              }}
                              codeTagProps={{
                                style: {
                                  fontFamily: 'var(--font-mono)',
                                  lineHeight: '1.5'
                                }
                              }}
                              {...props}
                            >
                              {codeContent}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      
                      return (
                        <code className="inline-code" {...props}>
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => <div className="assistant-paragraph">{children}</div>,
                    strong: ({ children }) => <strong className="assistant-bold">{children}</strong>,
                    em: ({ children }) => <em className="assistant-italic">{children}</em>,
                    h1: ({ children }) => <h1 className="assistant-h1">{children}</h1>,
                    h2: ({ children }) => <h2 className="assistant-h2">{children}</h2>,
                    h3: ({ children }) => <h3 className="assistant-h3">{children}</h3>,
                    h4: ({ children }) => <h4 className="assistant-h4">{children}</h4>,
                    h5: ({ children }) => <h5 className="assistant-h5">{children}</h5>,
                    h6: ({ children }) => <h6 className="assistant-h6">{children}</h6>,
                    ul: ({ children }) => <ul className="assistant-ul">{children}</ul>,
                    ol: ({ children }) => <ol className="assistant-ol">{children}</ol>,
                    li: ({ children }) => <li className="assistant-li">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="assistant-blockquote">{children}</blockquote>,
                    hr: () => <hr className="assistant-hr" />,
                    a: ({ href, children }) => <a className="assistant-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                    del: ({ children }) => <del className="assistant-strikethrough">{children}</del>
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
              </>
            )}
            <MessageActions
              role="assistant"
              pinned={!!msg.pinned}
              onCopy={() => handleCopyMessage(msg, idx)}
              onFork={() => handleForkMessage(msg, idx)}
              onPin={() => handlePinMessage(msg, idx)}
            />
          </div>
        </div>
      );
    }

    if (msg.role === 'error') {
      return (
        <div key={idx} className="message-row error-row">
          <div className="error-message">{msg.content}</div>
        </div>
      );
    }

    return null;
  };

  // Remove ThinkingBlock component - now inline

  return (
    <div className="chat-panel">
      {/* Header */}
      <ChatHeader
        onNewChat={handleNewChat}
        onOpenHistory={() => setShowHistoryModal(true)}
      />

      {/* Messages Area - owns its own scroll. Completed messages +
          interleaved tool groups come from MessageList; the live
          streaming message and typing indicator are rendered directly
          below so token updates don't force a list re-measure. */}
      <div
        className="chat-messages-new"
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
      >
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <>
            <MessageList
              messages={messages}
              toolGroups={toolGroups}
              renderMessage={renderMessage}
              onToggleGroupExpanded={handleToggleGroupExpanded}
              onToggleRowExpanded={handleToggleRowExpanded}
            />
            {streamingMsg && (
              <div className="streaming-row">
                {renderStreamingMessage(streamingMsg)}
              </div>
            )}
            {isAgentRunning && !streamingMsg?.content && !streamingMsg?.thinkingContent && (
              <TypingIndicator />
            )}
            <div ref={messagesEndRef} style={{ height: 1 }} />
          </>
        )}
      </div>

      {/* Files Changed Card - Outside messages, above composer */}
      {filesChangedCard && (
        <FilesChangedCard
          files={filesChangedCard.files}
          undoStack={filesChangedCard.undoStack}
          onUndo={async () => {
            // Undo all changes
            for (const [path, originalContent] of Object.entries(filesChangedCard.undoStack)) {
              if (originalContent === null) {
                // File was newly created, delete it
                if (window.electron?.runCommand) {
                  const isWindows = navigator.platform.toLowerCase().includes('win');
                  const parentDir = path.split(/[\\/]/).slice(0, -1).join(isWindows ? '\\' : '/');
                  const deleteCmd = isWindows 
                    ? `del /f /q "${path}"`
                    : `rm -f "${path}"`;
                  await window.electron.runCommand(deleteCmd, parentDir || workspacePath);
                }
              } else {
                // File was modified, restore original content
                if (window.electron?.writeFile) {
                  await window.electron.writeFile(path, originalContent);
                }
              }
              
              // Dispatch event to refresh editor and file tree
              window.dispatchEvent(new CustomEvent('kaizer:file-written', {
                detail: { path, content: originalContent || '', type: 'restored' }
              }));
            }
            
            // Clear diff decorations
            window.dispatchEvent(new CustomEvent('kaizer:clear-diff'));
            
            // Clear the files changed card
            setFilesChangedCard(null);
            showToast('Changes reverted');
          }}
          onAccept={() => {
            // Clear diff decorations
            window.dispatchEvent(new CustomEvent('kaizer:clear-diff'));
            
            // Clear the files changed card
            setFilesChangedCard(null);
            showToast('Changes accepted');
          }}
          onOpenFile={onOpenFile}
        />
      )}

      {/* Command Permission Bar (above input) */}
      {commandPermissionRequest && (
        <div className="command-permission-bar">
          <div className="command-permission-content">
            <div className="command-permission-icon">⚠️</div>
            <div className="command-permission-text">
              <div className="command-permission-title">Command execution request</div>
              <div className="command-permission-command">
                <span className="command-cwd">{commandPermissionRequest.cwd}{'>'}</span>
                <span className="command-text">{commandPermissionRequest.command}</span>
              </div>
            </div>
            <div className="command-permission-actions">
              <button 
                className="command-btn command-btn-deny" 
                onClick={() => {
                  commandPermissionRequest.onResponse({ allowed: false });
                  setCommandPermissionRequest(null);
                }}
              >
                Deny
              </button>
              <button 
                className="command-btn command-btn-allow" 
                onClick={() => {
                  commandPermissionRequest.onResponse({ allowed: true });
                  setCommandPermissionRequest(null);
                }}
              >
                Allow Once
              </button>
              <button 
                className="command-btn command-btn-always" 
                onClick={() => {
                  setAutoApproveCommands(true);
                  commandPermissionRequest.onResponse({ allowed: true });
                  setCommandPermissionRequest(null);
                }}
              >
                Always Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Composer */}
      <Composer
        ref={textareaRef}
        settings={settings}
        isStreaming={isStreaming}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        onChangeInput={(e) => setInput(e.target.value)}
        onAttachContextType={handleAttachContextType}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <AddModelModal
          endpoint={settings.endpoint}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Chat History Modal */}
      {showHistoryModal && (
        <ChatHistoryModal
          chatHistory={chatHistory}
          onClose={() => setShowHistoryModal(false)}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
        />
      )}

      {/* File Picker Modal */}
      {showFilePicker && (
        <FilePicker
          startPath={workspacePath}
          workspacePath={workspacePath}
          onAttach={(items) => {
            items.forEach(item => {
              handleAddContext('file', item.path);
            });
            setShowFilePicker(false);
          }}
          onClose={() => setShowFilePicker(false)}
        />
      )}

      {/* Command Permission Dialog */}
      {commandPermissionRequest && false && (
        <div className="settings-modal-overlay">
          <div className="settings-modal" style={{ maxWidth: '500px' }}>
            <div className="settings-modal-header">
              <h2>⚠️ Command Execution Request</h2>
            </div>
            <div className="settings-modal-body">
              <div className="command-permission-content">
                <p style={{ marginBottom: '12px', color: 'var(--text-1)' }}>
                  The AI wants to execute the following command:
                </p>
                <div style={{ 
                  background: 'var(--bg-3)', 
                  padding: '12px', 
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  marginBottom: '12px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ color: 'var(--text-2)', fontSize: '11px', marginBottom: '4px' }}>
                    Working directory: {commandPermissionRequest.cwd}
                  </div>
                  <div style={{ color: 'var(--accent)', fontWeight: '500' }}>
                    $ {commandPermissionRequest.command}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  Do you want to allow this command to execute?
                </p>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button 
                className="settings-btn-secondary" 
                onClick={() => {
                  commandPermissionRequest.onResponse({ allowed: false });
                  setCommandPermissionRequest(null);
                }}
              >
                Deny
              </button>
              <button 
                className="settings-btn-primary" 
                onClick={() => {
                  commandPermissionRequest.onResponse({ allowed: true });
                  setCommandPermissionRequest(null);
                }}
              >
                Allow Once
              </button>
              <button 
                className="settings-btn-primary" 
                style={{ background: '#22c55e' }}
                onClick={() => {
                  setAutoApproveCommands(true);
                  commandPermissionRequest.onResponse({ allowed: true });
                  setCommandPermissionRequest(null);
                }}
              >
                Allow Always
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPanel;
