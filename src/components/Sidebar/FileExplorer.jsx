import React, { useState, useEffect, useRef } from 'react';
import './FileExplorer.css';

const FILE_ICONS = {
  js: { bg: '#f7df1e', text: 'JS', color: '#000' },
  mjs: { bg: '#f7df1e', text: 'JS', color: '#000' },
  ts: { bg: '#3178c6', text: 'TS', color: '#fff' },
  jsx: { bg: '#61dafb', text: 'JSX', color: '#000' },
  tsx: { bg: '#61dafb', text: 'TSX', color: '#000' },
  py: { bg: '#3572A5', text: 'PY', color: '#fff' },
  lua: { bg: '#000080', text: 'LUA', color: '#fff' },
  rs: { bg: '#ce422b', text: 'RS', color: '#fff' },
  cpp: { bg: '#00599c', text: 'C++', color: '#fff' },
  cc: { bg: '#00599c', text: 'C++', color: '#fff' },
  cxx: { bg: '#00599c', text: 'C++', color: '#fff' },
  c: { bg: '#555555', text: 'C', color: '#fff' },
  h: { bg: '#555555', text: 'C', color: '#fff' },
  cs: { bg: '#178600', text: 'C#', color: '#fff' },
  go: { bg: '#00add8', text: 'GO', color: '#fff' },
  java: { bg: '#b07219', text: 'JAVA', color: '#fff' },
  kt: { bg: '#A97BFF', text: 'KT', color: '#fff' },
  html: { bg: '#e44d26', text: 'HTM', color: '#fff' },
  css: { bg: '#563d7c', text: 'CSS', color: '#fff' },
  scss: { bg: '#c6538c', text: 'SCSS', color: '#fff' },
  sass: { bg: '#c6538c', text: 'SCSS', color: '#fff' },
  json: { bg: '#cbcb41', text: '{}', color: '#000' },
  yaml: { bg: '#cb171e', text: 'YML', color: '#fff' },
  yml: { bg: '#cb171e', text: 'YML', color: '#fff' },
  md: { bg: '#083fa1', text: 'MD', color: '#fff' },
  txt: { bg: '#888888', text: 'TXT', color: '#fff' },
  sh: { bg: '#89e051', text: 'SH', color: '#000' },
  bash: { bg: '#89e051', text: 'SH', color: '#000' },
  env: { bg: '#ecd53f', text: 'ENV', color: '#000' },
  gitignore: { bg: '#f14e32', text: '.GIT', color: '#fff' },
  toml: { bg: '#9c4221', text: 'TOML', color: '#fff' },
  lock: { bg: '#bbbbbb', text: 'LOCK', color: '#000' },
};

const FOLDER_COLORS = {
  src: '#3b82f6',
  source: '#3b82f6',
  components: '#a855f7',
  assets: '#f59e0b',
  public: '#f59e0b',
  static: '#f59e0b',
  node_modules: '#555',
  '.git': '#555',
  dist: '#f97316',
  build: '#f97316',
  out: '#f97316',
  release: '#f97316',
  test: '#22c55e',
  tests: '#22c55e',
  __tests__: '#22c55e',
};

const DIMMED_FOLDERS = new Set(['node_modules', '.git', 'dist', 'release', '__pycache__', 'target', '.next', 'build', 'out']);

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (filename === '.gitignore') return FILE_ICONS.gitignore;
  if (filename.endsWith('.lock')) return FILE_ICONS.lock;
  return FILE_ICONS[ext] || { bg: '#666666', text: 'FILE', color: '#fff' };
}

function getFolderColor(name) {
  return FOLDER_COLORS[name.toLowerCase()] || '#f5a623';
}

function isWindows() {
  return window.navigator.userAgent.includes('Windows');
}

function TreeNode({ node, depth, onFileOpen, onRefresh, parentPath, onOpenFilePicker, contextMenu, setContextMenu, remoteMode, onFolderNavigate, onOpenFolder }) {
  // Load expand state from localStorage
  const storageKey = `folder-expanded:${node.path}`;
  const savedExpanded = localStorage.getItem(storageKey);
  const initialExpanded = savedExpanded !== null ? savedExpanded === 'true' : depth === 0;

  const [expanded, setExpanded] = useState(initialExpanded);
  const [inlineMode, setInlineMode] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  // Save expand state to localStorage when it changes
  useEffect(() => {
    if (node.type === 'directory') {
      localStorage.setItem(storageKey, expanded.toString());
    }
  }, [expanded, storageKey, node.type]);

  useEffect(() => {
    if (inlineMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inlineMode]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Prevent menu from going off screen
    const menuWidth = 160;
    const menuHeight = 200;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 4;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 4;
    }
    
    setContextMenu({ x, y, node, remoteMode });
  };

  const handleFileClick = async () => {
    if (node.type === 'file') {
      onFileOpen(node.path);
      const row = document.querySelector(`[data-path="${node.path}"]`);
      if (row) {
        row.style.animation = 'none';
        setTimeout(() => {
          row.style.animation = 'fileClickFlash 300ms ease';
        }, 10);
      }
    } else {
      // For folders, just expand/collapse
      // If folder has no children loaded yet and we're in remote mode, load them
      if (remoteMode && (!node.children || node.children.length === 0) && !expanded) {
        // Load children for this folder
        const result = await window.electron.getRemoteFileTree(node.path);
        if (result.success && result.tree && result.tree.children) {
          // Update the node's children
          node.children = result.tree.children;
        }
      }
      setExpanded(!expanded);
    }
  };

  const handleNewFile = async () => {
    setContextMenu(null);
    setInlineMode('newFile');
    setInputValue('');
  };

  const handleNewFolder = async () => {
    setContextMenu(null);
    setInlineMode('newFolder');
    setInputValue('');
  };

  const handleRename = () => {
    setContextMenu(null);
    setInlineMode('rename');
    setInputValue(node.name);
  };

  const handleDelete = () => {
    setContextMenu(null);
    setDeleteConfirm(true);
  };

  const handleCopyPath = async () => {
    setContextMenu(null);
    await navigator.clipboard.writeText(node.path);
    showToast('Path copied');
  };

  // Drag and drop handlers
  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      path: node.path,
      name: node.name,
      type: node.type
    }));
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    if (node.type !== 'dir') return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    
    // Auto-expand folder when hovering over it
    if (!expanded && dragTimeoutRef.current === null) {
      dragTimeoutRef.current = setTimeout(() => {
        setExpanded(true);
      }, 800);
    }
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    setIsDragOver(false);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    if (node.type !== 'dir') return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const sourcePath = data.path;
      const targetDir = node.path;
      
      // Don't move into itself or its parent
      if (sourcePath === targetDir || sourcePath === parentPath) {
        return;
      }
      
      // Don't move a parent into its child
      if (targetDir.startsWith(sourcePath)) {
        showToast('Cannot move folder into itself');
        return;
      }

      const fileName = sourcePath.split('\\').pop();
      const newPath = `${targetDir}\\${fileName}`;

      // Check if file already exists
      if (sourcePath === newPath) {
        return;
      }

      let cmd;
      if (isWindows()) {
        cmd = `move /Y "${sourcePath}" "${newPath}"`;
      } else {
        cmd = `mv "${sourcePath}" "${newPath}"`;
      }

      const result = await window.electron.runCommand(cmd, targetDir);
      if (result.success && result.exitCode === 0) {
        showToast(`Moved ${fileName}`);
        
        // Notify if it was a file
        if (data.type === 'file') {
          window.dispatchEvent(new CustomEvent('kaizer:file-renamed', {
            detail: { oldPath: sourcePath, newPath }
          }));
        }
        
        onRefresh();
      } else {
        showToast('Failed to move item');
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const executeNewFile = async () => {
    if (!inputValue.trim()) return;
    const targetDir = node.type === 'dir' ? node.path : parentPath;
    const separator = remoteMode ? '/' : '\\';
    const newPath = `${targetDir}${separator}${inputValue}`;
    
    const result = remoteMode
      ? await window.electron.writeRemoteFile(newPath, '')
      : await window.electron.writeFile(newPath, '');
      
    if (result.success) {
      setInlineMode(null);
      setInputValue('');
      onRefresh();
    }
  };

  const executeNewFolder = async () => {
    if (!inputValue.trim()) return;
    const targetDir = node.type === 'dir' ? node.path : parentPath;
    const separator = remoteMode ? '/' : '\\';
    const newPath = `${targetDir}${separator}${inputValue}${separator}.gitkeep`;
    
    const result = remoteMode
      ? await window.electron.writeRemoteFile(newPath, '')
      : await window.electron.writeFile(newPath, '');
      
    if (result.success) {
      setInlineMode(null);
      setInputValue('');
      setExpanded(true);
      onRefresh();
    }
  };

  const executeRename = async () => {
    if (!inputValue.trim() || inputValue === node.name) {
      setInlineMode(null);
      return;
    }
    
    // Remote rename not supported yet
    if (remoteMode) {
      showToast('Rename not supported for remote files yet');
      setInlineMode(null);
      return;
    }
    
    const dir = node.path.substring(0, node.path.lastIndexOf('\\'));
    const newPath = `${dir}\\${inputValue}`;
    
    let cmd;
    if (isWindows()) {
      cmd = `move /Y "${node.path}" "${newPath}"`;
    } else {
      cmd = `mv "${node.path}" "${newPath}"`;
    }
    
    const result = await window.electron.runCommand(cmd, dir);
    if (result.success && result.exitCode === 0) {
      if (node.type === 'file') {
        window.dispatchEvent(new CustomEvent('kaizer:file-renamed', {
          detail: { oldPath: node.path, newPath }
        }));
      }
      setInlineMode(null);
      setInputValue('');
      onRefresh();
    }
  };

  const executeDelete = async () => {
    // Remote delete not supported yet
    if (remoteMode) {
      showToast('Delete not supported for remote files yet');
      setDeleteConfirm(false);
      return;
    }
    
    const dir = node.path.substring(0, node.path.lastIndexOf('\\'));
    
    let cmd;
    if (isWindows()) {
      if (node.type === 'dir') {
        cmd = `rmdir /s /q "${node.path}"`;
      } else {
        cmd = `del /f /q "${node.path}"`;
      }
    } else {
      if (node.type === 'dir') {
        cmd = `rm -rf "${node.path}"`;
      } else {
        cmd = `rm -f "${node.path}"`;
      }
    }
    
    const result = await window.electron.runCommand(cmd, dir);
    if (result.success) {
      if (node.type === 'file') {
        window.dispatchEvent(new CustomEvent('kaizer:file-deleted', {
          detail: { path: node.path }
        }));
      }
      setDeleteConfirm(false);
      onRefresh();
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (inlineMode === 'newFile') executeNewFile();
      else if (inlineMode === 'newFolder') executeNewFolder();
      else if (inlineMode === 'rename') executeRename();
    } else if (e.key === 'Escape') {
      setInlineMode(null);
      setInputValue('');
    }
  };

  const isDimmed = node.type === 'dir' && DIMMED_FOLDERS.has(node.name);
  const childCount = node.type === 'dir' ? node.children?.length || 0 : 0;

  if (deleteConfirm) {
    return (
      <div
        className="tree-node delete-confirm"
        style={{ paddingLeft: `calc(${depth} * 12px + 8px)` }}
      >
        <span className="delete-text">Delete {node.name}?</span>
        <button className="delete-btn" onClick={executeDelete}>Delete</button>
        <button className="cancel-btn" onClick={() => setDeleteConfirm(false)}>Cancel</button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`tree-node ${node.type} ${isDimmed ? 'dimmed' : ''} ${isDragOver ? 'drag-over' : ''}`}
        style={{ paddingLeft: `calc(${depth} * 12px + 8px)` }}
        onClick={handleFileClick}
        onContextMenu={handleContextMenu}
        data-path={node.path}
        draggable={!inlineMode && !deleteConfirm}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {node.type === 'dir' && (
          <svg
            className={`chevron ${expanded ? 'expanded' : ''}`}
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            <path d="M2 1 L8 5 L2 9 Z" />
          </svg>
        )}
        
        {node.type === 'dir' ? (
          <div
            className="folder-icon"
            style={{ backgroundColor: getFolderColor(node.name) }}
          />
        ) : (
          <div
            className="file-badge"
            style={{
              backgroundColor: getFileIcon(node.name).bg,
              color: getFileIcon(node.name).color,
            }}
          >
            {getFileIcon(node.name).text}
          </div>
        )}
        
        {inlineMode === 'rename' ? (
          <input
            ref={inputRef}
            className="inline-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="node-name" title={node.name}>{node.name}</span>
        )}
        
        {node.type === 'dir' && childCount > 0 && (
          <span className="child-count">{childCount}</span>
        )}
      </div>

      {inlineMode === 'newFile' && (
        <div
          className="tree-node inline-input-row"
          style={{ paddingLeft: `calc(${depth + 1} * 12px + 8px)` }}
        >
          <div className="file-badge" style={{ backgroundColor: '#666', color: '#fff' }}>
            FILE
          </div>
          <input
            ref={inputRef}
            className="inline-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="filename.ext"
          />
        </div>
      )}

      {inlineMode === 'newFolder' && (
        <div
          className="tree-node inline-input-row"
          style={{ paddingLeft: `calc(${depth + 1} * 12px + 8px)` }}
        >
          <div className="folder-icon" style={{ backgroundColor: '#f5a623' }} />
          <input
            ref={inputRef}
            className="inline-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="folder-name"
          />
        </div>
      )}

      {contextMenu && contextMenu.node === node && (
        <div
          className="context-menu"
          style={{ 
            position: 'fixed',
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {node.type === 'file' ? (
            <>
              <div className="context-item" onClick={() => { setContextMenu(null); onFileOpen(node.path); }}>
                Open
              </div>
              <div className="context-item" onClick={() => { 
                setContextMenu(null); 
                window.dispatchEvent(new CustomEvent('kaizer:open-split', { detail: { path: node.path, direction: 'horizontal' } }));
              }}>
                Open to the Side
              </div>
              {node.name.endsWith('.md') && (
                <div className="context-item" onClick={() => { 
                  setContextMenu(null); 
                  window.dispatchEvent(new CustomEvent('kaizer:open-preview', { detail: { path: node.path } }));
                }}>
                  Open Preview
                </div>
              )}
              <div className="context-separator" />
              <div className="context-item" onClick={handleRename}>Rename</div>
              <div className="context-item" onClick={handleCopyPath}>Copy Path</div>
              <div className="context-separator" />
              <div className="context-item danger" onClick={handleDelete}>Delete</div>
            </>
          ) : (
            <>
              {contextMenu.remoteMode ? (
                <>
                  <div className="context-item" onClick={() => { 
                    setContextMenu(null);
                    // Call onOpenFolder to open as workspace in main explorer
                    if (onOpenFolder) {
                      onOpenFolder(node.path);
                    }
                  }}>
                    Open as Workspace
                  </div>
                  <div className="context-separator" />
                  <div className="context-item" onClick={handleCopyPath}>Copy Path</div>
                </>
              ) : (
                <>
                  <div className="context-item" onClick={handleNewFile}>New File</div>
                  <div className="context-item" onClick={handleNewFolder}>New Folder</div>
                  <div className="context-separator" />
                  <div className="context-item" onClick={() => { 
                    setContextMenu(null); 
                    if (onOpenFilePicker) onOpenFilePicker(node.path); 
                  }}>
                    Open in File Picker
                  </div>
                  <div className="context-separator" />
                  <div className="context-item" onClick={handleRename}>Rename</div>
                  <div className="context-item" onClick={handleCopyPath}>Copy Path</div>
                  <div className="context-separator" />
                  <div className="context-item danger" onClick={handleDelete}>Delete</div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {node.type === 'dir' && expanded && node.children && (
        <div className="tree-children">
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileOpen={onFileOpen}
              onRefresh={onRefresh}
              onOpenFilePicker={onOpenFilePicker}
              parentPath={node.path}
              contextMenu={contextMenu}
              setContextMenu={setContextMenu}
              remoteMode={remoteMode}
              onFolderNavigate={onFolderNavigate}
              onOpenFolder={onOpenFolder}
            />
          ))}
        </div>
      )}
    </>
  );
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 150);
  }, 2000);
}

export default function FileExplorer({ workspacePath: workspacePathProp, onFileOpen, onOpenFolder, onOpenFilePicker, visible = true, remoteMode: remoteModeProp = false }) {
  const [workspacePath, setWorkspacePath] = useState(workspacePathProp);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inlineInput, setInlineInput] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [remoteMode, setRemoteMode] = useState(remoteModeProp);
  const inputRef = useRef(null);
  
  if (!visible) return null;

  // Listen for tree refresh events
  useEffect(() => {
    const handleTreeRefresh = (event) => {
      if (event.detail) {
        console.log('[FileExplorer] Received tree-refresh event');
        setTree(event.detail);
      } else if (workspacePath) {
        console.log('[FileExplorer] Reloading tree from workspace path');
        loadTree(workspacePath);
      }
    };

    const handleRemoteTreeRefresh = (event) => {
      const { path, remoteMode } = event.detail;
      console.log('[FileExplorer] Received remote tree-refresh event:', path, remoteMode);
      if (remoteMode) {
        setRemoteMode(true);
        loadTree(path);
      }
    };

    window.addEventListener('kaizer:tree-refresh', handleTreeRefresh);
    window.addEventListener('kaizer:tree-refresh-remote', handleRemoteTreeRefresh);
    return () => {
      window.removeEventListener('kaizer:tree-refresh', handleTreeRefresh);
      window.removeEventListener('kaizer:tree-refresh-remote', handleRemoteTreeRefresh);
    };
  }, [workspacePath]);

  // Listen for file system changes from Electron
  useEffect(() => {
    if (!window.electron?.onFileSystemChanged) return;
    
    const unsubscribe = window.electron.onFileSystemChanged((data) => {
      console.log('[FileExplorer] File system changed, updating tree');
      if (data.tree) {
        setTree(data.tree);
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync with prop changes
  useEffect(() => {
    if (workspacePathProp && workspacePathProp !== workspacePath) {
      console.log('[FileExplorer] Syncing workspacePath from prop:', workspacePathProp);
      setWorkspacePath(workspacePathProp);
      loadTree(workspacePathProp);
    }
  }, [workspacePathProp]);

  // Sync remoteMode with prop
  useEffect(() => {
    if (remoteModeProp !== remoteMode) {
      setRemoteMode(remoteModeProp);
    }
  }, [remoteModeProp]);

  // Load tree when remoteMode changes
  useEffect(() => {
    if (remoteMode && workspacePath) {
      console.log('[FileExplorer] Remote mode activated, loading tree for:', workspacePath);
      loadTree(workspacePath);
    }
  }, [remoteMode]);

  useEffect(() => {
    if (inlineInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inlineInput]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && !e.target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setInlineInput(null);
        setInputValue('');
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu]);

  const loadTree = async (path) => {
    setLoading(true);
    
    try {
      console.log('[FileExplorer] Loading tree for path:', path, 'remoteMode:', remoteMode);
      
      // Use remote or local API based on mode
      const result = remoteMode 
        ? await window.electron.getRemoteFileTree(path)
        : await window.electron.getFileTree(path);
      
      console.log('[FileExplorer] Tree result:', result);
        
      if (result.success && result.tree) {
        setTree(result.tree);
        console.log('[FileExplorer] Tree loaded successfully');
      } else {
        console.error('[FileExplorer] Failed to load tree:', result.error);
        alert(`Failed to load directory: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[FileExplorer] Error loading tree:', error);
      alert(`Error loading directory: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async () => {
    // In remote mode, don't show local folder picker
    if (remoteMode) {
      return;
    }
    
    const result = await window.electron.openFolder();
    if (!result.canceled && result.path) {
      setWorkspacePath(result.path);
      await loadTree(result.path);
      // Notify parent component
      if (onOpenFolder) {
        onOpenFolder();
      }
    }
  };

  const handleRefresh = async () => {
    if (workspacePath) {
      await loadTree(workspacePath);
    }
  };

  const handleNewFileRoot = () => {
    setInlineInput({ parentPath: workspacePath, type: 'file', depth: 0 });
    setInputValue('');
  };

  const handleNewFolderRoot = () => {
    setInlineInput({ parentPath: workspacePath, type: 'folder', depth: 0 });
    setInputValue('');
  };

  const executeInlineInput = async () => {
    if (!inputValue.trim() || !inlineInput) return;
    
    const separator = remoteMode ? '/' : (isWindows() ? '\\' : '/');
    
    if (inlineInput.type === 'file') {
      const newPath = `${inlineInput.parentPath}${separator}${inputValue}`;
      const result = remoteMode
        ? await window.electron.writeRemoteFile(newPath, '')
        : await window.electron.writeFile(newPath, '');
      if (result.success) {
        setInlineInput(null);
        setInputValue('');
        await handleRefresh();
      }
    } else if (inlineInput.type === 'folder') {
      const newPath = `${inlineInput.parentPath}${separator}${inputValue}${separator}.gitkeep`;
      const result = remoteMode
        ? await window.electron.writeRemoteFile(newPath, '')
        : await window.electron.writeFile(newPath, '');
      if (result.success) {
        setInlineInput(null);
        setInputValue('');
        await handleRefresh();
      }
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeInlineInput();
    } else if (e.key === 'Escape') {
      setInlineInput(null);
      setInputValue('');
    }
  };

  const workspaceName = workspacePath 
    ? (remoteMode 
        ? workspacePath.split('/').filter(p => p).pop()?.toUpperCase() || 'ROOT'
        : workspacePath.split('\\').pop().toUpperCase())
    : '';

  const handleGoBack = async () => {
    if (!workspacePath) return;
    
    // Get parent directory
    const separator = remoteMode ? '/' : (isWindows() ? '\\' : '/');
    const parts = workspacePath.split(separator).filter(p => p);
    
    // If we're at root, can't go back
    if (parts.length <= 1 && !remoteMode) return;
    
    // For remote, allow going back to root
    if (remoteMode && parts.length === 0) return;
    
    // Remove last part to get parent
    parts.pop();
    const parentPath = remoteMode 
      ? (parts.length === 0 ? '/' : '/' + parts.join('/'))
      : (parts.length === 0 ? '' : parts.join(separator));
    
    if (parentPath) {
      setWorkspacePath(parentPath);
      await loadTree(parentPath);
    }
  };

  const canGoBack = () => {
    if (!workspacePath) return false;
    const separator = remoteMode ? '/' : (isWindows() ? '\\' : '/');
    const parts = workspacePath.split(separator).filter(p => p);
    
    // For remote mode, can go back unless at root
    if (remoteMode) {
      return workspacePath !== '/';
    }
    
    // For local mode, can go back if not at drive root
    return parts.length > 1;
  };

  if (!workspacePath) {
    return (
      <div className="file-explorer">
        <div className="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <div className="empty-text">{remoteMode ? 'Select a remote folder' : 'No folder open'}</div>
          {!remoteMode && (
            <button className="open-folder-btn" onClick={handleOpenFolder}>
              Open Folder
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <div className="header-left">
          {canGoBack() && (
            <button className="icon-btn back-btn" onClick={handleGoBack} title="Go Back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 12L6 8l4-4" />
              </svg>
            </button>
          )}
          <span className="workspace-name">{workspaceName}</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleRefresh} title="Refresh">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 8a6 6 0 11-1.76-4.24M14 2v4h-4" />
            </svg>
          </button>
          <button className="icon-btn" onClick={handleNewFileRoot} title="New File">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
          <button className="icon-btn" onClick={handleNewFolderRoot} title="New Folder">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 5v7a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6 3H3a1 1 0 00-1 1v1z" />
            </svg>
          </button>
          <button className="icon-btn" onClick={handleOpenFolder} title="Open Folder">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 5v7a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6 3H3a1 1 0 00-1 1v1z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="tree-container">
        {loading ? (
          <div className="skeleton-loader">
            {[60, 45, 70, 35, 55].map((width, idx) => (
              <div key={idx} className="skeleton-row" style={{ width: `${width}%` }} />
            ))}
          </div>
        ) : (
          <>
            {inlineInput && (
              <div 
                className="tree-node inline-input-row" 
                style={{ paddingLeft: `calc(${inlineInput.depth} * 12px + 8px)` }}
              >
                {inlineInput.type === 'file' ? (
                  <div className="file-badge" style={{ backgroundColor: '#666', color: '#fff' }}>
                    FILE
                  </div>
                ) : (
                  <div className="folder-icon" style={{ backgroundColor: '#f5a623' }} />
                )}
                <input
                  ref={inputRef}
                  className="inline-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={inlineInput.type === 'file' ? 'filename.ext' : 'folder-name'}
                />
              </div>
            )}
            {tree && tree.children && tree.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={0}
                onFileOpen={onFileOpen}
                onRefresh={handleRefresh}
                onOpenFilePicker={onOpenFilePicker}
                parentPath={workspacePath}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                remoteMode={remoteMode}
                onFolderNavigate={async (folderPath) => {
                  setWorkspacePath(folderPath);
                  await loadTree(folderPath);
                }}
                onOpenFolder={onOpenFolder}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
