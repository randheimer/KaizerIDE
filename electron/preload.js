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
  searchFiles: (query, directory, options) => ipcRenderer.invoke('search-files', query, directory, options),
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
  getFileOutline: (filePath) => ipcRenderer.invoke('get-file-outline', filePath),
  revealInExplorer: (filePath) => ipcRenderer.invoke('reveal-in-explorer', filePath),
  copyRelativePath: (filePath, workspacePath) => ipcRenderer.invoke('copy-relative-path', filePath, workspacePath),

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
  
  // PTY Terminal operations
  ptySpawn: (opts) => ipcRenderer.invoke('pty:spawn', opts),
  ptyWrite: (opts) => ipcRenderer.invoke('pty:write', opts),
  ptyResize: (opts) => ipcRenderer.invoke('pty:resize', opts),
  ptyKill: (opts) => ipcRenderer.invoke('pty:kill', opts),
  onPtyData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('pty:data', listener);
    return () => ipcRenderer.removeListener('pty:data', listener);
  },
  onPtyExit: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('pty:exit', listener);
    return () => ipcRenderer.removeListener('pty:exit', listener);
  },

  // Git operations
  gitStatus: (repoPath) => ipcRenderer.invoke('git:status', repoPath),
  gitDiff: (repoPath, file) => ipcRenderer.invoke('git:diff', repoPath, file),
  gitDiffStaged: (repoPath, file) => ipcRenderer.invoke('git:diff-staged', repoPath, file),
  gitStage: (repoPath, files) => ipcRenderer.invoke('git:stage', repoPath, files),
  gitUnstage: (repoPath, files) => ipcRenderer.invoke('git:unstage', repoPath, files),
  gitCommit: (repoPath, message) => ipcRenderer.invoke('git:commit', repoPath, message),
  gitLog: (repoPath, maxCount) => ipcRenderer.invoke('git:log', repoPath, maxCount),
  gitBranches: (repoPath) => ipcRenderer.invoke('git:branches', repoPath),
  gitCheckout: (repoPath, branch) => ipcRenderer.invoke('git:checkout', repoPath, branch),
  gitIsRepo: (dirPath) => ipcRenderer.invoke('git:is-repo', dirPath),
  gitBlame: (repoPath, filePath) => ipcRenderer.invoke('git:blame', repoPath, filePath),
  gitShow: (repoPath, commitHash) => ipcRenderer.invoke('git:show', repoPath, commitHash),
  gitDiffCommit: (repoPath, commitHash, file) => ipcRenderer.invoke('git:diff-commit', repoPath, commitHash, file),

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
