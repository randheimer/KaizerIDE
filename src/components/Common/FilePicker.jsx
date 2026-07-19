import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FilePicker.css';

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
  c: { bg: '#555555', text: 'C', color: '#fff' },
  cs: { bg: '#178600', text: 'C#', color: '#fff' },
  go: { bg: '#00add8', text: 'GO', color: '#fff' },
  java: { bg: '#b07219', text: 'JAVA', color: '#fff' },
  html: { bg: '#e44d26', text: 'HTM', color: '#fff' },
  css: { bg: '#563d7c', text: 'CSS', color: '#fff' },
  json: { bg: '#cbcb41', text: '{}', color: '#000' },
  md: { bg: '#083fa1', text: 'MD', color: '#fff' },
  txt: { bg: '#888888', text: 'TXT', color: '#fff' },
};

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || { bg: '#666666', text: 'FILE', color: '#fff' };
}

function getFileType(entry) {
  if (entry.type === 'dir') return 'Folder';
  const ext = entry.name.split('.').pop()?.toLowerCase();
  const typeMap = {
    js: 'JS File', mjs: 'JS File', ts: 'TS File', jsx: 'JSX File', tsx: 'TSX File',
    py: 'Python File', lua: 'Lua File', rs: 'Rust File', cpp: 'C++ File', c: 'C File',
    cs: 'C# File', go: 'Go File', java: 'Java File', html: 'HTML File', css: 'CSS File',
    json: 'JSON File', md: 'Markdown', txt: 'Text File'
  };
  return typeMap[ext] || 'File';
}

function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${month} ${day} ${time}`;
}

function FilePicker({ startPath, workspacePath, onAttach, onClose, mode = 'attach' }) {
  // mode can be 'attach' (for files) or 'folder' (for selecting a folder)
  const [currentPath, setCurrentPath] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selected, setSelected] = useState(new Set());
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [sortBy, setSortBy] = useState('name-asc'); // 'name-asc' | 'name-desc' | 'modified' | 'size' | 'type'
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedDirs, setPinnedDirs] = useState([]);
  const [homePath, setHomePath] = useState('');
  const [workspaceSubdirs, setWorkspaceSubdirs] = useState([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderValue, setNewFolderValue] = useState('');
  const [lastClickedIndex, setLastClickedIndex] = useState(-1);
  const [contextMenu, setContextMenu] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [folderItemCount, setFolderItemCount] = useState(null);
  
  const overlayRef = useRef(null);
  const sortMenuRef = useRef(null);
  const newFolderInputRef = useRef(null);
  const contextMenuRef = useRef(null);
  const fileListRef = useRef(null);

  const PREVIEWABLE_EXTENSIONS = new Set([
    'txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'py', 'lua', 'json', 
    'css', 'html', 'rs', 'go', 'cpp', 'c', 'cs', 'yaml', 'yml', 
    'toml', 'sh', 'env'
  ]);

  // Load pinned directories from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('kaizer-pinned-dirs');
    if (stored) {
      try {
        setPinnedDirs(JSON.parse(stored));
      } catch (e) {
        setPinnedDirs([]);
      }
    }
  }, []);

  // Detect home directory on mount
  useEffect(() => {
    const detectHome = async () => {
      console.log('[FilePicker] Detecting home directory...');
      const result = await window.electron.runCommand('echo %USERPROFILE%', null);
      console.log('[FilePicker] Home detection result:', result);
      
      if (result.success && (result.output || result.stdout)) {
        const home = (result.output || result.stdout).trim();
        console.log('[FilePicker] Home path:', home);
        setHomePath(home);
        
        // Navigate to initial path
        const initialPath = startPath || workspacePath || home;
        console.log('[FilePicker] Initial path will be:', initialPath);
        console.log('[FilePicker] startPath:', startPath);
        console.log('[FilePicker] workspacePath:', workspacePath);
        navigateTo(initialPath);
      } else {
        console.error('[FilePicker] Failed to detect home directory');
      }
    };
    detectHome();
  }, []);

  // Load workspace subdirectories
  useEffect(() => {
    const loadWorkspaceSubdirs = async () => {
      if (!workspacePath) return;
      
      const result = await window.electron.listDir(workspacePath);
      if (result.success) {
        const items = result.items || result.entries;
        if (items) {
          const dirs = items.filter(item => item.type === 'dir' || item.type === 'directory');
          setWorkspaceSubdirs(dirs);
        }
      }
    };
    loadWorkspaceSubdirs();
  }, [workspacePath]);

  // Load directory contents
  const loadDirectory = useCallback(async (path) => {
    console.log('[FilePicker] Loading directory:', path);
    setLoading(true);
    setError(null);
    setShowNewFolderInput(false);
    
    try {
      const result = await window.electron.listDir(path);
      console.log('[FilePicker] listDir result:', result);
      
      // Handle both 'items' and 'entries' for compatibility
      const items = result.items || result.entries;
      
      if (!result.success || !items) {
        console.error('[FilePicker] Failed to list directory:', result.error);
        setError('Cannot read directory');
        setEntries([]);
        setLoading(false);
        return;
      }
      
      console.log('[FilePicker] Found', items.length, 'items');
      
      // Fetch file info for each entry
      const entriesWithInfo = await Promise.all(
        items.map(async (item) => {
          console.log('[FilePicker] Getting info for:', item.path);
          const info = await window.electron.getFileInfo(item.path);
          console.log('[FilePicker] File info result:', info);
          return {
            ...item,
            size: info.success ? info.size : 0,
            mtime: info.success ? info.mtime : 0
          };
        })
      );
      
      console.log('[FilePicker] Entries with info:', entriesWithInfo);
      setEntries(entriesWithInfo);
      setLoading(false);
    } catch (err) {
      console.error('[FilePicker] Exception loading directory:', err);
      setError('Cannot read directory');
      setEntries([]);
      setLoading(false);
    }
  }, []);

  // Navigate to a path
  const navigateTo = useCallback((path) => {
    console.log('[FilePicker] navigateTo called with path:', path);
    setCurrentPath(path);
    setSearchQuery('');
    setSelected(new Set());
    setLastClickedIndex(-1);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Load directory
    loadDirectory(path);
  }, [history, historyIndex, loadDirectory]);

  // History navigation
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      setSearchQuery('');
      setSelected(new Set());
      setLastClickedIndex(-1);
      loadDirectory(history[newIndex]);
    }
  }, [history, historyIndex, loadDirectory]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      setSearchQuery('');
      setSelected(new Set());
      setLastClickedIndex(-1);
      loadDirectory(history[newIndex]);
    }
  }, [history, historyIndex, loadDirectory]);

  const goUp = useCallback(() => {
    if (!currentPath) return;
    const segments = currentPath.split(/[\\/]/).filter(Boolean);
    if (segments.length <= 1) return; // Already at root
    const parentPath = segments.slice(0, -1).join('\\');
    navigateTo(parentPath);
  }, [currentPath, navigateTo]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showSortMenu) {
          setShowSortMenu(false);
        } else if (showNewFolderInput) {
          setShowNewFolderInput(false);
          setNewFolderValue('');
        } else if (contextMenu) {
          setContextMenu(null);
        } else {
          onClose();
        }
      } else if (e.key === 'Backspace' && !showNewFolderInput && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        goUp();
      } else if (e.key === 'Enter' && !showNewFolderInput && document.activeElement.tagName !== 'INPUT') {
        if (selected.size === 1) {
          const selectedPath = Array.from(selected)[0];
          const entry = entries.find(e => e.path === selectedPath);
          if (entry) {
            if (entry.type === 'dir' || entry.type === 'directory') {
              navigateTo(entry.path);
            } else {
              onAttach([{ type: 'file', path: entry.path, name: entry.name }]);
              onClose();
            }
          }
        }
      } else if (e.key === 'a' && e.ctrlKey && !showNewFolderInput) {
        e.preventDefault();
        const filtered = getFilteredEntries();
        setSelected(new Set(filtered.map(e => e.path)));
      } else if (e.key === 'F5') {
        e.preventDefault();
        loadDirectory(currentPath);
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        goBack();
      } else if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        goForward();
      } else if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        goUp();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showSortMenu, showNewFolderInput, contextMenu, selected, entries, currentPath, goUp, goBack, goForward, loadDirectory, navigateTo]);

  // Close sort menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target) && showSortMenu) {
        setShowSortMenu(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target) && contextMenu) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu, contextMenu]);

  // Focus new folder input
  useEffect(() => {
    if (showNewFolderInput && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Pin/unpin directory
  const togglePin = (path, name) => {
    const newPinned = pinnedDirs.some(p => p.path === path)
      ? pinnedDirs.filter(p => p.path !== path)
      : [...pinnedDirs, { path, name }];
    
    setPinnedDirs(newPinned);
    localStorage.setItem('kaizer-pinned-dirs', JSON.stringify(newPinned));
  };

  // Handle file/folder click
  const handleEntryClick = (entry, index, e) => {
    if (e.ctrlKey) {
      // Toggle selection
      const newSelected = new Set(selected);
      if (newSelected.has(entry.path)) {
        newSelected.delete(entry.path);
      } else {
        newSelected.add(entry.path);
      }
      setSelected(newSelected);
      setLastClickedIndex(index);
    } else if (e.shiftKey && lastClickedIndex !== -1) {
      // Range select
      const filtered = getFilteredEntries();
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const newSelected = new Set(selected);
      for (let i = start; i <= end; i++) {
        newSelected.add(filtered[i].path);
      }
      setSelected(newSelected);
    } else {
      // Single select
      setSelected(new Set([entry.path]));
      setLastClickedIndex(index);
    }
  };

  // Load preview for selected item
  useEffect(() => {
    const loadPreview = async () => {
      if (selected.size !== 1) {
        setPreviewContent(null);
        setFolderItemCount(null);
        return;
      }

      const selectedPath = Array.from(selected)[0];
      const entry = entries.find(e => e.path === selectedPath);
      if (!entry) return;

      if (entry.type === 'dir' || entry.type === 'directory') {
        // Load folder item count
        const result = await window.electron.listDir(entry.path);
        if (result.success) {
          const items = result.items || result.entries;
          if (items) {
            setFolderItemCount(items.length);
          }
        }
        setPreviewContent(null);
      } else {
        // Load file preview if previewable
        const ext = entry.name.split('.').pop()?.toLowerCase();
        if (ext && PREVIEWABLE_EXTENSIONS.has(ext)) {
          setPreviewLoading(true);
          const result = await window.electron.readFile(entry.path);
          if (result.success && result.content) {
            const lines = result.content.split('\n').slice(0, 40).join('\n');
            setPreviewContent(lines);
          } else {
            setPreviewContent(null);
          }
          setPreviewLoading(false);
        } else {
          setPreviewContent(null);
        }
        setFolderItemCount(null);
      }
    };

    loadPreview();
  }, [selected, entries, PREVIEWABLE_EXTENSIONS]);

  // Handle double click
  const handleEntryDoubleClick = (entry) => {
    if (entry.type === 'dir' || entry.type === 'directory') {
      navigateTo(entry.path);
    } else {
      onAttach([{ type: 'file', path: entry.path, name: entry.name }]);
      onClose();
    }
  };

  // Handle right click
  const handleEntryRightClick = (entry, e) => {
    e.preventDefault();
    if (entry.type === 'dir' || entry.type === 'directory') {
      setContextMenu({ x: e.clientX, y: e.clientY, entry });
    }
  };

  // Handle new folder
  const handleNewFolder = async () => {
    if (!newFolderValue.trim()) return;
    const newPath = `${currentPath}\\${newFolderValue}\\.gitkeep`;
    const result = await window.electron.writeFile(newPath, '');
    if (result.success) {
      setShowNewFolderInput(false);
      setNewFolderValue('');
      loadDirectory(currentPath);
    }
  };

  // Get filtered and sorted entries
  const getFilteredEntries = useCallback(() => {
    let filtered = entries;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sort
    const sorted = [...filtered];
    const dirs = sorted.filter(e => e.type === 'dir' || e.type === 'directory');
    const files = sorted.filter(e => e.type === 'file');
    
    const sortFn = (a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'modified': {
          const aTime = a.mtime ? new Date(a.mtime).getTime() : 0;
          const bTime = b.mtime ? new Date(b.mtime).getTime() : 0;
          return bTime - aTime; // Newest first
        }
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'type': {
          const extA = a.name.split('.').pop()?.toLowerCase() || '';
          const extB = b.name.split('.').pop()?.toLowerCase() || '';
          return extA.localeCompare(extB);
        }
        default:
          return 0;
      }
    };
    
    dirs.sort(sortFn);
    files.sort(sortFn);
    
    return [...dirs, ...files];
  }, [entries, searchQuery, sortBy]);

  // Get breadcrumb segments
  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    const segments = currentPath.split(/[\\/]/).filter(Boolean);
    return segments.map((segment, idx) => {
      const path = segments.slice(0, idx + 1).join('\\');
      return { segment, path: path.includes(':') ? path : `${segments[0]}\\${path}` };
    });
  };

  // Get quick access paths
  const getQuickAccessPaths = () => {
    if (!homePath) return [];
    return [
      { icon: '🏠', label: 'Home', path: homePath },
      { icon: '🖥', label: 'Desktop', path: `${homePath}\\Desktop` },
      { icon: '📥', label: 'Downloads', path: `${homePath}\\Downloads` },
      { icon: '📄', label: 'Documents', path: `${homePath}\\Documents` },
    ];
  };

  // Get drives (This PC)
  const getDrives = () => {
    return [
      { icon: '💾', label: 'C:', path: 'C:\\' },
      { icon: '💾', label: 'D:', path: 'D:\\' },
    ];
  };

  // Handle attach
  const handleAttach = () => {
    if (mode === 'folder') {
      // Folder selection mode - select current folder or selected folder
      if (selected.size === 1) {
        const selectedPath = Array.from(selected)[0];
        const entry = entries.find(e => e.path === selectedPath);
        if (entry && (entry.type === 'dir' || entry.type === 'directory')) {
          onAttach([{ type: 'dir', path: entry.path, name: entry.name }]);
        }
      } else {
        // No selection, use current folder
        onAttach([{ type: 'dir', path: currentPath, name: currentPath.split(/[\\/]/).pop() }]);
      }
    } else {
      // File attachment mode
      if (selected.size === 0) return;
      
      const items = Array.from(selected).map(path => {
        const entry = entries.find(e => e.path === path);
        return {
          type: entry?.type || 'file',
          path,
          name: entry?.name || path.split(/[\\/]/).pop()
        };
      });
      
      onAttach(items);
    }
    onClose();
  };

  // Handle column header click
  const handleColumnSort = (column) => {
    if (column === 'name') {
      setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc');
    } else {
      setSortBy(column);
    }
  };

  const breadcrumbs = getBreadcrumbs();
  const quickAccessPaths = getQuickAccessPaths();
  const drives = getDrives();
  const workspaceName = workspacePath ? workspacePath.split(/[\\/]/).pop() : '';
  const filteredEntries = getFilteredEntries();
  
  // Get selected entry for preview
  const selectedEntry = selected.size === 1 
    ? entries.find(e => e.path === Array.from(selected)[0])
    : null;
  
  const selectedItems = Array.from(selected).map(path => {
    const entry = entries.find(e => e.path === path);
    return entry?.name || path.split(/[\\/]/).pop();
  });

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name-asc': return 'Name ↑';
      case 'name-desc': return 'Name ↓';
      case 'modified': return 'Modified';
      case 'size': return 'Size';
      case 'type': return 'Type';
      default: return 'Name ↑';
    }
  };

  return (
    <div className="file-picker-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="file-picker-modal">
        {/* Header */}
        <div className="file-picker-header">
          <div className="header-left">
            <div className="breadcrumb-nav">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="breadcrumb-separator">›</span>}
                  <button
                    className={`breadcrumb-segment ${idx === breadcrumbs.length - 1 ? 'active' : ''}`}
                    onClick={() => navigateTo(crumb.path)}
                  >
                    {crumb.segment}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div className="header-center">
            <input
              type="text"
              className="search-input"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="header-right">
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="3" width="12" height="2" />
                <rect x="2" y="7" width="12" height="2" />
                <rect x="2" y="11" width="12" height="2" />
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="2" width="5" height="5" />
                <rect x="9" y="2" width="5" height="5" />
                <rect x="2" y="9" width="5" height="5" />
                <rect x="9" y="9" width="5" height="5" />
              </svg>
            </button>
            
            <div className="sort-dropdown-wrapper" ref={sortMenuRef}>
              <button
                className="sort-dropdown-btn"
                onClick={() => setShowSortMenu(!showSortMenu)}
              >
                {getSortLabel()}
                <span className="dropdown-chevron">▾</span>
              </button>
              {showSortMenu && (
                <div className="sort-dropdown-menu">
                  <button className="sort-option" onClick={() => { setSortBy('name-asc'); setShowSortMenu(false); }}>
                    Name ↑
                  </button>
                  <button className="sort-option" onClick={() => { setSortBy('name-desc'); setShowSortMenu(false); }}>
                    Name ↓
                  </button>
                  <button className="sort-option" onClick={() => { setSortBy('modified'); setShowSortMenu(false); }}>
                    Modified
                  </button>
                  <button className="sort-option" onClick={() => { setSortBy('size'); setShowSortMenu(false); }}>
                    Size
                  </button>
                  <button className="sort-option" onClick={() => { setSortBy('type'); setShowSortMenu(false); }}>
                    Type
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="file-picker-body">
          {/* Left Column - Bookmarks */}
          <div className="bookmarks-column">
            <div className="bookmarks-title">BOOKMARKS</div>
            
            {/* Quick Access */}
            <div className="bookmarks-section">
              {quickAccessPaths.map((item, idx) => (
                <button
                  key={idx}
                  className={`bookmark-item ${currentPath === item.path ? 'active' : ''}`}
                  onClick={() => navigateTo(item.path)}
                >
                  <span className="bookmark-icon">{item.icon}</span>
                  <span className="bookmark-label">{item.label}</span>
                </button>
              ))}
            </div>

            {/* This PC (Drives) */}
            <div className="bookmarks-section">
              {drives.map((drive, idx) => (
                <button
                  key={idx}
                  className={`bookmark-item ${currentPath === drive.path ? 'active' : ''}`}
                  onClick={() => navigateTo(drive.path)}
                >
                  <span className="bookmark-icon">{drive.icon}</span>
                  <span className="bookmark-label">{drive.label}</span>
                </button>
              ))}
            </div>

            {/* Workspace */}
            {workspacePath && (
              <div className="bookmarks-section">
                <button
                  className={`bookmark-item ${currentPath === workspacePath ? 'active' : ''}`}
                  onClick={() => navigateTo(workspacePath)}
                >
                  <span className="bookmark-icon">📁</span>
                  <span className="bookmark-label">{workspaceName}</span>
                </button>
                {workspaceSubdirs.map((dir, idx) => (
                  <button
                    key={idx}
                    className={`bookmark-item workspace-subdir ${currentPath === dir.path ? 'active' : ''}`}
                    onClick={() => navigateTo(dir.path)}
                  >
                    <div
                      className="folder-color-square"
                      style={{ backgroundColor: '#f5a623' }}
                    />
                    <span className="bookmark-label">{dir.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Pinned */}
            {pinnedDirs.length > 0 && (
              <div className="bookmarks-section">
                {pinnedDirs.map((pin, idx) => (
                  <button
                    key={idx}
                    className={`bookmark-item ${currentPath === pin.path ? 'active' : ''}`}
                    onClick={() => navigateTo(pin.path)}
                  >
                    <span className="bookmark-icon">📌</span>
                    <span className="bookmark-label">{pin.name}</span>
                    <button
                      className="bookmark-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(pin.path, pin.name);
                      }}
                      title="Unpin"
                    >
                      ×
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center Column - File List (Placeholder) */}
          <div className="files-column">
            {/* Toolbar */}
            <div className="files-toolbar">
              <div className="toolbar-left">
                <button
                  className="toolbar-nav-btn"
                  onClick={goBack}
                  disabled={historyIndex === 0}
                  title="Back"
                >
                  ←
                </button>
                <button
                  className="toolbar-nav-btn"
                  onClick={goForward}
                  disabled={historyIndex === history.length - 1}
                  title="Forward"
                >
                  →
                </button>
                <button
                  className="toolbar-nav-btn"
                  onClick={goUp}
                  title="Up"
                >
                  ↑
                </button>
              </div>
              <div className="toolbar-right">
                <button
                  className="new-folder-btn"
                  onClick={() => setShowNewFolderInput(true)}
                >
                  + New Folder
                </button>
              </div>
            </div>

            {/* File List Content */}
            <div className="files-content" ref={fileListRef}>
              {loading ? (
                <div className="loading-skeleton">
                  {[70, 50, 80, 40, 65, 55, 75, 45].map((width, idx) => (
                    <div
                      key={idx}
                      className="skeleton-row"
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="error-state">
                  <div className="error-icon">⚠</div>
                  <div className="error-text">{error}</div>
                  <button
                    className="retry-btn"
                    onClick={() => loadDirectory(currentPath)}
                  >
                    Retry
                  </button>
                </div>
              ) : filteredEntries.length === 0 && !showNewFolderInput ? (
                <div className="empty-state">
                  {searchQuery ? `No results for "${searchQuery}"` : 'Empty folder'}
                </div>
              ) : (
                <>
                  {searchQuery && (
                    <div className="search-results-count">
                      {filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {viewMode === 'list' ? (
                    <div className="file-list-view">
                      {/* Column Headers */}
                      <div className="file-list-header">
                        <div
                          className="header-col header-name"
                          onClick={() => handleColumnSort('name')}
                        >
                          Name {(sortBy === 'name-asc' || sortBy === 'name-desc') && (sortBy === 'name-asc' ? '↑' : '↓')}
                        </div>
                        <div
                          className="header-col header-type"
                          onClick={() => handleColumnSort('type')}
                        >
                          Type {sortBy === 'type' && '↑'}
                        </div>
                        <div
                          className="header-col header-modified"
                          onClick={() => handleColumnSort('modified')}
                        >
                          Modified {sortBy === 'modified' && '↓'}
                        </div>
                        <div
                          className="header-col header-size"
                          onClick={() => handleColumnSort('size')}
                        >
                          Size {sortBy === 'size' && '↓'}
                        </div>
                      </div>

                      {/* New Folder Input Row */}
                      {showNewFolderInput && (
                        <div className="file-row new-folder-row">
                          <div className="file-icon-cell">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="#f5a623">
                              <path d="M2 3a1 1 0 011-1h4l1 1h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
                            </svg>
                          </div>
                          <input
                            ref={newFolderInputRef}
                            className="new-folder-input"
                            value={newFolderValue}
                            onChange={(e) => setNewFolderValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleNewFolder();
                              } else if (e.key === 'Escape') {
                                setShowNewFolderInput(false);
                                setNewFolderValue('');
                              }
                            }}
                            placeholder="Folder name"
                          />
                        </div>
                      )}

                      {/* File Rows */}
                      {filteredEntries.map((entry, idx) => (
                        <div
                          key={entry.path}
                          className={`file-row ${selected.has(entry.path) ? 'selected' : ''}`}
                          onClick={(e) => handleEntryClick(entry, idx, e)}
                          onDoubleClick={() => handleEntryDoubleClick(entry)}
                          onContextMenu={(e) => handleEntryRightClick(entry, e)}
                        >
                          <div className="file-icon-cell">
                            {(entry.type === 'dir' || entry.type === 'directory') ? (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="#f5a623">
                                <path d="M2 3a1 1 0 011-1h4l1 1h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
                              </svg>
                            ) : (
                              <div
                                className="file-badge-small"
                                style={{
                                  backgroundColor: getFileIcon(entry.name).bg,
                                  color: getFileIcon(entry.name).color,
                                }}
                              >
                                {getFileIcon(entry.name).text}
                              </div>
                            )}
                          </div>
                          <div className="file-name-cell">{entry.name}</div>
                          <div className="file-type-cell">{getFileType(entry)}</div>
                          <div className="file-modified-cell">{formatDate(entry.mtime)}</div>
                          <div className="file-size-cell">{formatBytes(entry.size)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="file-grid-view">
                      {/* New Folder Input Cell */}
                      {showNewFolderInput && (
                        <div className="grid-cell new-folder-cell">
                          <svg width="20" height="20" viewBox="0 0 16 16" fill="#f5a623">
                            <path d="M2 3a1 1 0 011-1h4l1 1h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
                          </svg>
                          <input
                            ref={newFolderInputRef}
                            className="new-folder-input-grid"
                            value={newFolderValue}
                            onChange={(e) => setNewFolderValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleNewFolder();
                              } else if (e.key === 'Escape') {
                                setShowNewFolderInput(false);
                                setNewFolderValue('');
                              }
                            }}
                            placeholder="Folder name"
                          />
                        </div>
                      )}

                      {/* Grid Cells */}
                      {filteredEntries.map((entry, idx) => (
                        <div
                          key={entry.path}
                          className={`grid-cell ${selected.has(entry.path) ? 'selected' : ''}`}
                          onClick={(e) => handleEntryClick(entry, idx, e)}
                          onDoubleClick={() => handleEntryDoubleClick(entry)}
                          onContextMenu={(e) => handleEntryRightClick(entry, e)}
                        >
                          {(entry.type === 'dir' || entry.type === 'directory') ? (
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="#f5a623">
                              <path d="M2 3a1 1 0 011-1h4l1 1h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
                            </svg>
                          ) : (
                            <div
                              className="file-badge-grid"
                              style={{
                                backgroundColor: getFileIcon(entry.name).bg,
                                color: getFileIcon(entry.name).color,
                              }}
                            >
                              {getFileIcon(entry.name).text}
                            </div>
                          )}
                          <div className="grid-cell-name">{entry.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column - Preview (Placeholder) */}
          <div className="preview-column">
            {selected.size === 0 ? (
              <div className="preview-empty">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="var(--text-3)">
                  <path d="M2 3a1 1 0 011-1h4l1 1h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
                </svg>
                <div className="preview-empty-text">Select a file</div>
              </div>
            ) : selected.size === 1 && selectedEntry ? (
              <div className="preview-single">
                {(selectedEntry.type === 'dir' || selectedEntry.type === 'directory') ? (
                  <>
                    <svg width="40" height="40" viewBox="0 0 16 16" fill="#f5a623">
                      <path d="M2 3a1 1 0 011-1h4l1 1h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
                    </svg>
                    <div className="preview-name">{selectedEntry.name}</div>
                    <div className="preview-type">Folder</div>
                    {folderItemCount !== null && (
                      <div className="preview-meta">{folderItemCount} item{folderItemCount !== 1 ? 's' : ''}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      className="file-badge-large"
                      style={{
                        backgroundColor: getFileIcon(selectedEntry.name).bg,
                        color: getFileIcon(selectedEntry.name).color,
                      }}
                    >
                      {getFileIcon(selectedEntry.name).text}
                    </div>
                    <div className="preview-name">{selectedEntry.name}</div>
                    <div className="preview-type">{getFileType(selectedEntry)}</div>
                    <div className="preview-meta">{formatBytes(selectedEntry.size)}</div>
                    <div className="preview-meta">{formatDate(selectedEntry.mtime)}</div>
                    
                    {previewLoading ? (
                      <div className="preview-loading">Loading preview...</div>
                    ) : previewContent ? (
                      <div className="preview-text-content">
                        <pre>{previewContent}</pre>
                      </div>
                    ) : (
                      <div className="preview-unavailable">Preview unavailable</div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="preview-multi">
                <div className="preview-multi-count">{selected.size} items selected</div>
                <div className="preview-multi-list">
                  {selectedItems.slice(0, 5).map((name, idx) => (
                    <div key={idx} className="preview-multi-item">
                      {name.length > 20 ? name.slice(0, 20) + '...' : name}
                    </div>
                  ))}
                  {selectedItems.length > 5 && (
                    <div className="preview-multi-more">+ {selectedItems.length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="file-picker-footer">
          <div className="footer-left">
            {mode === 'folder' ? (
              <span className="footer-status">{currentPath || 'No folder selected'}</span>
            ) : selected.size === 0 ? (
              <span className="footer-status">No selection</span>
            ) : selected.size === 1 ? (
              <span className="footer-status">{Array.from(selected)[0]}</span>
            ) : (
              <span className="footer-status">{selected.size} items selected</span>
            )}
          </div>
          <div className="footer-right">
            <button className="footer-btn cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="footer-btn attach-btn"
              onClick={handleAttach}
              disabled={mode === 'attach' && selected.size === 0}
            >
              {mode === 'folder' ? 'Select Folder' : 'Attach'}
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="file-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              togglePin(contextMenu.entry.path, contextMenu.entry.name);
              setContextMenu(null);
            }}
          >
            {pinnedDirs.some(p => p.path === contextMenu.entry.path) ? '📌 Unpin from Bookmarks' : '📌 Pin to Bookmarks'}
          </button>
        </div>
      )}
    </div>
  );
}

export default FilePicker;
