import React, { useState, useEffect, Suspense, lazy } from 'react';
import TitleBar from './components/Layout/TitleBar';
import FileExplorer from './components/Sidebar/FileExplorer';
import EditorArea from './components/Editor/EditorArea';
import ChatPanel from './components/AI/chat/ChatPanel';
import TerminalPanel from './components/Terminal/TerminalPanel';
import StatusBar from './components/Common/StatusBar';
import ErrorToast from './components/Common/ErrorToast';
import Toaster from './components/Common/Toaster';
import { indexer } from './lib/indexer';
import './App.css';

// Expose indexer globally for debugging
if (typeof window !== 'undefined') {
  window.indexer = indexer;
}

// Lazy-load modals to keep initial bundle small.
// These are only mounted when their boolean flag is true.
const SettingsModal = lazy(() => import('./components/Modals/SettingsModal'));
const FilePicker = lazy(() => import('./components/Common/FilePicker'));
const HelpModal = lazy(() => import('./components/UI/HelpModal'));
const RemoteConnectionModal = lazy(() => import('./components/Modals/RemoteConnectionModal'));
const CommandPalette = lazy(() => import('./components/Common/CommandPalette'));

const DEFAULT_SETTINGS = {
  provider: "openai-compatible",
  endpoint: "http://localhost:20128/v1",
  apiKey: "",
  selectedModel: { id: "kr/claude-sonnet-4.5", name: "Claude Sonnet 4.5", maxOutputTokens: 16000 },
  models: [
    { id: "kr/claude-sonnet-4.5", name: "Claude Sonnet 4.5", maxOutputTokens: 16000 },
    { id: "kr/claude-haiku-4.5", name: "Claude Haiku 4.5", maxOutputTokens: 16000 },
    { id: "cx/gpt-5.3-codex", name: "GPT-5.3 Codex", maxOutputTokens: 16000 },
    { id: "qw/qwen3-coder-plus", name: "Qwen3 Coder+", maxOutputTokens: 16000 },
    { id: "gemini/gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash", maxOutputTokens: 16000 }
  ],
  systemPrompts: {}
};

function App() {
  const [workspacePath, setWorkspacePath] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('kaizer-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [filePickerStartPath, setFilePickerStartPath] = useState('');
  const [filePickerMode, setFilePickerMode] = useState('attach'); // 'attach' or 'folder'
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [showSSHModal, setShowSSHModal] = useState(false);
  const [sshConnection, setSSHConnection] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  // Track AI file changes globally so diff highlighting works when opening files
  const [aiFileChanges, setAiFileChanges] = useState({});

  // Utility: Normalize file paths to use consistent separators (Windows backslashes)
  const normalizePath = (path) => {
    if (!path) return path;
    return path.replace(/\//g, '\\');
  };

  // Debounce tracker for handleOpenPath
  const lastOpenPathCall = React.useRef({ path: null, timestamp: 0 });

  // Helper function to open a file in the editor
  const handleFileOpen = async (filePath, options = {}) => {
    // Don't normalize remote paths (they use forward slashes)
    const normalizedPath = sshConnection ? filePath : normalizePath(filePath);
    const existingTab = tabs.find(tab => tab.path === normalizedPath);
    
    if (existingTab) {
      setActiveTabPath(normalizedPath);
      
      // If diff view is requested, update the tab with diff info
      if (options.showDiff && options.newContent) {
        setTabs(prev => prev.map(tab => 
          tab.path === normalizedPath 
            ? { 
                ...tab, 
                showDiff: true, 
                newContent: options.newContent,
                changeType: options.changeType,
                originalContent: tab.content 
              }
            : tab
        ));
      }
      return;
    }

    // Use remote or local file reading based on SSH connection
    const result = sshConnection 
      ? await window.electron.readRemoteFile(normalizedPath)
      : await window.electron.readFile(normalizedPath);
    
    if (result.success) {
      const fileName = normalizedPath.split(/[\\/]/).pop();
      
      // Check if this file has pending AI changes
      const aiChange = aiFileChanges[normalizedPath];
      
      const newTab = {
        path: normalizedPath,
        name: fileName,
        content: result.content,
        dirty: false,
        showDiff: aiChange ? true : (options.showDiff || false),
        newContent: aiChange ? aiChange.newContent : (options.newContent || null),
        changeType: aiChange ? aiChange.changeType : (options.changeType || null),
        originalContent: aiChange ? aiChange.oldContent : result.content,
        isRemote: !!sshConnection
      };
      
      setTabs(prev => [...prev, newTab]);
      setActiveTabPath(normalizedPath);
    }
  };

  // Helper function to handle paths from context menu
  const handleOpenPath = async (p, options = {}) => {
    if (!p) return;
    
    const normalizedPath = normalizePath(p);
    
    // Debounce: prevent duplicate calls within 100ms
    const now = Date.now();
    if (lastOpenPathCall.current.path === normalizedPath && 
        now - lastOpenPathCall.current.timestamp < 100) {
      console.log('[App] Debounced duplicate handleOpenPath call for:', normalizedPath);
      return;
    }
    lastOpenPathCall.current = { path: normalizedPath, timestamp: now };
    
    // Check if path is file or folder
    const info = await window.electron.getFileInfo(normalizedPath);
    
    if (info.isDirectory) {
      // Open as workspace
      console.log('[App] Opening folder as workspace:', normalizedPath);
      setWorkspacePath(normalizedPath);
      await window.electron.saveWorkspacePath(normalizedPath);
      
      const tree = await window.electron.getFileTree(normalizedPath);
      if (tree.success) {
        window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: tree.tree }));
      }
    } else {
      // It's a file
      console.log('[App] Opening file:', normalizedPath);
      
      // If fileOnly mode, just open the file without loading workspace
      if (options.fileOnly) {
        await handleFileOpen(normalizedPath);
      } else {
        // Legacy behavior: open parent as workspace, then open the file
        const parentDir = normalizedPath.split(/[\\/]/).slice(0, -1).join('\\') || normalizedPath;
        setWorkspacePath(parentDir);
        await window.electron.saveWorkspacePath(parentDir);
        
        const tree = await window.electron.getFileTree(parentDir);
        if (tree.success) {
          window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: tree.tree }));
        }
        
        await handleFileOpen(normalizedPath);
      }
    }
  };

  // Load workspace path on mount (but skip if we have a context menu path)
  useEffect(() => {
    const loadWorkspace = async () => {
      // Check if we have a context menu path first
      if (window.electron) {
        const contextPath = await window.electron.getOpenPath();
        if (contextPath) {
          // Context menu path will be handled by the other useEffect
          console.log('[App] Skipping workspace load, context menu path detected');
          return;
        }
      }
      
      console.log('[App] Attempting to load workspace path...');
      const result = await window.electron.loadWorkspacePath();
      console.log('[App] loadWorkspacePath result:', result);
      if (result.success && result.workspacePath) {
        console.log('[App] Setting workspacePath to:', result.workspacePath);
        setWorkspacePath(result.workspacePath);
      } else {
        console.log('[App] No workspace path found - you need to open a folder via File → Open Folder');
      }
    };
    loadWorkspace();
  }, []);

  // Trigger indexing when workspace changes
  useEffect(() => {
    if (!workspacePath) return;
    
    console.log('[App] Workspace changed to:', workspacePath);
    
    // Check if workspace actually changed (not just re-render)
    if (indexer.workspacePath && indexer.workspacePath !== workspacePath) {
      console.log('[App] Workspace changed from', indexer.workspacePath, 'to', workspacePath);
      console.log('[App] Clearing old index and starting fresh...');
      indexer.indexStore.clear(); // Clear old index
    }
    
    console.log('[App] Checking index cache...');
    indexer.loadFromStorage(workspacePath).then(cached => {
      if (!cached) {
        console.log('[App] No cache found, starting indexing...');
        indexer.startIndexing(workspacePath);
      } else {
        console.log('[App] Loaded index from cache');
      }
    });
  }, [workspacePath]);

  // Handle context menu integration - consolidated single listener
  useEffect(() => {
    let cleanupCallback = null;
    let fileSystemCleanup = null;
    let sshModalCleanup = null;

    async function checkOpenPath() {
      if (!window.electron) return;
      
      // Method 1: get path that was available at startup
      const startupPath = await window.electron.getOpenPath();
      if (startupPath) {
        console.log('[App] Received path from context menu:', startupPath);
        await handleOpenPath(startupPath, { fileOnly: true });
      }
    }
    
    checkOpenPath();

    // Method 2: listen for paths sent after startup (second instance)
    if (window.electron?.onOpenPath) {
      cleanupCallback = window.electron.onOpenPath((p) => {
        console.log('[App] Received path from second instance:', p);
        handleOpenPath(p, { fileOnly: true });
      });
    }

    // Method 3: listen for file system changes and update file tree
    if (window.electron?.onFileSystemChanged) {
      fileSystemCleanup = window.electron.onFileSystemChanged((data) => {
        console.log('[App] File system changed, refreshing tree and index');
        
        // Update file tree
        if (data.tree) {
          window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: data.tree }));
        }
        
        // Trigger incremental re-indexing (will be implemented in FileWatcher)
        if (workspacePath && indexer.enabled) {
          console.log('[App] Triggering incremental re-index');
          window.dispatchEvent(new CustomEvent('kaizer:file-system-changed', { detail: data }));
        }
      });
    }

    // Method 4: listen for SSH modal trigger from welcome screen
    const handleOpenSSHModal = () => {
      console.log('[App] Opening SSH modal from welcome screen');
      setShowSSHModal(true);
    };

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('open-ssh-modal', handleOpenSSHModal);
      sshModalCleanup = () => {
        window.electron.ipcRenderer.removeListener('open-ssh-modal', handleOpenSSHModal);
      };
    }

    // Method 5: listen for remote workspace open from SSH modal
    const handleOpenRemoteWorkspace = (event) => {
      const { path, connection } = event.detail;
      console.log('[App] Opening remote workspace:', path, connection);
      
      // Set the workspace path to the remote path
      setWorkspacePath(path);
      setSSHConnection(connection);
      
      // Trigger tree refresh with remote path
      window.dispatchEvent(new CustomEvent('kaizer:tree-refresh-remote', { 
        detail: { path, remoteMode: true } 
      }));
    };

    window.addEventListener('kaizer:open-remote-workspace', handleOpenRemoteWorkspace);

    return () => {
      if (cleanupCallback) {
        cleanupCallback();
      }
      if (fileSystemCleanup) {
        fileSystemCleanup();
      }
      if (sshModalCleanup) {
        sshModalCleanup();
      }
      window.removeEventListener('kaizer:open-remote-workspace', handleOpenRemoteWorkspace);
    };
  }, [workspacePath]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveTab();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarVisible(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        // Ctrl+Shift+P → Command Palette
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        // Ctrl+L → focus chat composer
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kaizer:focus-chat'));
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        // Ctrl+Shift+L → new chat
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kaizer:new-chat'));
      }
    };

    const handleFileWritten = (event) => {
      const { path, type, content, originalContent, oldContent, newContent } = event.detail;
      
      // Store AI file changes globally for diff highlighting when file is opened later
      const normalizedPath = normalizePath(path);
      setAiFileChanges(prev => ({
        ...prev,
        [normalizedPath]: {
          oldContent: oldContent || originalContent || '',
          newContent: newContent || content || '',
          changeType: type
        }
      }));
      
      // Refresh file tree
      if (workspacePath) {
        window.electron.getFileTree(workspacePath).then(result => {
          if (result.success) {
            window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: result.tree }));
          }
        });
      }
      
      // Check if file is currently open in a tab (including preview tabs)
      const tab = tabs.find(t => t.path === normalizedPath);
      const previewTab = tabs.find(t => t.path === `${normalizedPath}:preview`);
      
      if (tab) {
        // Update regular tab with diff view
        // Use the tab's existing originalContent if it already has a diff, otherwise use current content
        const tabOriginalContent = tab.showDiff ? tab.originalContent : tab.content;
        
        setTabs(prev => prev.map(t => 
          t.path === normalizedPath ? { 
            ...t, 
            content: tabOriginalContent, // Keep original content for diff
            newContent: newContent || content, // New content from AI
            dirty: false,
            showDiff: true,
            changeType: type,
            originalContent: tabOriginalContent
          } : t
        ));
        
        // Make sure this tab is active so user sees the diff
        setActiveTabPath(normalizedPath);
      }
      
      // Update preview tab in real-time (for plan files)
      if (previewTab) {
        setTabs(prev => prev.map(t => 
          t.path === `${normalizedPath}:preview` ? { 
            ...t, 
            content: newContent || content // Update preview with new content in real-time
          } : t
        ));
      }
      
      if (!tab && !previewTab) {
        // Check if it's a plan file - open in preview mode automatically
        if (path.includes('.kaizer') && path.includes('plans') && path.endsWith('.md')) {
          // Open plan file in preview mode automatically
          const fileName = path.split(/[\\/]/).pop();
          const previewPath = `${path}:preview`;
          
          setTabs(prev => [...prev, {
            path: previewPath,
            name: `${fileName} (Preview)`,
            content: content,
            dirty: false,
            isPreview: true
          }]);
          setActiveTabPath(previewPath);
        }
        // For regular files, don't auto-open them
        // User can manually open from file explorer if needed
      }
    };

    const handleOpenFilePicker = (event) => {
      setFilePickerStartPath(event.detail.startPath || workspacePath || '');
      setFilePickerMode('attach'); // Chat always uses attach mode
      setFilePickerOpen(true);
    };

    const handleOpenPreview = (event) => {
      const { originalPath, content } = event.detail;
      const fileName = originalPath.split(/[\\/]/).pop();
      const previewPath = `${originalPath}:preview`;
      
      // Check if preview already exists
      const existingPreview = tabs.find(t => t.path === previewPath);
      if (existingPreview) {
        setActiveTabPath(previewPath);
        return;
      }
      
      // Create new preview tab
      const previewTab = {
        path: previewPath,
        name: `${fileName} [Preview]`,
        content: content,
        dirty: false,
        isPreview: true,
        originalPath: originalPath
      };
      
      setTabs(prev => [...prev, previewTab]);
      setActiveTabPath(previewPath);
    };

    const handleOpenIncludeFile = async (event) => {
      const { path } = event.detail;
      
      // Check if file exists and open it
      try {
        const info = await window.electron.getFileInfo(path);
        
        if (info && info.success !== false && !info.isDirectory) {
          await handleFileOpen(path);
        } else {
          setErrorMessage(`Could not find include file: ${path}`);
        }
      } catch (error) {
        setErrorMessage(`Error opening include file: ${error.message}`);
      }
    };

    const handleCloseTerminal = () => {
      setTerminalVisible(false);
    };

    const handleNewTerminal = () => {
      setTerminalVisible(true);
    };
    
    const handleClearDiff = () => {
      // Clear all AI file changes when user accepts or reverts
      setAiFileChanges({});
    };

    const handleOpenSettings = (event) => {
      const { tab } = event.detail || {};
      setShowSettings(true);
      if (tab) {
        // Store the tab to open in a ref or state that SettingsModal can read
        setTimeout(() => {
          setShowSettings(false);
          setTimeout(() => {
            setShowSettings(tab);
          }, 50);
        }, 0);
      }
    };

    const handleOpenSSHModal = () => {
      setShowSSHModal(true);
    };

    const handleOpenFile = async (e) => {
      const { path, showPreview } = e.detail;
      
      if (!path) return;
      
      // Read file content
      const result = await window.electron.readFile(path);
      if (!result.success) {
        setErrorMessage(`Failed to open file: ${result.error}`);
        return;
      }
      
      const fileName = path.split(/[\\/]/).pop();
      
      // If showPreview is true and it's a markdown file, ONLY open preview (not the source tab)
      if (showPreview && path.endsWith('.md')) {
        const previewPath = `${path}:preview`;
        const previewExists = tabs.find(t => t.path === previewPath);
        
        if (!previewExists) {
          setTabs(prev => [...prev, {
            path: previewPath,
            name: `${fileName} (Preview)`,
            content: result.content,
            dirty: false,
            isPreview: true
          }]);
        }
        setActiveTabPath(previewPath);
        return;
      }
      
      // Check if tab already exists
      const existingTab = tabs.find(t => t.path === path);
      if (existingTab) {
        setActiveTabPath(path);
        return;
      }
      
      // Add new tab
      const newTab = {
        path,
        name: fileName,
        content: result.content,
        dirty: false
      };
      
      setTabs(prev => [...prev, newTab]);
      setActiveTabPath(path);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kaizer:file-written', handleFileWritten);
    window.addEventListener('kaizer:open-filepicker', handleOpenFilePicker);
    window.addEventListener('kaizer:open-file', handleOpenFile);
    window.addEventListener('kaizer:open-preview', handleOpenPreview);
    window.addEventListener('kaizer:open-include-file', handleOpenIncludeFile);
    window.addEventListener('kaizer:close-terminal', handleCloseTerminal);
    window.addEventListener('kaizer:new-terminal', handleNewTerminal);
    window.addEventListener('kaizer:clear-diff', handleClearDiff);
    window.addEventListener('kaizer:open-settings', handleOpenSettings);
    window.addEventListener('kaizer:open-ssh-modal', handleOpenSSHModal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kaizer:file-written', handleFileWritten);
      window.removeEventListener('kaizer:open-filepicker', handleOpenFilePicker);
      window.removeEventListener('kaizer:open-file', handleOpenFile);
      window.removeEventListener('kaizer:open-preview', handleOpenPreview);
      window.removeEventListener('kaizer:open-include-file', handleOpenIncludeFile);
      window.removeEventListener('kaizer:close-terminal', handleCloseTerminal);
      window.removeEventListener('kaizer:new-terminal', handleNewTerminal);
      window.removeEventListener('kaizer:clear-diff', handleClearDiff);
      window.removeEventListener('kaizer:open-settings', handleOpenSettings);
      window.removeEventListener('kaizer:open-ssh-modal', handleOpenSSHModal);
    };
  }, [activeTabPath, tabs, workspacePath]);

  const handleOpenFolder = async () => {
    console.log('[App] Opening folder picker...');
    setFilePickerStartPath(workspacePath || '');
    setFilePickerMode('folder');
    setFilePickerOpen(true);
  };

  const handleTabSelect = (path) => {
    setActiveTabPath(path);
  };

  const handleTabClose = (path) => {
    const normalizedPath = normalizePath(path);
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(tab => tab.path === normalizedPath);
      const newTabs = prevTabs.filter(tab => tab.path !== normalizedPath);

      if (activeTabPath === normalizedPath) {
        if (newTabs.length > 0) {
          const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
          setActiveTabPath(newTabs[newActiveIndex].path);
        } else {
          setActiveTabPath(null);
        }
      }
      
      return newTabs;
    });
  };

  const handleContentChange = (newContent) => {
    setTabs(prev => prev.map(tab => {
      if (tab.path === activeTabPath) {
        return { ...tab, content: newContent, dirty: true };
      }
      return tab;
    }));
  };

  const saveActiveTab = async () => {
    if (!activeTabPath) return;

    const activeTab = tabs.find(tab => tab.path === activeTabPath);
    if (!activeTab || !activeTab.dirty) return;

    const result = await window.electron.writeFile(activeTabPath, activeTab.content);
    
    if (result.success) {
      setTabs(prev => prev.map(tab => {
        if (tab.path === activeTabPath) {
          return { ...tab, dirty: false };
        }
        return tab;
      }));
    } else {
      setErrorMessage(`Failed to save file: ${result.error}`);
    }
  };

  const handleSettingsSave = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('kaizer-settings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  const handleMenuAction = async (action) => {
    switch (action) {
      case 'new-file':
        if (workspacePath) {
          const fileName = prompt('Enter file name:');
          if (fileName) {
            const newFilePath = `${workspacePath}\\${fileName}`;
            const result = await window.electron.writeFile(newFilePath, '');
            if (result.success) {
              handleFileOpen(newFilePath);
              // Refresh file tree
              window.electron.getFileTree(workspacePath).then(res => {
                if (res.success) {
                  window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: res.tree }));
                }
              });
            } else {
              setErrorMessage(`Failed to create file: ${result.error}`);
            }
          }
        } else {
          setErrorMessage('Please open a folder first');
        }
        break;
      
      case 'open-folder':
        handleOpenFolder();
        break;
      
      case 'save-file':
        saveActiveTab();
        break;
      
      case 'save-all':
        for (const tab of tabs) {
          if (tab.dirty) {
            await window.electron.writeFile(tab.path, tab.content);
          }
        }
        setTabs(prev => prev.map(tab => ({ ...tab, dirty: false })));
        break;
      
      case 'close-tab':
        if (activeTabPath) {
          handleTabClose(activeTabPath);
        }
        break;
      
      case 'close-folder':
        setWorkspacePath(null);
        setTabs([]);
        setActiveTabPath(null);
        break;
      
      case 'toggle-sidebar':
        setSidebarVisible(prev => !prev);
        break;
      
      case 'toggle-explorer':
        setSidebarVisible(prev => !prev);
        break;
      
      case 'show-docs':
        setShowHelpModal(true);
        break;
      
      case 'open-settings':
        setShowSettings(true);
        break;
      
      case 'new-terminal':
        setTerminalVisible(true);
        window.dispatchEvent(new CustomEvent('kaizer:new-terminal'));
        break;
      
      default:
        console.log('Menu action not implemented:', action);
    }
  };

  return (
    <div className="app">
      <TitleBar 
        workspacePath={workspacePath} 
        onSettingsClick={() => setShowSettings(true)}
        onMenuAction={handleMenuAction}
      />
      <div className="main-content">
        <FileExplorer
          workspacePath={workspacePath}
          activeFile={activeTabPath}
          onFileOpen={handleFileOpen}
          onOpenFolder={handleOpenFolder}
          onOpenFilePicker={(startPath) => {
            setFilePickerStartPath(startPath);
            setFilePickerOpen(true);
          }}
          visible={sidebarVisible}
        />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}>
          <EditorArea
            tabs={tabs}
            activeTab={activeTabPath}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
          />
          {terminalVisible && <TerminalPanel workspacePath={workspacePath} />}
        </div>
        <div style={{
          width: '340px',
          minWidth: '340px',
          maxWidth: '340px',
          height: '100%',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          <ChatPanel 
            workspacePath={workspacePath}
            activeFile={activeTabPath}
            activeFileContent={tabs.find(tab => tab.path === activeTabPath)?.content}
            settings={settings}
            onOpenFile={handleFileOpen}
          />
        </div>
      </div>
      <StatusBar
        activeFile={activeTabPath}
        modelName={settings.selectedModel.name}
        endpoint={settings.endpoint}
      />
      {errorMessage && (
        <ErrorToast
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={handleSettingsSave}
            onClose={() => setShowSettings(false)}
            initialTab={typeof showSettings === 'string' ? showSettings : undefined}
          />
        )}
        {filePickerOpen && (
          <FilePicker
            startPath={filePickerStartPath}
            workspacePath={workspacePath}
            mode={filePickerMode}
            onAttach={(items) => {
              if (filePickerMode === 'folder' && items.length > 0) {
                // Folder selection mode - set as workspace
                const folderPath = items[0].path;
                console.log('[App] Selected folder:', folderPath);
                setWorkspacePath(folderPath);
                window.electron.saveWorkspacePath(folderPath);
                setFilePickerOpen(false);
              } else {
                // File attachment mode - dispatch event
                window.dispatchEvent(new CustomEvent('kaizer:attach-context', { detail: { items } }));
                setFilePickerOpen(false);
              }
            }}
            onClose={() => setFilePickerOpen(false)}
          />
        )}
        {showHelpModal && (
          <HelpModal onClose={() => setShowHelpModal(false)} />
        )}
        {showSSHModal && (
          <RemoteConnectionModal
            onClose={() => setShowSSHModal(false)}
            onConnect={(connection) => {
              setSSHConnection(connection);
              console.log('[App] SSH connected:', connection);
            }}
          />
        )}
        {showCommandPalette && (
          <CommandPalette
            open={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            commands={[
              { id: 'file.new', group: 'File', title: 'New File',
                shortcut: 'Ctrl+N', run: () => handleMenuAction('new-file') },
              { id: 'file.openFolder', group: 'File', title: 'Open Folder…',
                shortcut: 'Ctrl+K Ctrl+O', run: () => handleMenuAction('open-folder') },
              { id: 'file.save', group: 'File', title: 'Save',
                shortcut: 'Ctrl+S', run: () => handleMenuAction('save-file') },
              { id: 'file.saveAll', group: 'File', title: 'Save All',
                shortcut: 'Ctrl+K S', run: () => handleMenuAction('save-all') },
              { id: 'file.closeTab', group: 'File', title: 'Close Tab',
                shortcut: 'Ctrl+W', run: () => handleMenuAction('close-tab') },
              { id: 'file.closeFolder', group: 'File', title: 'Close Folder',
                run: () => handleMenuAction('close-folder') },
              { id: 'view.toggleSidebar', group: 'View', title: 'Toggle Sidebar',
                shortcut: 'Ctrl+B', run: () => handleMenuAction('toggle-sidebar') },
              { id: 'view.toggleTerminal', group: 'View', title: 'New Terminal',
                run: () => handleMenuAction('new-terminal') },
              { id: 'view.toggleTerminalHide', group: 'View', title: 'Toggle Terminal Panel',
                run: () => setTerminalVisible((v) => !v) },
              { id: 'app.settings', group: 'Preferences', title: 'Open Settings',
                shortcut: 'Ctrl+,', run: () => handleMenuAction('open-settings') },
              { id: 'app.help', group: 'Help', title: 'Show Docs / Help',
                run: () => handleMenuAction('show-docs') },
              { id: 'remote.ssh', group: 'Remote', title: 'Connect via SSH…',
                run: () => setShowSSHModal(true) },
              { id: 'workspace.reindex', group: 'Workspace', title: 'Reindex Workspace',
                run: () => {
                  if (workspacePath) indexer.reindex(workspacePath);
                } },
            ]}
          />
        )}
      </Suspense>
      <Toaster />
    </div>
  );
}

export default App;
