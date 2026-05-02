import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import 'xterm/css/xterm.css';
import './TerminalPanel.css';

let nextTermId = 1;

function TerminalPanel({ workspacePath }) {
  const [terminals, setTerminals] = useState([]);
  const [activeTerminalId, setActiveTerminalId] = useState(null);
  const xtermRefs = useRef({});   // id -> { terminal, fitAddon, searchAddon, containerEl }
  const cleanupRefs = useRef({}); // id -> cleanup functions

  // Create a new PTY-backed terminal
  const createTerminal = useCallback(async () => {
    const id = `term-${nextTermId++}`;
    const name = `Terminal ${nextTermId - 1}`;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
      theme: {
        background: '#0c0c0c',
        foreground: '#cccccc',
        cursor: '#c084fc',
        selectionBackground: 'rgba(168, 85, 247, 0.3)',
        black: '#1e1e1e',
        red: '#f14c4c',
        green: '#73c991',
        yellow: '#e2c04d',
        blue: '#3b82f6',
        magenta: '#c084fc',
        cyan: '#0ea5e9',
        white: '#cccccc',
        brightBlack: '#666666',
        brightRed: '#ff6b6b',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#d8b4fe',
        brightCyan: '#38bdf8',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    xtermRefs.current[id] = { terminal, fitAddon, searchAddon, containerEl: null };

    // Spawn PTY
    if (window.electron?.ptySpawn) {
      const result = await window.electron.ptySpawn({
        id,
        cwd: workspacePath || undefined,
      });

      if (!result.success) {
        terminal.writeln(`\x1b[31mFailed to start terminal: ${result.error}\x1b[0m`);
      }
    }

    // Listen for PTY data
    const onDataCleanup = window.electron?.onPtyData?.(({ id: termId, data }) => {
      if (termId === id) {
        terminal.write(data);
      }
    });

    // Listen for PTY exit
    const onExitCleanup = window.electron?.onPtyExit?.(({ id: termId, exitCode }) => {
      if (termId === id) {
        terminal.writeln(`\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m`);
      }
    });

    // Forward terminal input to PTY
    const inputDisposable = terminal.onData((data) => {
      window.electron?.ptyWrite({ id, data });
    });

    cleanupRefs.current[id] = () => {
      onDataCleanup?.();
      onExitCleanup?.();
      inputDisposable.dispose();
    };

    setTerminals(prev => [...prev, { id, name }]);
    setActiveTerminalId(id);

    return id;
  }, [workspacePath]);

  // Auto-create first terminal on mount
  useEffect(() => {
    if (terminals.length === 0) {
      createTerminal();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for external new-terminal event
  useEffect(() => {
    const handler = () => createTerminal();
    window.addEventListener('kaizer:new-terminal', handler);
    return () => window.removeEventListener('kaizer:new-terminal', handler);
  }, [createTerminal]);

  // Mount xterm to DOM when container ref becomes available
  const containerRefCallback = useCallback((id, el) => {
    if (!el || !xtermRefs.current[id]) return;
    const { terminal, fitAddon } = xtermRefs.current[id];

    if (xtermRefs.current[id].containerEl === el) return;
    xtermRefs.current[id].containerEl = el;

    terminal.open(el);
    // Fit after open with a small delay for layout
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        // Notify PTY of actual size
        window.electron?.ptyResize({
          id,
          cols: terminal.cols,
          rows: terminal.rows,
        });
      } catch {}
    });
  }, []);

  // Fit all terminals on resize
  useEffect(() => {
    const handleResize = () => {
      for (const [id, ref] of Object.entries(xtermRefs.current)) {
        if (ref.containerEl) {
          try {
            ref.fitAddon.fit();
            window.electron?.ptyResize({
              id,
              cols: ref.terminal.cols,
              rows: ref.terminal.rows,
            });
          } catch {}
        }
      }
    };

    const observer = new ResizeObserver(handleResize);
    const contentEl = document.querySelector('.terminal-content');
    if (contentEl) observer.observe(contentEl);

    return () => observer.disconnect();
  }, []);

  // Focus active terminal when tab changes
  useEffect(() => {
    if (activeTerminalId && xtermRefs.current[activeTerminalId]) {
      const { terminal, fitAddon } = xtermRefs.current[activeTerminalId];
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          window.electron?.ptyResize({
            id: activeTerminalId,
            cols: terminal.cols,
            rows: terminal.rows,
          });
        } catch {}
        terminal.focus();
      });
    }
  }, [activeTerminalId]);

  const closeTerminal = (id) => {
    // Kill PTY
    window.electron?.ptyKill({ id });
    // Cleanup listeners
    cleanupRefs.current[id]?.();
    delete cleanupRefs.current[id];
    // Dispose xterm
    if (xtermRefs.current[id]) {
      xtermRefs.current[id].terminal.dispose();
      delete xtermRefs.current[id];
    }

    setTerminals(prev => prev.filter(t => t.id !== id));
    if (activeTerminalId === id) {
      const remaining = terminals.filter(t => t.id !== id);
      setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const clearTerminal = (id) => {
    if (xtermRefs.current[id]) {
      xtermRefs.current[id].terminal.clear();
    }
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-tabs">
          {terminals.map(terminal => (
            <button
              key={terminal.id}
              className={`terminal-tab ${activeTerminalId === terminal.id ? 'active' : ''}`}
              onClick={() => setActiveTerminalId(terminal.id)}
            >
              <span className="terminal-tab-icon">&#x1F4BB;</span>
              <span>{terminal.name}</span>
              <span
                className="terminal-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(terminal.id);
                }}
              >
                &times;
              </span>
            </button>
          ))}
        </div>
        <div className="terminal-actions">
          <button
            className="terminal-action-btn"
            onClick={() => createTerminal()}
            title="New Terminal"
          >+</button>
          <button
            className="terminal-action-btn ssh-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('kaizer:open-ssh-modal'))}
            title="Connect to SSH"
          >&#x1F50C;</button>
          <button
            className="terminal-action-btn"
            onClick={() => activeTerminalId && clearTerminal(activeTerminalId)}
            title="Clear Terminal"
            disabled={!activeTerminalId}
          >&#x1F5D1;</button>
          <button
            className="terminal-action-btn terminal-close-all"
            onClick={() => window.dispatchEvent(new CustomEvent('kaizer:close-terminal'))}
            title="Close Terminal Panel"
          >&#x2715;</button>
        </div>
      </div>

      <div className="terminal-content">
        {terminals.length === 0 ? (
          <div className="terminal-empty">
            <span className="terminal-empty-icon">&#x1F4BB;</span>
            <span className="terminal-empty-text">No terminals open</span>
            <span className="terminal-empty-hint">Click + to create a new terminal</span>
          </div>
        ) : (
          terminals.map(terminal => (
            <div
              key={terminal.id}
              className={`terminal-instance ${activeTerminalId === terminal.id ? 'active' : ''}`}
              ref={(el) => el && containerRefCallback(terminal.id, el)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default TerminalPanel;
