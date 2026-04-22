import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let openPath = null;

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'release', '__pycache__', '.vscode', '.idea']);

function getOpenPath() {
  // In production: argv = [execPath, '--', path] or [execPath, path]
  // In dev: argv = [electron, main.js, path]
  const args = process.argv.slice(1);
  
  // Filter out electron/chromium internal flags
  const filtered = args.filter(a =>
    !a.startsWith('--') &&
    !a.endsWith('main.js') &&
    !a.endsWith('app.asar') &&
    a.trim() !== '.'
  );
  
  if (filtered.length > 0) {
    const p = filtered[filtered.length - 1];
    // Verify it's an actual path that exists
    try {
      fs.accessSync(p);
      return p;
    } catch {
      return null;
    }
  }
  return null;
}

function buildFileTree(dirPath, depth = 0, maxDepth = 7) {
  if (depth > maxDepth) return null;
  
  try {
    const stats = fs.statSync(dirPath);
    const name = path.basename(dirPath);
    
    if (stats.isDirectory()) {
      if (IGNORED_DIRS.has(name)) return null;
      
      const children = fs.readdirSync(dirPath)
        .map(child => buildFileTree(path.join(dirPath, child), depth + 1, maxDepth))
        .filter(node => node !== null)
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });
      
      return {
        name,
        path: dirPath,
        type: 'dir',
        children,
        expanded: depth === 0
      };
    } else {
      return {
        name,
        path: dirPath,
        type: 'file'
      };
    }
  } catch (err) {
    return null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  // Set Content Security Policy to allow data URLs for fonts
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://cdn.jsdelivr.net; " +
          "font-src 'self' data: blob: https://cdn.jsdelivr.net; " +
          "img-src 'self' data: blob: https:; " +
          "style-src 'self' 'unsafe-inline' data: https://cdn.jsdelivr.net; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net; " +
          "worker-src 'self' blob: data:; " +
          "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://cdn.jsdelivr.net https://*;"
        ]
      }
    });
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // After page loads, send the open path to renderer
  mainWindow.webContents.once('did-finish-load', () => {
    if (openPath) {
      mainWindow.webContents.send('open-path', openPath);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Handle single instance lock - when app is already running and user right-clicks another folder
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const secondArgs = argv.filter(a =>
      !a.startsWith('--') &&
      !a.endsWith('main.js') &&
      !a.endsWith('app.asar') &&
      a.trim() !== '.'
    );
    const secondPath = secondArgs[secondArgs.length - 1];
    
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      const win = wins[0];
      if (win.isMinimized()) win.restore();
      win.focus();
      if (secondPath) {
        try {
          fs.accessSync(secondPath);
          win.webContents.send('open-path', secondPath);
        } catch {}
      }
    }
  });
}

app.whenReady().then(() => {
  // Get the path from command line arguments
  openPath = getOpenPath();
  
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('get-open-path', () => {
  return openPath;
});

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('get-file-tree', async (event, dirPath) => {
  try {
    const tree = buildFileTree(dirPath);
    return { success: true, tree };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-dir', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = entries.map(entry => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      type: entry.isDirectory() ? 'directory' : 'file'
    }));
    return { success: true, entries: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-command', async (event, command, cwd) => {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });
    return { 
      success: true, 
      output: stdout || stderr,
      exitCode: 0,
      cwd: cwd || process.cwd()
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr || '',
      exitCode: error.code || 1,
      cwd: cwd || process.cwd()
    };
  }
});

ipcMain.handle('execute-command', async (event, command, cwd) => {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      shell: 'powershell.exe',
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 10
    });
    return { 
      success: true, 
      output: stdout || stderr,
      cwd: cwd || process.cwd()
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr || '',
      cwd: cwd || process.cwd()
    };
  }
});

ipcMain.handle('search-files', async (event, query, directory) => {
  const results = [];
  const MAX_RESULTS = 200;
  const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.exe', '.dll', '.so', '.dylib']);
  
  function searchInFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) return;
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (results.length >= MAX_RESULTS) return;
        if (line.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            file: filePath,
            line: index + 1,
            content: line.trim()
          });
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  function walkDirectory(dir) {
    if (results.length >= MAX_RESULTS) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) break;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name)) {
            walkDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          searchInFile(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  try {
    if (!directory) {
      return { success: false, error: 'No directory specified' };
    }
    
    walkDirectory(directory);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// AppData handlers for chat history
ipcMain.handle('get-app-data-path', async () => {
  const userDataPath = app.getPath('userData');
  const kaiserDataPath = path.join(userDataPath, 'KaizerIDE');
  
  // Ensure directory exists
  if (!fs.existsSync(kaiserDataPath)) {
    fs.mkdirSync(kaiserDataPath, { recursive: true });
  }
  
  return kaiserDataPath;
});

// Workspace persistence
ipcMain.handle('save-workspace-path', async (event, workspacePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'workspace-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ workspacePath }));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-workspace-path', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'workspace-config.json');
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data);
      return { success: true, workspacePath: config.workspacePath };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-chat-history', async (event, chatHistory, workspacePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const kaiserDataPath = path.join(userDataPath, 'KaizerIDE');
    
    // Create workspace-specific filename
    let fileName = 'chat-history.json';
    if (workspacePath) {
      // Create a safe filename from workspace path
      const workspaceHash = Buffer.from(workspacePath).toString('base64').replace(/[/+=]/g, '_');
      fileName = `chat-history-${workspaceHash}.json`;
    }
    
    const chatHistoryPath = path.join(kaiserDataPath, fileName);
    
    // Ensure directory exists
    if (!fs.existsSync(kaiserDataPath)) {
      fs.mkdirSync(kaiserDataPath, { recursive: true });
    }
    
    fs.writeFileSync(chatHistoryPath, JSON.stringify(chatHistory, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-chat-history', async (event, workspacePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const kaiserDataPath = path.join(userDataPath, 'KaizerIDE');
    
    // Create workspace-specific filename
    let fileName = 'chat-history.json';
    if (workspacePath) {
      // Create a safe filename from workspace path
      const workspaceHash = Buffer.from(workspacePath).toString('base64').replace(/[/+=]/g, '_');
      fileName = `chat-history-${workspaceHash}.json`;
    }
    
    const chatHistoryPath = path.join(kaiserDataPath, fileName);
    
    if (!fs.existsSync(chatHistoryPath)) {
      return { success: true, data: [] };
    }
    
    const data = fs.readFileSync(chatHistoryPath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Menu action handlers
ipcMain.handle('create-file', async (event, dirPath, fileName) => {
  try {
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, '', 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-folder', async (event, folderPath) => {
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      success: true,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    return { 
      success: false, 
      size: 0, 
      mtime: null, 
      isDirectory: false, 
      error: error.message 
    };
  }
});
