import React, { useState, useEffect, useCallback } from 'react';
import './TaskRunner.css';

function TaskRunner({ workspacePath }) {
  const [scripts, setScripts] = useState({});
  const [running, setRunning] = useState(null);
  const [output, setOutput] = useState([]);

  const loadScripts = useCallback(async () => {
    if (!workspacePath) return;
    try {
      const result = await window.electron?.readFile?.(`${workspacePath}\\package.json`);
      if (result?.success) {
        const pkg = JSON.parse(result.content);
        setScripts(pkg.scripts || {});
      } else {
        setScripts({});
      }
    } catch {
      setScripts({});
    }
  }, [workspacePath]);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  const runScript = async (name) => {
    if (running) return;
    setRunning(name);
    setOutput([`> npm run ${name}\n`]);

    try {
      const result = await window.electron?.executeCommand?.(`npm run ${name}`, workspacePath);
      if (result?.success) {
        setOutput(prev => [...prev, result.output || '(no output)']);
      } else {
        setOutput(prev => [...prev, `Error: ${result?.error || 'Unknown error'}`]);
      }
    } catch (err) {
      setOutput(prev => [...prev, `Error: ${err.message}`]);
    }
    setRunning(null);
  };

  const runInTerminal = (name) => {
    // Dispatch event to open terminal and run the command
    window.dispatchEvent(new CustomEvent('kaizer:run-in-terminal', {
      detail: { command: `npm run ${name}`, cwd: workspacePath }
    }));
  };

  const scriptNames = Object.keys(scripts);

  return (
    <div className="task-runner">
      <div className="task-runner-header">
        <span>TASKS</span>
        <button className="task-refresh" onClick={loadScripts} title="Refresh">↻</button>
      </div>

      <div className="task-list">
        {scriptNames.length === 0 ? (
          <div className="task-empty">
            {workspacePath ? 'No scripts in package.json' : 'Open a workspace first'}
          </div>
        ) : (
          scriptNames.map(name => (
            <div key={name} className="task-item">
              <div className="task-info">
                <span className="task-name">{name}</span>
                <span className="task-command">{scripts[name]}</span>
              </div>
              <div className="task-actions">
                <button
                  className="task-run-btn"
                  onClick={() => runScript(name)}
                  disabled={running !== null}
                  title="Run inline"
                >
                  {running === name ? '⟳' : '▶'}
                </button>
                <button
                  className="task-terminal-btn"
                  onClick={() => runInTerminal(name)}
                  title="Run in terminal"
                >
                  ⌘
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {output.length > 0 && (
        <div className="task-output">
          <div className="task-output-header">
            <span>Output</span>
            <button className="task-clear" onClick={() => setOutput([])}>Clear</button>
          </div>
          <pre className="task-output-content">
            {output.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

export default TaskRunner;
