const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  getFileTree: (dirPath) => ipcRenderer.invoke('get-file-tree', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  listDir: (dirPath) => ipcRenderer.invoke('list-dir', dirPath),
  runCommand: (command, cwd) => ipcRenderer.invoke('run-command', command, cwd),
  executeCommand: (command, cwd) => ipcRenderer.invoke('execute-command', command, cwd),
  searchFiles: (query, directory) => ipcRenderer.invoke('search-files', query, directory),
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  saveChatHistory: (chatHistory, workspacePath) => ipcRenderer.invoke('save-chat-history', chatHistory, workspacePath),
  loadChatHistory: (workspacePath) => ipcRenderer.invoke('load-chat-history', workspacePath),
  saveAgentSessions: (sessions) => ipcRenderer.invoke('save-agent-sessions', sessions),
  loadAgentSessions: () => ipcRenderer.invoke('load-agent-sessions'),
  createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  saveWorkspacePath: (workspacePath) => ipcRenderer.invoke('save-workspace-path', workspacePath),
  loadWorkspacePath: () => ipcRenderer.invoke('load-workspace-path'),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  
  // Context menu integration - get path passed from command line
  getOpenPath: () => ipcRenderer.invoke('get-open-path'),
  
  // Listen for paths sent after startup (second instance)
  onOpenPath: (callback) => {
    const listener = (event, p) => callback(p);
    ipcRenderer.on('open-path', listener);
    return () => ipcRenderer.removeListener('open-path', listener);
  },
  
  // Listen for file system changes
  onFileSystemChanged: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('file-system-changed', listener);
    return () => ipcRenderer.removeListener('file-system-changed', listener);
  },
  
  // SSH/Remote connection
  connectSSH: (config) => ipcRenderer.invoke('connect-ssh', config),
  disconnectSSH: () => ipcRenderer.invoke('disconnect-ssh'),
  getSSHStatus: () => ipcRenderer.invoke('get-ssh-status'),
  getRemoteFileTree: (dirPath) => ipcRenderer.invoke('get-remote-file-tree', dirPath),
  readRemoteFile: (filePath) => ipcRenderer.invoke('read-remote-file', filePath),
  writeRemoteFile: (filePath, content) => ipcRenderer.invoke('write-remote-file', filePath, content),
  
  // Welcome screen APIs
  getUsername: () => ipcRenderer.invoke('get-username'),
  getRecentWorkspaces: () => ipcRenderer.invoke('get-recent-workspaces'),
  addRecentWorkspace: (workspacePath) => ipcRenderer.invoke('add-recent-workspace', workspacePath),
  openWorkspaceFromWelcome: (workspacePath) => ipcRenderer.invoke('open-workspace-from-welcome', workspacePath),
  openWorkspaceFromWelcomeWithSSH: () => ipcRenderer.invoke('open-workspace-from-welcome-with-ssh'),
  
  // IPC Renderer for custom events
  ipcRenderer: {
    on: (channel, callback) => {
      ipcRenderer.on(channel, callback);
    },
    removeListener: (channel, callback) => {
      ipcRenderer.removeListener(channel, callback);
    }
  }
});
