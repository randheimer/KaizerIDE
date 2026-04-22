import React, { useState, useEffect } from 'react';
import TitleBar from './components/Layout/TitleBar';
import FileExplorer from './components/Sidebar/FileExplorer';
import EditorArea from './components/Editor/EditorArea';
import ChatPanel from './components/AI/chat/ChatPanel';
import TerminalPanel from './components/Terminal/TerminalPanel';
import StatusBar from './components/Common/StatusBar';
import SettingsModal from './components/Modals/SettingsModal';
import ErrorToast from './components/Common/ErrorToast';
import FilePicker from './components/Common/FilePicker';
import HelpModal from './components/UI/HelpModal';
import './App.css';

const DEFAULT_SETTINGS = {
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

  // Utility: Normalize file paths to use consistent separators (Windows backslashes)
  const normalizePath = (path) => {
    if (!path) return path;
    return path.replace(/\//g, '\\');
  };

  // Debounce tracker for handleOpenPath
  const lastOpenPathCall = React.useRef({ path: null, timestamp: 0 });

  // Helper function to open a file in the editor
  const handleFileOpen = async (filePath, options = {}) => {
    const normalizedPath = normalizePath(filePath);
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

    const result = await window.electron.readFile(normalizedPath);
    
    if (result.success) {
      const fileName = normalizedPath.split(/[\\/]/).pop();
      const newTab = {
        path: normalizedPath,
        name: fileName,
        content: result.content,
        dirty: false,
        showDiff: options.showDiff || false,
        newContent: options.newContent || null,
        changeType: options.changeType || null,
        originalContent: result.content
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

  // Handle context menu integration - consolidated single listener
  useEffect(() => {
    let cleanupCallback = null;

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

    return () => {
      if (cleanupCallback) {
        cleanupCallback();
      }
    };
  }, []);

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
      }
    };

    const handleFileWritten = (event) => {
      const { path, type, content, originalContent } = event.detail;
      
      // Refresh file tree
      if (workspacePath) {
        window.electron.getFileTree(workspacePath).then(result => {
          if (result.success) {
            window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: result.tree }));
          }
        });
      }
      
      // Check if file is currently open in a tab
      const tab = tabs.find(t => t.path === path);
      if (tab) {
        // Update tab with diff view
        setTabs(prev => prev.map(t => 
          t.path === path ? { 
            ...t, 
            content: originalContent || t.content, // Keep original content for diff
            newContent: content, // New content from AI
            dirty: false,
            showDiff: true,
            changeType: type,
            originalContent: originalContent || t.content
          } : t
        ));
        
        // Make sure this tab is active so user sees the diff
        setActiveTabPath(path);
      } else {
        // File not open, open it with diff view
        handleFileOpen(path, {
          showDiff: true,
          newContent: content,
          changeType: type,
          originalContent: originalContent
        });
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kaizer:file-written', handleFileWritten);
    window.addEventListener('kaizer:open-filepicker', handleOpenFilePicker);
    window.addEventListener('kaizer:open-preview', handleOpenPreview);
    window.addEventListener('kaizer:open-include-file', handleOpenIncludeFile);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kaizer:file-written', handleFileWritten);
      window.removeEventListener('kaizer:open-filepicker', handleOpenFilePicker);
      window.removeEventListener('kaizer:open-preview', handleOpenPreview);
      window.removeEventListener('kaizer:open-include-file', handleOpenIncludeFile);
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
          <TerminalPanel workspacePath={workspacePath} />
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
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}
      {errorMessage && (
        <ErrorToast
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
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
    </div>
  );
}

export default App;
