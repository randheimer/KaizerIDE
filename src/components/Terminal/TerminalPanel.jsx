import React, { useState, useRef, useEffect } from 'react';
import './TerminalPanel.css';

function TerminalPanel({ workspacePath }) {
  const [terminals, setTerminals] = useState([]);
  const [activeTerminalId, setActiveTerminalId] = useState(null);
  const [splitView, setSplitView] = useState(false);
  const outputRefs = useRef({});
  const inputRefs = useRef({});

  useEffect(() => {
    // Auto-scroll to bottom when output changes
    if (activeTerminalId && outputRefs.current[activeTerminalId]) {
      outputRefs.current[activeTerminalId].scrollTop = outputRefs.current[activeTerminalId].scrollHeight;
    }
  }, [terminals, activeTerminalId]);

  useEffect(() => {
    // Listen for new terminal event
    const handleNewTerminal = () => {
      createNewTerminal('powershell');
    };

    window.addEventListener('kaizer:new-terminal', handleNewTerminal);
    return () => {
      window.removeEventListener('kaizer:new-terminal', handleNewTerminal);
    };
  }, [terminals.length, workspacePath]);

  const createNewTerminal = (shell = 'powershell') => {
    const newTerminal = {
      id: Date.now(),
      name: `Terminal ${terminals.length + 1}`,
      shell,
      output: [],
      input: '',
      cwd: workspacePath || 'C:\\',
      history: [],
      historyIndex: -1
    };
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminalId(newTerminal.id);
  };

  const closeTerminal = (id) => {
    setTerminals(prev => prev.filter(t => t.id !== id));
    if (activeTerminalId === id) {
      const remaining = terminals.filter(t => t.id !== id);
      setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const executeCommand = async (terminalId, command) => {
    if (!command.trim()) return;

    const terminal = terminals.find(t => t.id === terminalId);
    if (!terminal) return;

    // Add command to output
    setTerminals(prev => prev.map(t => 
      t.id === terminalId 
        ? { 
            ...t, 
            output: [...t.output, { type: 'command', text: `${t.cwd}> ${command}` }],
            history: [...t.history, command],
            historyIndex: -1,
            input: ''
          }
        : t
    ));

    // Execute command via Electron
    try {
      const result = await window.electron.executeCommand(command, terminal.cwd);
      
      setTerminals(prev => prev.map(t => 
        t.id === terminalId 
          ? { 
              ...t, 
              output: [
                ...t.output, 
                { 
                  type: result.success ? 'success' : 'error', 
                  text: result.output || result.error || 'Command executed'
                }
              ],
              cwd: result.cwd || t.cwd
            }
          : t
      ));
    } catch (error) {
      setTerminals(prev => prev.map(t => 
        t.id === terminalId 
          ? { 
              ...t, 
              output: [...t.output, { type: 'error', text: `Error: ${error.message}` }]
            }
          : t
      ));
    }
  };

  const handleKeyDown = (terminalId, e) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (!terminal) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(terminalId, terminal.input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminal.history.length > 0) {
        const newIndex = terminal.historyIndex === -1 
          ? terminal.history.length - 1 
          : Math.max(0, terminal.historyIndex - 1);
        setTerminals(prev => prev.map(t => 
          t.id === terminalId 
            ? { ...t, historyIndex: newIndex, input: t.history[newIndex] }
            : t
        ));
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (terminal.historyIndex !== -1) {
        const newIndex = terminal.historyIndex + 1;
        if (newIndex >= terminal.history.length) {
          setTerminals(prev => prev.map(t => 
            t.id === terminalId 
              ? { ...t, historyIndex: -1, input: '' }
              : t
          ));
        } else {
          setTerminals(prev => prev.map(t => 
            t.id === terminalId 
              ? { ...t, historyIndex: newIndex, input: t.history[newIndex] }
              : t
          ));
        }
      }
    }
  };

  const clearTerminal = (terminalId) => {
    setTerminals(prev => prev.map(t => 
      t.id === terminalId ? { ...t, output: [] } : t
    ));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleOutputClick = (e) => {
    // Auto-detect and send selected text to chat
    const selection = window.getSelection();
    const selectedText = selection.toString();
    if (selectedText && selectedText.trim()) {
      // Automatically send to chat when text is selected
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('kaizer:paste-to-chat', { 
          detail: { 
            text: selectedText,
            type: 'terminal'
          } 
        }));
      }, 100);
    }
  };

  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

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
              <span className="terminal-tab-icon">💻</span>
              <span>{terminal.name}</span>
              <span
                className="terminal-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(terminal.id);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <div className="terminal-actions">
          <button 
            className="terminal-action-btn" 
            onClick={() => createNewTerminal('powershell')}
            title="New Terminal"
          >
            +
          </button>
          <button 
            className="terminal-action-btn" 
            onClick={() => setSplitView(!splitView)}
            title="Split Terminal"
            disabled={terminals.length < 2}
          >
            ⬌
          </button>
          <button 
            className="terminal-action-btn" 
            onClick={() => activeTerminalId && clearTerminal(activeTerminalId)}
            title="Clear Terminal"
            disabled={!activeTerminalId}
          >
            🗑
          </button>
          <button 
            className="terminal-action-btn terminal-close-all" 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('kaizer:close-terminal'));
            }}
            title="Close Terminal Panel"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="terminal-content">
        {terminals.length === 0 ? (
          <div className="terminal-empty">
            <span className="terminal-empty-icon">💻</span>
            <span className="terminal-empty-text">No terminals open</span>
            <span className="terminal-empty-hint">Click + to create a new terminal</span>
          </div>
        ) : (
          terminals.map(terminal => (
            <div
              key={terminal.id}
              className={`terminal-instance ${activeTerminalId === terminal.id ? 'active' : ''}`}
            >
              <div 
                className="terminal-output"
                ref={el => outputRefs.current[terminal.id] = el}
                onMouseUp={handleOutputClick}
              >
                {terminal.output.map((line, idx) => (
                  <div key={idx} className={`terminal-line ${line.type}`}>
                    {line.type === 'command' && <span className="terminal-prompt">{line.text}</span>}
                    {line.type !== 'command' && <pre className="terminal-output-text">{line.text}</pre>}
                  </div>
                ))}
              </div>
              <div className="terminal-input-area">
                <span className="terminal-input-prompt">{terminal.cwd}{'>'}</span>
                <input
                  ref={el => inputRefs.current[terminal.id] = el}
                  type="text"
                  className="terminal-input"
                  value={terminal.input}
                  onChange={(e) => setTerminals(prev => prev.map(t => 
                    t.id === terminal.id ? { ...t, input: e.target.value } : t
                  ))}
                  onKeyDown={(e) => handleKeyDown(terminal.id, e)}
                  placeholder="Type a command..."
                  autoFocus={activeTerminalId === terminal.id}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TerminalPanel;
