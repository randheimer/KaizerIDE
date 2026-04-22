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
  }
});
