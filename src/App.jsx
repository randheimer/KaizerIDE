import React, { useEffect, Suspense, lazy, useCallback, useRef, useState } from 'react';
import TitleBar from './components/Layout/TitleBar';
import FileExplorer from './components/Sidebar/FileExplorer';
import EditorArea from './components/Editor/EditorArea';
import ChatPanel from './components/AI/chat/ChatPanel';
import TerminalPanel from './components/Terminal/TerminalPanel';
import StatusBar from './components/Common/StatusBar';
import ResizeHandle from './components/Common/ResizeHandle';
import ErrorToast from './components/Common/ErrorToast';
import Toaster from './components/Common/Toaster';
import { indexer } from './lib/indexer';
import { useWorkspaceStore } from './lib/stores/workspaceStore';
import { useEditorStore } from './lib/stores/editorStore';
import { useUIStore } from './lib/stores/uiStore';
import './App.css';

// Expose indexer globally for debugging
if (typeof window !== 'undefined') {
  window.indexer = indexer;
}

// Lazy-load modals to keep initial bundle small.
const SettingsModal = lazy(() => import('./components/Modals/SettingsModal'));
const FilePicker = lazy(() => import('./components/Common/FilePicker'));
const HelpModal = lazy(() => import('./components/UI/HelpModal'));
const RemoteConnectionModal = lazy(() => import('./components/Modals/RemoteConnectionModal'));
const CommandPalette = lazy(() => import('./components/Common/CommandPalette'));

// Utility: Normalize file paths to use consistent separators (Windows backslashes)
const normalizePath = (path) => {
  if (!path) return path;
  return path.replace(/\//g, '\\');
};

function App() {
  // ── Workspace store ──────────────────────────────────────────────────
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const setWorkspacePath = useWorkspaceStore((s) => s.setWorkspacePath);
  const sshConnection = useWorkspaceStore((s) => s.sshConnection);
  const setSSHConnection = useWorkspaceStore((s) => s.setSSHConnection);
  const settings = useWorkspaceStore((s) => s.settings);
  const setSettings = useWorkspaceStore((s) => s.setSettings);

  // ── Editor store ─────────────────────────────────────────────────────
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabPath = useEditorStore((s) => s.activeTabPath);
  const setActiveTabPath = useEditorStore((s) => s.setActiveTabPath);
  const addTab = useEditorStore((s) => s.addTab);
  const updateTab = useEditorStore((s) => s.updateTab);
  const removeTab = useEditorStore((s) => s.removeTab);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);
  const markAllClean = useEditorStore((s) => s.markAllClean);
  const updateContent = useEditorStore((s) => s.updateContent);
  const aiFileChanges = useEditorStore((s) => s.aiFileChanges);
  const setAiFileChange = useEditorStore((s) => s.setAiFileChange);
  const clearAiFileChanges = useEditorStore((s) => s.clearAiFileChanges);
  const findTab = useEditorStore((s) => s.findTab);

  // ── UI store ─────────────────────────────────────────────────────────
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const terminalVisible = useUIStore((s) => s.terminalVisible);
  const setTerminalVisible = useUIStore((s) => s.setTerminalVisible);
  const chatVisible = useUIStore((s) => s.chatVisible);
  const toggleChat = useUIStore((s) => s.toggleChat);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const terminalHeight = useUIStore((s) => s.terminalHeight);
  const setTerminalHeight = useUIStore((s) => s.setTerminalHeight);
  const chatWidth = useUIStore((s) => s.chatWidth);
  const setChatWidth = useUIStore((s) => s.setChatWidth);
  const showSettings = useUIStore((s) => s.showSettings);
  const openSettings = useUIStore((s) => s.openSettings);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const showHelpModal = useUIStore((s) => s.showHelpModal);
  const setShowHelpModal = useUIStore((s) => s.setShowHelpModal);
  const showSSHModal = useUIStore((s) => s.showSSHModal);
  const setShowSSHModal = useUIStore((s) => s.setShowSSHModal);
  const showCommandPalette = useUIStore((s) => s.showCommandPalette);
  const setShowCommandPalette = useUIStore((s) => s.setShowCommandPalette);
  const filePickerOpen = useUIStore((s) => s.filePickerOpen);
  const filePickerStartPath = useUIStore((s) => s.filePickerStartPath);
  const filePickerMode = useUIStore((s) => s.filePickerMode);
  const openFilePicker = useUIStore((s) => s.openFilePicker);
  const closeFilePicker = useUIStore((s) => s.closeFilePicker);
  const errorMessage = useUIStore((s) => s.errorMessage);
  const setErrorMessage = useUIStore((s) => s.setErrorMessage);
  const clearError = useUIStore((s) => s.clearError);

  // ── Cursor / language state (fed by EditorArea via events) ────────────
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [languageMode, setLanguageMode] = useState('plaintext');

  useEffect(() => {
    const handleCursorChange = (e) => setCursorPosition(e.detail);
    const handleLanguageChange = (e) => setLanguageMode(e.detail);
    window.addEventListener('kaizer:cursor-change', handleCursorChange);
    window.addEventListener('kaizer:language-change', handleLanguageChange);
    return () => {
      window.removeEventListener('kaizer:cursor-change', handleCursorChange);
      window.removeEventListener('kaizer:language-change', handleLanguageChange);
    };
  }, []);

  // Debounce tracker for handleOpenPath
  const lastOpenPathCall = useRef({ path: null, timestamp: 0 });

  // Helper function to open a file in the editor
  const handleFileOpen = useCallback(async (filePath, options = {}) => {
    const normalizedPath = sshConnection ? filePath : normalizePath(filePath);
    const existingTab = findTab(normalizedPath);

    if (existingTab) {
      setActiveTabPath(normalizedPath);
      if (options.showDiff && options.newContent) {
        updateTab(normalizedPath, {
          showDiff: true,
          newContent: options.newContent,
          changeType: options.changeType,
          originalContent: existingTab.content,
        });
      }
      return;
    }

    const result = sshConnection
      ? await window.electron.readRemoteFile(normalizedPath)
      : await window.electron.readFile(normalizedPath);

    if (result.success) {
      const fileName = normalizedPath.split(/[\\/]/).pop();
      const aiChange = aiFileChanges[normalizedPath];

      addTab({
        path: normalizedPath,
        name: fileName,
        content: result.content,
        dirty: false,
        showDiff: aiChange ? true : (options.showDiff || false),
        newContent: aiChange ? aiChange.newContent : (options.newContent || null),
        changeType: aiChange ? aiChange.changeType : (options.changeType || null),
        originalContent: aiChange ? aiChange.oldContent : result.content,
        isRemote: !!sshConnection,
      });
      setActiveTabPath(normalizedPath);
    }
  }, [sshConnection, aiFileChanges, findTab, setActiveTabPath, updateTab, addTab]);

  // Helper function to handle paths from context menu
  const handleOpenPath = useCallback(async (p, options = {}) => {
    if (!p) return;
    const normalizedPath = normalizePath(p);

    const now = Date.now();
    if (lastOpenPathCall.current.path === normalizedPath &&
        now - lastOpenPathCall.current.timestamp < 100) {
      return;
    }
    lastOpenPathCall.current = { path: normalizedPath, timestamp: now };

    const info = await window.electron.getFileInfo(normalizedPath);

    if (info.isDirectory) {
      setWorkspacePath(normalizedPath);
      await window.electron.saveWorkspacePath(normalizedPath);
      const tree = await window.electron.getFileTree(normalizedPath);
      if (tree.success) {
        window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: tree.tree }));
      }
    } else {
      if (options.fileOnly) {
        await handleFileOpen(normalizedPath);
      } else {
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
  }, [setWorkspacePath, handleFileOpen]);

  // Load workspace path on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      if (window.electron) {
        const contextPath = await window.electron.getOpenPath();
        if (contextPath) return;
      }
      const result = await window.electron.loadWorkspacePath();
      if (result.success && result.workspacePath) {
        setWorkspacePath(result.workspacePath);
      }
    };
    loadWorkspace();
  }, [setWorkspacePath]);

  // Trigger indexing when workspace changes
  useEffect(() => {
    if (!workspacePath) return;
    if (indexer.workspacePath && indexer.workspacePath !== workspacePath) {
      indexer.indexStore.clear();
    }
    indexer.loadFromStorage(workspacePath).then(cached => {
      if (!cached) indexer.startIndexing(workspacePath);
    });
  }, [workspacePath]);

  // Handle context menu integration
  useEffect(() => {
    let cleanupCallback = null;
    let fileSystemCleanup = null;
    let sshModalCleanup = null;

    async function checkOpenPath() {
      if (!window.electron) return;
      const startupPath = await window.electron.getOpenPath();
      if (startupPath) await handleOpenPath(startupPath, { fileOnly: true });
    }
    checkOpenPath();

    if (window.electron?.onOpenPath) {
      cleanupCallback = window.electron.onOpenPath((p) => handleOpenPath(p, { fileOnly: true }));
    }

    if (window.electron?.onFileSystemChanged) {
      fileSystemCleanup = window.electron.onFileSystemChanged((data) => {
        if (data.tree) {
          window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: data.tree }));
        }
        if (workspacePath && indexer.enabled) {
          window.dispatchEvent(new CustomEvent('kaizer:file-system-changed', { detail: data }));
        }
      });
    }

    const handleOpenSSHModal = () => setShowSSHModal(true);
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('open-ssh-modal', handleOpenSSHModal);
      sshModalCleanup = () => window.electron.ipcRenderer.removeListener('open-ssh-modal', handleOpenSSHModal);
    }

    const handleOpenRemoteWorkspace = (event) => {
      const { path, connection } = event.detail;
      setWorkspacePath(path);
      setSSHConnection(connection);
      window.dispatchEvent(new CustomEvent('kaizer:tree-refresh-remote', { detail: { path, remoteMode: true } }));
    };
    window.addEventListener('kaizer:open-remote-workspace', handleOpenRemoteWorkspace);

    return () => {
      if (cleanupCallback) cleanupCallback();
      if (fileSystemCleanup) fileSystemCleanup();
      if (sshModalCleanup) sshModalCleanup();
      window.removeEventListener('kaizer:open-remote-workspace', handleOpenRemoteWorkspace);
    };
  }, [workspacePath, handleOpenPath, setShowSSHModal, setWorkspacePath, setSSHConnection]);

  const handleOpenFolder = useCallback(async () => {
    openFilePicker(workspacePath || '', 'folder');
  }, [workspacePath, openFilePicker]);

  const handleTabSelect = useCallback((path) => setActiveTabPath(path), [setActiveTabPath]);
  const handleTabClose = useCallback((path) => removeTab(path), [removeTab]);
  const handleContentChange = useCallback((newContent) => {
    if (activeTabPath) updateContent(activeTabPath, newContent);
  }, [activeTabPath, updateContent]);

  const handleSettingsSave = useCallback((newSettings) => {
    setSettings(newSettings);
    closeSettings();
  }, [setSettings, closeSettings]);

  // Keyboard shortcuts & event listeners
  useEffect(() => {
    const saveActiveTab = async () => {
      if (!activeTabPath) return;
      const activeTab = findTab(activeTabPath);
      if (!activeTab || !activeTab.dirty) return;
      const result = await window.electron.writeFile(activeTabPath, activeTab.content);
      if (result.success) {
        updateTab(activeTabPath, { dirty: false });
      } else {
        setErrorMessage(`Failed to save file: ${result.error}`);
      }
    };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveTab();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        openSettings();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kaizer:focus-chat'));
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kaizer:new-chat'));
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        toggleChat();
      }
    };

    const handleFileWritten = (event) => {
      const { path, type, content, originalContent, oldContent, newContent } = event.detail;
      const normalizedPath = normalizePath(path);

      setAiFileChange(normalizedPath, {
        oldContent: oldContent || originalContent || '',
        newContent: newContent || content || '',
        changeType: type,
      });

      if (workspacePath) {
        window.electron.getFileTree(workspacePath).then(result => {
          if (result.success) {
            window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: result.tree }));
          }
        });
      }

      const tab = findTab(normalizedPath);
      const previewTab = findTab(`${normalizedPath}:preview`);

      if (tab) {
        const tabOriginalContent = tab.showDiff ? tab.originalContent : tab.content;
        updateTab(normalizedPath, {
          content: tabOriginalContent,
          newContent: newContent || content,
          dirty: false,
          showDiff: true,
          changeType: type,
          originalContent: tabOriginalContent,
        });
        setActiveTabPath(normalizedPath);
      }

      if (previewTab) {
        updateTab(`${normalizedPath}:preview`, { content: newContent || content });
      }

      if (!tab && !previewTab) {
        if (path.includes('.kaizer') && path.includes('plans') && path.endsWith('.md')) {
          const fileName = path.split(/[\\/]/).pop();
          addTab({
            path: `${path}:preview`,
            name: `${fileName} (Preview)`,
            content: content,
            dirty: false,
            isPreview: true,
          });
          setActiveTabPath(`${path}:preview`);
        }
      }
    };

    const handleOpenFilePicker = (event) => {
      openFilePicker(event.detail.startPath || workspacePath || '');
    };

    const handleOpenPreview = (event) => {
      const { originalPath, content } = event.detail;
      const fileName = originalPath.split(/[\\/]/).pop();
      const previewPath = `${originalPath}:preview`;
      if (findTab(previewPath)) { setActiveTabPath(previewPath); return; }
      addTab({
        path: previewPath,
        name: `${fileName} [Preview]`,
        content,
        dirty: false,
        isPreview: true,
        originalPath,
      });
      setActiveTabPath(previewPath);
    };

    const handleOpenIncludeFile = async (event) => {
      const { path } = event.detail;
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

    const handleOpenFile = async (e) => {
      const { path, showPreview } = e.detail;
      if (!path) return;
      const result = await window.electron.readFile(path);
      if (!result.success) { setErrorMessage(`Failed to open file: ${result.error}`); return; }
      const fileName = path.split(/[\\/]/).pop();

      if (showPreview && path.endsWith('.md')) {
        const previewPath = `${path}:preview`;
        if (!findTab(previewPath)) {
          addTab({ path: previewPath, name: `${fileName} (Preview)`, content: result.content, dirty: false, isPreview: true });
        }
        setActiveTabPath(previewPath);
        return;
      }

      if (findTab(path)) { setActiveTabPath(path); return; }
      addTab({ path, name: fileName, content: result.content, dirty: false });
      setActiveTabPath(path);
    };

    const handleOpenSettings = (event) => {
      const { tab } = event.detail || {};
      openSettings(tab);
    };

    const handleClearDiff = () => clearAiFileChanges();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kaizer:file-written', handleFileWritten);
    window.addEventListener('kaizer:open-filepicker', handleOpenFilePicker);
    window.addEventListener('kaizer:open-file', handleOpenFile);
    window.addEventListener('kaizer:open-preview', handleOpenPreview);
    window.addEventListener('kaizer:open-include-file', handleOpenIncludeFile);
    window.addEventListener('kaizer:close-terminal', () => setTerminalVisible(false));
    window.addEventListener('kaizer:new-terminal', () => setTerminalVisible(true));
    window.addEventListener('kaizer:clear-diff', handleClearDiff);
    window.addEventListener('kaizer:open-settings', handleOpenSettings);
    window.addEventListener('kaizer:open-ssh-modal', () => setShowSSHModal(true));

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kaizer:file-written', handleFileWritten);
      window.removeEventListener('kaizer:open-filepicker', handleOpenFilePicker);
      window.removeEventListener('kaizer:open-file', handleOpenFile);
      window.removeEventListener('kaizer:open-preview', handleOpenPreview);
      window.removeEventListener('kaizer:open-include-file', handleOpenIncludeFile);
      window.removeEventListener('kaizer:close-terminal', () => setTerminalVisible(false));
      window.removeEventListener('kaizer:new-terminal', () => setTerminalVisible(true));
      window.removeEventListener('kaizer:clear-diff', handleClearDiff);
      window.removeEventListener('kaizer:open-settings', handleOpenSettings);
      window.removeEventListener('kaizer:open-ssh-modal', () => setShowSSHModal(true));
    };
  }, [activeTabPath, tabs, workspacePath, findTab, updateTab, removeTab, closeAllTabs,
      markAllClean, handleFileOpen, handleOpenFolder, setWorkspacePath, setErrorMessage,
      toggleSidebar, setShowHelpModal, openSettings, setTerminalVisible, toggleChat]);

  const handleMenuAction = useCallback(async (action) => {
    switch (action) {
      case 'new-file':
        if (workspacePath) {
          const fileName = prompt('Enter file name:');
          if (fileName) {
            const newFilePath = `${workspacePath}\\${fileName}`;
            const result = await window.electron.writeFile(newFilePath, '');
            if (result.success) {
              handleFileOpen(newFilePath);
              window.electron.getFileTree(workspacePath).then(res => {
                if (res.success) window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: res.tree }));
              });
            } else {
              setErrorMessage(`Failed to create file: ${result.error}`);
            }
          }
        } else {
          setErrorMessage('Please open a folder first');
        }
        break;
      case 'open-folder': handleOpenFolder(); break;
      case 'save-file': {
        if (!activeTabPath) break;
        const activeTab = findTab(activeTabPath);
        if (!activeTab || !activeTab.dirty) break;
        const result = await window.electron.writeFile(activeTabPath, activeTab.content);
        if (result.success) updateTab(activeTabPath, { dirty: false });
        else setErrorMessage(`Failed to save file: ${result.error}`);
        break;
      }
      case 'save-all':
        for (const tab of tabs) {
          if (tab.dirty) await window.electron.writeFile(tab.path, tab.content);
        }
        markAllClean();
        break;
      case 'close-tab':
        if (activeTabPath) removeTab(activeTabPath);
        break;
      case 'close-folder':
        setWorkspacePath(null);
        closeAllTabs();
        break;
      case 'toggle-sidebar': toggleSidebar(); break;
      case 'toggle-explorer': toggleSidebar(); break;
      case 'show-docs': setShowHelpModal(true); break;
      case 'open-settings': openSettings(); break;
      case 'new-terminal':
        setTerminalVisible(true);
        window.dispatchEvent(new CustomEvent('kaizer:new-terminal'));
        break;
      default: console.log('Menu action not implemented:', action);
    }
  }, [workspacePath, activeTabPath, tabs, findTab, updateTab, removeTab, closeAllTabs,
      markAllClean, handleFileOpen, handleOpenFolder, setWorkspacePath, setErrorMessage,
      toggleSidebar, setShowHelpModal, openSettings, setTerminalVisible]);

  return (
    <div className="app">
      <TitleBar
        workspacePath={workspacePath}
        onSettingsClick={() => openSettings()}
        onMenuAction={handleMenuAction}
        chatVisible={chatVisible}
        onToggleChat={toggleChat}
      />
      <div className="main-content">
        {sidebarVisible && (
          <>
            <div style={{ width: sidebarWidth, minWidth: 0, flexShrink: 0, overflow: 'hidden' }}>
              <FileExplorer
                workspacePath={workspacePath}
                activeFile={activeTabPath}
                onFileOpen={handleFileOpen}
                onOpenFolder={handleOpenFolder}
                onOpenFilePicker={(startPath) => openFilePicker(startPath)}
                visible={sidebarVisible}
              />
            </div>
            <ResizeHandle
              direction="horizontal"
              onResize={(delta) => {
                const next = Math.min(500, Math.max(180, sidebarWidth - delta));
                setSidebarWidth(next);
              }}
            />
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <EditorArea
            tabs={tabs}
            activeTab={activeTabPath}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
          />
          {terminalVisible && (
            <>
              <ResizeHandle
                direction="vertical"
                onResize={(delta) => {
                  const next = Math.min(600, Math.max(120, terminalHeight - delta));
                  setTerminalHeight(next);
                }}
              />
              <div style={{ height: terminalHeight, flexShrink: 0, overflow: 'hidden' }}>
                <TerminalPanel workspacePath={workspacePath} />
              </div>
            </>
          )}
        </div>
        {chatVisible && (
          <>
            <ResizeHandle
              direction="horizontal"
              onResize={(delta) => {
                const next = Math.min(600, Math.max(260, chatWidth + delta));
                setChatWidth(next);
              }}
            />
            <div style={{ width: chatWidth, minWidth: 0, flexShrink: 0, overflow: 'hidden' }}>
              <ChatPanel
                workspacePath={workspacePath}
                activeFile={activeTabPath}
                activeFileContent={findTab(activeTabPath)?.content}
                settings={settings}
                onOpenFile={handleFileOpen}
              />
            </div>
          </>
        )}
      </div>
      <StatusBar
        activeFile={activeTabPath}
        modelName={settings.selectedModel.name}
        endpoint={settings.endpoint}
        cursorPosition={cursorPosition}
        languageMode={languageMode}
        chatVisible={chatVisible}
        onToggleChat={toggleChat}
      />
      {errorMessage && <ErrorToast message={errorMessage} onClose={clearError} />}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={handleSettingsSave}
            onClose={closeSettings}
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
                const folderPath = items[0].path;
                setWorkspacePath(folderPath);
                window.electron.saveWorkspacePath(folderPath);
                closeFilePicker();
              } else {
                window.dispatchEvent(new CustomEvent('kaizer:attach-context', { detail: { items } }));
                closeFilePicker();
              }
            }}
            onClose={closeFilePicker}
          />
        )}
        {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
        {showSSHModal && (
          <RemoteConnectionModal
            onClose={() => setShowSSHModal(false)}
            onConnect={(connection) => setSSHConnection(connection)}
          />
        )}
        {showCommandPalette && (
          <CommandPalette
            open={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            commands={[
              { id: 'file.new', group: 'File', title: 'New File', shortcut: 'Ctrl+N', run: () => handleMenuAction('new-file') },
              { id: 'file.openFolder', group: 'File', title: 'Open Folder…', shortcut: 'Ctrl+K Ctrl+O', run: () => handleMenuAction('open-folder') },
              { id: 'file.save', group: 'File', title: 'Save', shortcut: 'Ctrl+S', run: () => handleMenuAction('save-file') },
              { id: 'file.saveAll', group: 'File', title: 'Save All', shortcut: 'Ctrl+K S', run: () => handleMenuAction('save-all') },
              { id: 'file.closeTab', group: 'File', title: 'Close Tab', shortcut: 'Ctrl+W', run: () => handleMenuAction('close-tab') },
              { id: 'file.closeFolder', group: 'File', title: 'Close Folder', run: () => handleMenuAction('close-folder') },
              { id: 'view.toggleSidebar', group: 'View', title: 'Toggle Sidebar', shortcut: 'Ctrl+B', run: () => handleMenuAction('toggle-sidebar') },
              { id: 'view.toggleTerminal', group: 'View', title: 'New Terminal', run: () => handleMenuAction('new-terminal') },
              { id: 'view.toggleTerminalHide', group: 'View', title: 'Toggle Terminal Panel', run: () => setTerminalVisible((v) => !v) },
              { id: 'view.toggleChat', group: 'View', title: 'Toggle AI Chat Panel', shortcut: 'Ctrl+Shift+C', run: () => toggleChat() },
              { id: 'app.settings', group: 'Preferences', title: 'Open Settings', shortcut: 'Ctrl+,', run: () => handleMenuAction('open-settings') },
              { id: 'app.help', group: 'Help', title: 'Show Docs / Help', run: () => handleMenuAction('show-docs') },
              { id: 'remote.ssh', group: 'Remote', title: 'Connect via SSH…', run: () => setShowSSHModal(true) },
              { id: 'workspace.reindex', group: 'Workspace', title: 'Reindex Workspace', run: () => { if (workspacePath) indexer.reindex(workspacePath); } },
            ]}
          />
        )}
      </Suspense>
      <Toaster />
    </div>
  );
}

export default App;
