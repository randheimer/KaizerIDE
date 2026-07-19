import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './MenuBar.css';

function MenuBar({ onMenuAction, showOnlyHelp = false }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [isMacOS, setIsMacOS] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [isClosing, setIsClosing] = useState(false);
  const menuBarRef = useRef(null);
  const menuButtonRefs = useRef({});

  useEffect(() => {
    // Load appearance settings
    const saved = localStorage.getItem('kaizer-appearance-settings');
    const settings = saved ? JSON.parse(saved) : { windowControlsTheme: 'windows' };
    setIsMacOS(settings.windowControlsTheme === 'macos');

    // Listen for settings changes
    const handleSettingsChange = (e) => {
      const newSettings = e.detail;
      setIsMacOS(newSettings.windowControlsTheme === 'macos');
    };

    window.addEventListener('kaizer:appearance-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('kaizer:appearance-settings-changed', handleSettingsChange);
  }, []);

  const menus = {
    file: {
      label: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: 'new-file' },
        { label: 'Open Folder...', shortcut: 'Ctrl+O', action: 'open-folder' },
        { type: 'separator' },
        { label: 'Save', shortcut: 'Ctrl+S', action: 'save-file' },
        { label: 'Save All', shortcut: 'Ctrl+K S', action: 'save-all' },
        { type: 'separator' },
        { label: 'Close Editor', shortcut: 'Ctrl+W', action: 'close-tab' },
        { label: 'Close Folder', action: 'close-folder' },
      ]
    },
    edit: {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
        { type: 'separator' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
        { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
        { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
        { type: 'separator' },
        { label: 'Find', shortcut: 'Ctrl+F', action: 'find' },
        { label: 'Replace', shortcut: 'Ctrl+H', action: 'replace' },
      ]
    },
    selection: {
      label: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: 'select-all' },
        { label: 'Expand Selection', shortcut: 'Shift+Alt+→', action: 'expand-selection' },
        { label: 'Shrink Selection', shortcut: 'Shift+Alt+←', action: 'shrink-selection' },
        { type: 'separator' },
        { label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+↑', action: 'cursor-above' },
        { label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+↓', action: 'cursor-below' },
      ]
    },
    view: {
      label: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: 'command-palette' },
        { type: 'separator' },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: 'toggle-explorer' },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: 'toggle-search' },
        { type: 'separator' },
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: 'toggle-sidebar' },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J', action: 'toggle-panel' },
      ]
    },
    go: {
      label: 'Go',
      items: [
        { label: 'Go to File...', shortcut: 'Ctrl+P', action: 'go-to-file' },
        { label: 'Go to Line...', shortcut: 'Ctrl+G', action: 'go-to-line' },
        { type: 'separator' },
        { label: 'Back', shortcut: 'Alt+←', action: 'navigate-back' },
        { label: 'Forward', shortcut: 'Alt+→', action: 'navigate-forward' },
      ]
    },
    run: {
      label: 'Run',
      items: [
        { label: 'Run File', shortcut: 'Ctrl+Shift+R', action: 'run-file' },
        { label: 'Run Task...', action: 'run-task' },
        { type: 'separator' },
        { label: 'Start Debugging', shortcut: 'F5', action: 'start-debug' },
        { label: 'Stop Debugging', shortcut: 'Shift+F5', action: 'stop-debug' },
      ]
    },
    terminal: {
      label: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: 'new-terminal' },
        { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5', action: 'split-terminal' },
        { type: 'separator' },
        { label: 'Toggle Terminal Panel', shortcut: 'Ctrl+`', action: 'toggle-terminal' },
        { type: 'separator' },
        { label: 'Run Active File', action: 'run-active-file' },
        { label: 'Run Selected Text', action: 'run-selected-text' },
      ]
    },
    help: {
      label: 'Help',
      items: [
        { label: 'Welcome', action: 'show-welcome' },
        { label: 'Documentation', action: 'show-docs' },
        { type: 'separator' },
        { label: 'Settings', shortcut: 'Ctrl+,', action: 'open-settings' },
        { type: 'separator' },
        { label: 'About', action: 'show-about' },
      ]
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target)) {
        // Close with animation when clicking outside
        if (activeMenu) {
          setIsClosing(true);
          setTimeout(() => {
            setActiveMenu(null);
            setIsClosing(false);
          }, 120);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Close with animation on Escape
        if (activeMenu) {
          setIsClosing(true);
          setTimeout(() => {
            setActiveMenu(null);
            setIsClosing(false);
          }, 120);
        }
      }
    };

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  const handleMenuClick = (menuKey) => {
    if (activeMenu === menuKey) {
      // Close with animation
      setIsClosing(true);
      setTimeout(() => {
        setActiveMenu(null);
        setIsClosing(false);
      }, 120); // Match animation duration
    } else if (activeMenu && activeMenu !== menuKey) {
      // Switching between menus - close current, then open new
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        setActiveMenu(menuKey);
        // Calculate dropdown position for new menu
        const buttonElement = menuButtonRefs.current[menuKey];
        if (buttonElement) {
          const rect = buttonElement.getBoundingClientRect();
          let x = rect.left;
          let y = rect.bottom + 6;
          
          // Prevent dropdown from going off-screen
          const dropdownWidth = 220;
          const dropdownHeight = 400;
          
          if (x + dropdownWidth > window.innerWidth) {
            x = window.innerWidth - dropdownWidth - 8;
          }
          
          if (y + dropdownHeight > window.innerHeight) {
            y = window.innerHeight - dropdownHeight - 8;
          }
          
          x = Math.max(8, x);
          y = Math.max(8, y);
          
          setDropdownPosition({ x, y });
        }
      }, 120);
    } else {
      // Opening first menu
      setIsClosing(false);
      setActiveMenu(menuKey);
      // Calculate dropdown position
      const buttonElement = menuButtonRefs.current[menuKey];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        let x = rect.left;
        let y = rect.bottom + 6;
        
        // Prevent dropdown from going off-screen
        const dropdownWidth = 220; // min-width from CSS
        const dropdownHeight = 400; // estimated max height
        
        // Check right edge
        if (x + dropdownWidth > window.innerWidth) {
          x = window.innerWidth - dropdownWidth - 8;
        }
        
        // Check bottom edge
        if (y + dropdownHeight > window.innerHeight) {
          y = window.innerHeight - dropdownHeight - 8;
        }
        
        // Ensure minimum distance from edges
        x = Math.max(8, x);
        y = Math.max(8, y);
        
        setDropdownPosition({ x, y });
      }
    }
  };

  const handleMenuItemClick = (action) => {
    // Close with animation
    setIsClosing(true);
    setTimeout(() => {
      setActiveMenu(null);
      setIsClosing(false);
      if (onMenuAction) {
        onMenuAction(action);
      }
    }, 120); // Match animation duration
  };

  const menuEntries = Object.entries(menus);
  const orderedMenus = isMacOS ? [...menuEntries].reverse() : menuEntries;
  
  // Filter to show only Help menu if showOnlyHelp is true
  const displayMenus = showOnlyHelp 
    ? orderedMenus.filter(([key]) => key === 'help')
    : orderedMenus;

  return (
    <div className={`menu-bar ${isMacOS ? 'menu-bar-macos' : ''}`} ref={menuBarRef}>
      {displayMenus.map(([key, menu]) => (
        <div key={key} className="menu-item">
          <button
            ref={(el) => (menuButtonRefs.current[key] = el)}
            className={`menu-button ${activeMenu === key ? 'active' : ''}`}
            onClick={() => handleMenuClick(key)}
          >
            {menu.label}
          </button>
        </div>
      ))}
      
      {activeMenu && ReactDOM.createPortal(
        <div 
          className={`menu-dropdown ${isClosing ? 'closing' : ''}`}
          style={{
            left: `${dropdownPosition.x}px`,
            top: `${dropdownPosition.y}px`
          }}
        >
          {menus[activeMenu].items.map((item, index) => {
            if (item.type === 'separator') {
              return <div key={index} className="menu-separator" />;
            }
            return (
              <button
                key={index}
                className="menu-dropdown-item"
                onClick={() => handleMenuItemClick(item.action)}
              >
                <span className="menu-item-label">{item.label}</span>
                {item.shortcut && (
                  <span className="menu-item-shortcut">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

export default MenuBar;
