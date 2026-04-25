import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { Client } from 'ssh2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let welcomeWindow;
let openPath = null;
let fileWatcher = null;
let watchedPath = null;
let refreshTimeout = null;
let sshClient = null;
let sftpClient = null;
let isRemoteMode = false;

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'release', '__pycache__', '.vscode', '.idea']);

/**
 * Parse a .gitignore file into a Set of simple name patterns.
 * Only supports plain names and `name/` style patterns — not full glob.
 * Wildcard/glob lines are skipped; they're handled lazily elsewhere.
 */
function parseGitignore(workspaceRoot) {
  const ignored = new Set();
  try {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) return ignored;
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('!')) continue;
      // Skip complex glob patterns — stick with plain names/dirs
      if (/[*?\[\]]/.test(line)) continue;
      // Strip leading slash and trailing slash for name matching
      const name = line.replace(/^\/+/, '').replace(/\/+$/, '');
      if (name && !name.includes('/')) ignored.add(name);
    }
  } catch {
    // Non-fatal: no gitignore or unreadable
  }
  return ignored;
}

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

/**
 * Async, non-blocking file tree builder using fs.promises + withFileTypes.
 * Avoids stat-per-entry (single readdir yields both name and type).
 * Reads siblings concurrently at each level for better throughput.
 * Honors .gitignore simple name patterns at the workspace root.
 */
async function buildFileTree(dirPath, depth = 0, maxDepth = 7, ignoredSet = null) {
  if (depth > maxDepth) return null;

  // Initialize merged ignore set at root
  if (depth === 0 && ignoredSet === null) {
    const fromGitignore = parseGitignore(dirPath);
    ignoredSet = new Set([...IGNORED_DIRS, ...fromGitignore]);
  } else if (ignoredSet === null) {
    ignoredSet = IGNORED_DIRS;
  }

  try {
    const name = path.basename(dirPath);

    // Stat once to discover type
    const stats = await fs.promises.stat(dirPath);

    if (stats.isDirectory()) {
      if (ignoredSet.has(name)) return null;

      let entries;
      try {
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      } catch {
        return null;
      }

      const childResults = await Promise.all(
        entries.map(async (entry) => {
          if (ignoredSet.has(entry.name)) return null;
          const childPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            return buildFileTree(childPath, depth + 1, maxDepth, ignoredSet);
          }
          if (entry.isFile()) {
            return { name: entry.name, path: childPath, type: 'file' };
          }
          // Symlinks / other: resolve lazily via recursive call
          return buildFileTree(childPath, depth + 1, maxDepth, ignoredSet);
        })
      );

      const children = childResults
        .filter((node) => node !== null)
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });

      return {
        name,
        path: dirPath,
        type: 'dir',
        children,
        expanded: depth === 0,
      };
    }

    return {
      name,
      path: dirPath,
      type: 'file',
    };
  } catch {
    return null;
  }
}

function createWelcomeWindow() {
  welcomeWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 900,
    minHeight: 600,
    maxWidth: 900,
    maxHeight: 600,
    frame: false,
    backgroundColor: '#0d0d0d',
    center: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  // Set Content Security Policy
  welcomeWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
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
    welcomeWindow.loadURL('http://localhost:5174#welcome');
    welcomeWindow.webContents.openDevTools();
  } else {
    welcomeWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'welcome' });
  }

  welcomeWindow.on('closed', () => {
    welcomeWindow = null;
  });

  return welcomeWindow;
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

app.whenReady().then(async () => {
  // Get the path from command line arguments
  openPath = getOpenPath();
  
  // If opened via context menu (right-click folder), open main window directly
  if (openPath) {
    createWindow();
  } else {
    // Always show welcome screen when launched normally (no command-line path)
    createWelcomeWindow();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWelcomeWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopWatching();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('window-minimize', () => {
  const activeWindow = mainWindow || welcomeWindow;
  if (activeWindow) {
    activeWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  const activeWindow = mainWindow || welcomeWindow;
  if (activeWindow) {
    if (activeWindow.isMaximized()) {
      activeWindow.unmaximize();
    } else {
      activeWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  const activeWindow = mainWindow || welcomeWindow;
  if (activeWindow) {
    activeWindow.close();
  }
});

ipcMain.handle('get-open-path', () => {
  return openPath;
});

ipcMain.handle('open-folder', async () => {
  const activeWindow = mainWindow || welcomeWindow;
  const result = await dialog.showOpenDialog(activeWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('get-file-tree', async (event, dirPath) => {
  try {
    const tree = await buildFileTree(dirPath);

    // Start watching this directory
    startWatching(dirPath);

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
    
    // Also add to recent workspaces
    const recentPath = path.join(userDataPath, 'recent-workspaces.json');
    let recentData = { workspaces: [] };
    
    if (fs.existsSync(recentPath)) {
      const data = fs.readFileSync(recentPath, 'utf8');
      recentData = JSON.parse(data);
    }
    
    // Remove if already exists
    recentData.workspaces = recentData.workspaces.filter(w => w.path !== workspacePath);
    
    // Add to front
    const name = path.basename(workspacePath);
    recentData.workspaces.unshift({
      path: workspacePath,
      name: name,
      lastOpened: new Date().toISOString()
    });
    
    // Keep only last 5
    recentData.workspaces = recentData.workspaces.slice(0, 5);
    
    // Save
    fs.writeFileSync(recentPath, JSON.stringify(recentData, null, 2), 'utf8');
    
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

// Agent session persistence (disk-backed durable storage)
ipcMain.handle('save-agent-sessions', async (event, sessions) => {
  try {
    const userDataPath = app.getPath('userData');
    const kaiserDataPath = path.join(userDataPath, 'KaizerIDE');
    const sessionsPath = path.join(kaiserDataPath, 'agent-sessions.json');

    if (!fs.existsSync(kaiserDataPath)) {
      fs.mkdirSync(kaiserDataPath, { recursive: true });
    }

    await fs.promises.writeFile(sessionsPath, JSON.stringify(sessions, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-agent-sessions', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const kaiserDataPath = path.join(userDataPath, 'KaizerIDE');
    const sessionsPath = path.join(kaiserDataPath, 'agent-sessions.json');

    if (!fs.existsSync(sessionsPath)) {
      return { success: true, data: [] };
    }

    const data = await fs.promises.readFile(sessionsPath, 'utf-8');
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

ipcMain.handle('get-file-outline', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const outline = [];
    
    // Simple regex-based parsing for common languages
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
      // Match functions, classes, methods
      const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
      const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
      const classRegex = /(?:export\s+)?class\s+(\w+)/g;
      const methodRegex = /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/gm;
      
      const lines = content.split('\n');
      
      // Find functions
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'function', name: match[1], line, level: 0 });
      }
      
      // Find arrow functions
      while ((match = arrowFunctionRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'function', name: match[1], line, level: 0 });
      }
      
      // Find classes
      while ((match = classRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'class', name: match[1], line, level: 0 });
      }
      
      // Find methods (inside classes)
      while ((match = methodRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const name = match[1];
        // Skip if it's a keyword
        if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
          outline.push({ kind: 'method', name, line, level: 1 });
        }
      }
    } else if (['.py'].includes(ext)) {
      // Python: classes and functions
      const classRegex = /^class\s+(\w+)/gm;
      const functionRegex = /^(?:\s*)def\s+(\w+)/gm;
      
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'class', name: match[1], line, level: 0 });
      }
      
      while ((match = functionRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const indent = match[0].match(/^\s*/)[0].length;
        const level = indent > 0 ? 1 : 0;
        outline.push({ kind: 'function', name: match[1], line, level });
      }
    } else if (['.go'].includes(ext)) {
      // Go: functions and types
      const functionRegex = /^func\s+(?:\([^)]+\)\s+)?(\w+)/gm;
      const typeRegex = /^type\s+(\w+)/gm;
      
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'function', name: match[1], line, level: 0 });
      }
      
      while ((match = typeRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'type', name: match[1], line, level: 0 });
      }
    } else if (['.rs'].includes(ext)) {
      // Rust: functions, structs, impls
      const functionRegex = /^(?:pub\s+)?fn\s+(\w+)/gm;
      const structRegex = /^(?:pub\s+)?struct\s+(\w+)/gm;
      const implRegex = /^impl(?:<[^>]+>)?\s+(\w+)/gm;
      
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'function', name: match[1], line, level: 0 });
      }
      
      while ((match = structRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'struct', name: match[1], line, level: 0 });
      }
      
      while ((match = implRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'impl', name: match[1], line, level: 0 });
      }
    } else if (['.c', '.h', '.cpp', '.hpp', '.cc', '.cxx'].includes(ext)) {
      // C/C++: functions, structs, typedefs, defines
      // Match function definitions (return_type function_name(...))
      const functionRegex = /^(?:static\s+|inline\s+|extern\s+)?(?:[\w\s\*]+)\s+(\w+)\s*\([^)]*\)\s*(?:{|;)/gm;
      const structRegex = /^(?:typedef\s+)?struct\s+(\w+)/gm;
      const typedefRegex = /^typedef\s+(?:struct\s+)?[\w\s\*]+\s+(\w+)\s*;/gm;
      const defineRegex = /^#define\s+(\w+)/gm;
      
      let match;
      
      // Find functions (filter out common keywords)
      const keywords = ['if', 'for', 'while', 'switch', 'return', 'sizeof', 'typedef', 'struct', 'union', 'enum'];
      while ((match = functionRegex.exec(content)) !== null) {
        const name = match[1];
        if (!keywords.includes(name)) {
          const line = content.substring(0, match.index).split('\n').length;
          outline.push({ kind: 'function', name, line, level: 0 });
        }
      }
      
      // Find structs
      while ((match = structRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'struct', name: match[1], line, level: 0 });
      }
      
      // Find typedefs
      while ((match = typedefRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'typedef', name: match[1], line, level: 0 });
      }
      
      // Find #defines
      while ((match = defineRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        outline.push({ kind: 'define', name: match[1], line, level: 0 });
      }
    }
    
    // Sort by line number
    outline.sort((a, b) => a.line - b.line);
    
    return { success: true, outline };
  } catch (error) {
    return { success: false, error: error.message, outline: [] };
  }
});

// File system watcher functions
function startWatching(dirPath) {
  // Stop existing watcher if any
  stopWatching();
  
  if (!dirPath) return;
  
  watchedPath = dirPath;
  
  try {
    // Use fs.watch for directory monitoring
    fileWatcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      
      // Ignore changes in certain directories
      const ignoredPaths = ['node_modules', '.git', 'dist', 'release', '__pycache__', '.vscode', '.idea'];
      const shouldIgnore = ignoredPaths.some(ignored => filename.includes(ignored));
      
      if (shouldIgnore) return;
      
      // Debounce: clear existing timeout and set new one
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      
      refreshTimeout = setTimeout(async () => {
        // Send refresh event to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Build fresh tree and send it
          try {
            const tree = await buildFileTree(dirPath);
            mainWindow.webContents.send('file-system-changed', { tree, path: dirPath });
            console.log('[FileWatcher] Tree refreshed after file change:', filename);
          } catch (err) {
            console.error('Error building tree after file change:', err);
          }
        }
        refreshTimeout = null;
      }, 300); // 300ms debounce
    });
    
    console.log('[FileWatcher] Started watching:', dirPath);
  } catch (error) {
    console.error('[FileWatcher] Error starting watcher:', error);
  }
}

function stopWatching() {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  
  if (fileWatcher) {
    try {
      fileWatcher.close();
      console.log('[FileWatcher] Stopped watching:', watchedPath);
    } catch (err) {
      console.error('[FileWatcher] Error stopping watcher:', err);
    }
    fileWatcher = null;
    watchedPath = null;
  }
}

// SSH Connection Handler
ipcMain.handle('connect-ssh', async (event, config) => {
  try {
    console.log('[SSH] Attempting to connect to:', config.host);
    
    // Close existing connection if any
    if (sshClient) {
      sshClient.end();
      sshClient = null;
      sftpClient = null;
    }

    return new Promise((resolve, reject) => {
      const client = new Client();
      
      client.on('ready', () => {
        console.log('[SSH] Connection established');
        
        // Get SFTP session
        client.sftp((err, sftp) => {
          if (err) {
            console.error('[SSH] SFTP error:', err);
            client.end();
            reject(new Error('Failed to establish SFTP session'));
            return;
          }
          
          console.log('[SSH] SFTP session established');
          sshClient = client;
          sftpClient = sftp;
          isRemoteMode = true;
          
          resolve({
            success: true,
            connection: {
              host: config.host,
              port: config.port,
              username: config.username,
              connected: true
            }
          });
        });
      });
      
      client.on('error', (err) => {
        console.error('[SSH] Connection error:', err);
        reject(new Error(err.message || 'SSH connection failed'));
      });
      
      client.on('end', () => {
        console.log('[SSH] Connection ended');
        sshClient = null;
        sftpClient = null;
        isRemoteMode = false;
      });
      
      // Connect with provided credentials
      const connectConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username
      };
      
      if (config.authType === 'password') {
        connectConfig.password = config.password;
      } else if (config.authType === 'key') {
        connectConfig.privateKey = config.privateKey;
      }
      
      client.connect(connectConfig);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!sshClient) {
          client.end();
          reject(new Error('Connection timeout'));
        }
      }, 30000);
    });
  } catch (error) {
    console.error('[SSH] Connection failed:', error);
    return {
      success: false,
      error: error.message || 'Connection failed'
    };
  }
});

// Disconnect SSH
ipcMain.handle('disconnect-ssh', async () => {
  try {
    if (sshClient) {
      sshClient.end();
      sshClient = null;
      sftpClient = null;
      isRemoteMode = false;
      console.log('[SSH] Disconnected');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get SSH connection status
ipcMain.handle('get-ssh-status', async () => {
  return {
    connected: isRemoteMode && !!sshClient,
    isRemote: isRemoteMode
  };
});

// Get remote file tree via SFTP
ipcMain.handle('get-remote-file-tree', async (event, dirPath) => {
  console.log('[SFTP] get-remote-file-tree called with path:', dirPath);
  console.log('[SFTP] isRemoteMode:', isRemoteMode);
  console.log('[SFTP] sftpClient exists:', !!sftpClient);
  
  if (!sftpClient || !isRemoteMode) {
    console.error('[SFTP] Not connected - sftpClient:', !!sftpClient, 'isRemoteMode:', isRemoteMode);
    return { success: false, error: 'Not connected to remote server' };
  }

  try {
    console.log('[SFTP] Building remote tree for:', dirPath);
    const buildRemoteTree = async (remotePath, depth = 0, maxDepth = 2) => {
      if (depth > maxDepth) {
        console.log('[SFTP] Max depth reached at:', remotePath);
        return null;
      }

      try {
        console.log('[SFTP] Stating path:', remotePath, 'depth:', depth);
        const stats = await new Promise((resolve, reject) => {
          sftpClient.stat(remotePath, (err, stats) => {
            if (err) {
              console.log('[SFTP] Stat error for', remotePath, ':', err.message);
              resolve(null);
            } else {
              resolve(stats);
            }
          });
        });

        // If stat returned null, skip this entry
        if (!stats) {
          console.log('[SFTP] No stats for:', remotePath);
          return null;
        }

        const name = path.basename(remotePath);

        if (stats.isDirectory()) {
          // Skip common ignored directories and special Linux filesystems
          const ignoredDirs = new Set([...IGNORED_DIRS, 'proc', 'sys', 'dev', 'run', 'boot', 'tmp', 'var', 'etc', 'usr', 'lib', 'lib64', 'bin', 'sbin', 'opt', 'srv', 'mnt', 'media']);
          if (ignoredDirs.has(name)) {
            console.log('[SFTP] Ignoring directory:', name);
            return null;
          }

          // Only load children for depth 0 (root level)
          let children = [];
          if (depth === 0) {
            console.log('[SFTP] Reading directory:', remotePath);
            const entries = await new Promise((resolve, reject) => {
              sftpClient.readdir(remotePath, (err, list) => {
                if (err) {
                  console.log('[SFTP] Readdir error for', remotePath, ':', err.message);
                  resolve([]);
                } else {
                  console.log('[SFTP] Found', list.length, 'entries in', remotePath);
                  resolve(list);
                }
              });
            });

            for (const entry of entries) {
              try {
                const childPath = path.posix.join(remotePath, entry.filename);
                const childNode = await buildRemoteTree(childPath, depth + 1, maxDepth);
                if (childNode) children.push(childNode);
              } catch (err) {
                console.log(`[SFTP] Skipping ${entry.filename}: ${err.message}`);
              }
            }

            children.sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'dir' ? -1 : 1;
            });
          }

          console.log('[SFTP] Built directory node for', remotePath, 'with', children.length, 'children');
          return {
            name,
            path: remotePath,
            type: 'dir',
            children,
            expanded: depth === 0
          };
        } else {
          console.log('[SFTP] Built file node for:', remotePath);
          return {
            name,
            path: remotePath,
            type: 'file'
          };
        }
      } catch (err) {
        console.log('[SFTP] Error building node for', remotePath, ':', err.message);
        return null;
      }
    };

    const tree = await buildRemoteTree(dirPath);
    console.log('[SFTP] Tree built successfully:', tree ? 'yes' : 'no');
    if (tree) {
      console.log('[SFTP] Tree structure:', JSON.stringify(tree, null, 2));
    }
    return { success: true, tree };
  } catch (error) {
    console.error('[SFTP] Get file tree error:', error);
    return { success: false, error: error.message };
  }
});

// Read remote file via SFTP
ipcMain.handle('read-remote-file', async (event, filePath) => {
  if (!sftpClient || !isRemoteMode) {
    return { success: false, error: 'Not connected to remote server' };
  }

  try {
    const content = await new Promise((resolve, reject) => {
      sftpClient.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    return { success: true, content };
  } catch (error) {
    console.error('[SFTP] Read file error:', error);
    return { success: false, error: error.message };
  }
});

// Write remote file via SFTP
ipcMain.handle('write-remote-file', async (event, filePath, content) => {
  if (!sftpClient || !isRemoteMode) {
    return { success: false, error: 'Not connected to remote server' };
  }

  try {
    await new Promise((resolve, reject) => {
      sftpClient.writeFile(filePath, content, 'utf8', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return { success: true };
  } catch (error) {
    console.error('[SFTP] Write file error:', error);
    return { success: false, error: error.message };
  }
});

// Get OS username
ipcMain.handle('get-username', async () => {
  try {
    const userInfo = os.userInfo();
    return { success: true, username: userInfo.username };
  } catch (error) {
    return { success: false, username: 'User', error: error.message };
  }
});

// Get recent workspaces
ipcMain.handle('get-recent-workspaces', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const recentPath = path.join(userDataPath, 'recent-workspaces.json');
    
    if (!fs.existsSync(recentPath)) {
      return { success: true, workspaces: [] };
    }
    
    const data = fs.readFileSync(recentPath, 'utf8');
    const recentData = JSON.parse(data);
    return { success: true, workspaces: recentData.workspaces || [] };
  } catch (error) {
    return { success: false, workspaces: [], error: error.message };
  }
});

// Add recent workspace
ipcMain.handle('add-recent-workspace', async (event, workspacePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const recentPath = path.join(userDataPath, 'recent-workspaces.json');
    
    let recentData = { workspaces: [] };
    
    // Load existing data
    if (fs.existsSync(recentPath)) {
      const data = fs.readFileSync(recentPath, 'utf8');
      recentData = JSON.parse(data);
    }
    
    // Remove if already exists (to update timestamp)
    recentData.workspaces = recentData.workspaces.filter(w => w.path !== workspacePath);
    
    // Add to front
    const name = path.basename(workspacePath);
    recentData.workspaces.unshift({
      path: workspacePath,
      name: name,
      lastOpened: new Date().toISOString()
    });
    
    // Keep only last 5
    recentData.workspaces = recentData.workspaces.slice(0, 5);
    
    // Save
    fs.writeFileSync(recentPath, JSON.stringify(recentData, null, 2), 'utf8');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open workspace from welcome screen
ipcMain.handle('open-workspace-from-welcome', async (event, workspacePath) => {
  try {
    // Save workspace path and add to recent workspaces
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'workspace-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ workspacePath }));
    
    // Add to recent workspaces
    const recentPath = path.join(userDataPath, 'recent-workspaces.json');
    let recentData = { workspaces: [] };
    
    if (fs.existsSync(recentPath)) {
      const data = fs.readFileSync(recentPath, 'utf8');
      recentData = JSON.parse(data);
    }
    
    // Remove if already exists
    recentData.workspaces = recentData.workspaces.filter(w => w.path !== workspacePath);
    
    // Add to front
    const name = path.basename(workspacePath);
    recentData.workspaces.unshift({
      path: workspacePath,
      name: name,
      lastOpened: new Date().toISOString()
    });
    
    // Keep only last 5
    recentData.workspaces = recentData.workspaces.slice(0, 5);
    
    // Save
    fs.writeFileSync(recentPath, JSON.stringify(recentData, null, 2), 'utf8');
    
    // Close welcome window
    if (welcomeWindow && !welcomeWindow.isDestroyed()) {
      welcomeWindow.close();
      welcomeWindow = null;
    }
    
    // Create main window
    createWindow();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open workspace from welcome screen with SSH modal
ipcMain.handle('open-workspace-from-welcome-with-ssh', async () => {
  try {
    // Close welcome window
    if (welcomeWindow && !welcomeWindow.isDestroyed()) {
      welcomeWindow.close();
      welcomeWindow = null;
    }
    
    // Create main window
    createWindow();
    
    // Wait for window to load, then trigger SSH modal
    if (mainWindow) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('open-ssh-modal');
      });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
