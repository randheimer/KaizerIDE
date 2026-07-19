import React, { useState } from 'react';
import './HelpModal.css';

function HelpModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <div className="help-header-left">
            <span className="help-logo">K</span>
            <h2>KaizerIDE Help</h2>
          </div>
          <button className="help-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="help-modal-body">
          <div className="help-tabs">
            <button 
              className={`help-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📖 Overview
            </button>
            <button 
              className={`help-tab ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              ✨ Features
            </button>
            <button 
              className={`help-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 AI Chat
            </button>
            <button 
              className={`help-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              ⌨️ Shortcuts
            </button>
            <button 
              className={`help-tab ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              🤖 Models
            </button>
          </div>

          <div className="help-content">
            {activeTab === 'overview' && (
              <div className="help-section">
                <h3>Welcome to KaizerIDE</h3>
                <p>
                  KaizerIDE is a modern, AI-powered code editor built with React and Electron. 
                  It combines powerful editing capabilities with intelligent AI assistance to 
                  enhance your development workflow.
                </p>

                <div className="help-feature-grid">
                  <div className="help-feature-card">
                    <span className="feature-icon">📝</span>
                    <h4>Monaco Editor</h4>
                    <p>VS Code's powerful editor with syntax highlighting, IntelliSense, and more</p>
                  </div>
                  <div className="help-feature-card">
                    <span className="feature-icon">🤖</span>
                    <h4>AI Assistant</h4>
                    <p>Integrated AI chat with tool calling, file operations, and code generation</p>
                  </div>
                  <div className="help-feature-card">
                    <span className="feature-icon">📁</span>
                    <h4>File Explorer</h4>
                    <p>Full workspace navigation with drag-and-drop support</p>
                  </div>
                  <div className="help-feature-card">
                    <span className="feature-icon">💻</span>
                    <h4>Terminal</h4>
                    <p>Integrated terminal with command execution and output capture</p>
                  </div>
                </div>

                <div className="help-info-box">
                  <strong>💡 Quick Start:</strong>
                  <ol>
                    <li>Open a workspace folder using <code>File → Open Folder</code></li>
                    <li>Browse files in the left sidebar</li>
                    <li>Ask the AI assistant anything in the chat panel</li>
                    <li>Use the terminal for command execution</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="help-section">
                <h3>Core Features</h3>

                <div className="help-feature-list">
                  <div className="help-feature-item">
                    <h4>🎨 Code Editor</h4>
                    <ul>
                      <li>Syntax highlighting for 100+ languages</li>
                      <li>IntelliSense and auto-completion</li>
                      <li>Multi-cursor editing</li>
                      <li>Find and replace with regex support</li>
                      <li>Code folding and minimap</li>
                      <li>Diff viewer for file changes</li>
                    </ul>
                  </div>

                  <div className="help-feature-item">
                    <h4>📂 File Management</h4>
                    <ul>
                      <li>Full workspace file tree</li>
                      <li>Create, rename, delete files and folders</li>
                      <li>Drag and drop to chat for context</li>
                      <li>File search and filtering</li>
                      <li>Multiple file tabs</li>
                    </ul>
                  </div>

                  <div className="help-feature-item">
                    <h4>🔍 Search</h4>
                    <ul>
                      <li>Full-text search across workspace</li>
                      <li>Regex pattern matching</li>
                      <li>Case-sensitive and whole-word options</li>
                      <li>Search results with context</li>
                    </ul>
                  </div>

                  <div className="help-feature-item">
                    <h4>⚙️ Settings</h4>
                    <ul>
                      <li>Customizable themes (light/dark)</li>
                      <li>Font size and family configuration</li>
                      <li>Editor preferences</li>
                      <li>AI model selection and configuration</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="help-section">
                <h3>AI Chat Assistant</h3>
                <p>
                  The AI assistant can help you with coding tasks, answer questions, 
                  and perform file operations autonomously.
                </p>

                <div className="help-feature-item">
                  <h4>🛠️ Available Tools</h4>
                  <ul>
                    <li><code>read_file</code> - Read any file in the workspace</li>
                    <li><code>write_file</code> - Create or modify files</li>
                    <li><code>list_directory</code> - Explore project structure</li>
                    <li><code>run_command</code> - Execute shell commands (with permission)</li>
                    <li><code>search_files</code> - Full-text search across codebase</li>
                  </ul>
                </div>

                <div className="help-feature-item">
                  <h4>💭 Thinking Mode</h4>
                  <p>
                    The AI can show its reasoning process in collapsible thinking blocks. 
                    This helps you understand how it approaches complex problems.
                  </p>
                </div>

                <div className="help-feature-item">
                  <h4>📎 Context Attachment</h4>
                  <ul>
                    <li>Click <code>@</code> to attach files or folders</li>
                    <li>Drag files from explorer to chat</li>
                    <li>Currently open file is automatically included</li>
                    <li>Attach terminal output or code snippets</li>
                  </ul>
                </div>

                <div className="help-feature-item">
                  <h4>📝 Markdown Support</h4>
                  <p>The AI's responses support full markdown formatting:</p>
                  <ul>
                    <li><strong>Bold</strong> and <em>italic</em> text</li>
                    <li>Code blocks with syntax highlighting</li>
                    <li>Lists, headings, and blockquotes</li>
                    <li>Links and horizontal rules</li>
                  </ul>
                </div>

                <div className="help-info-box">
                  <strong>💡 Pro Tips:</strong>
                  <ul>
                    <li>Use <code>Shift+Enter</code> for new lines in chat</li>
                    <li>Click on tool groups to see what the AI did</li>
                    <li>Review file changes before accepting them</li>
                    <li>Use "Always Allow" for trusted command execution</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="help-section">
                <h3>Keyboard Shortcuts</h3>

                <div className="help-shortcuts-grid">
                  <div className="help-shortcut-group">
                    <h4>Editor</h4>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>S</kbd>
                      <span>Save file</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>F</kbd>
                      <span>Find in file</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>H</kbd>
                      <span>Replace in file</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                      <span>Undo</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>Y</kbd>
                      <span>Redo</span>
                    </div>
                  </div>

                  <div className="help-shortcut-group">
                    <h4>Chat</h4>
                    <div className="help-shortcut">
                      <kbd>Enter</kbd>
                      <span>Send message</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>Shift</kbd> + <kbd>Enter</kbd>
                      <span>New line</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>@</kbd>
                      <span>Attach context</span>
                    </div>
                  </div>

                  <div className="help-shortcut-group">
                    <h4>Navigation</h4>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>B</kbd>
                      <span>Toggle sidebar</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>`</kbd>
                      <span>Toggle terminal</span>
                    </div>
                    <div className="help-shortcut">
                      <kbd>Ctrl</kbd> + <kbd>P</kbd>
                      <span>Quick file open</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="help-section">
                <h3>Supported AI Models</h3>
                <p>
                  KaizerIDE supports multiple AI models through OpenAI-compatible APIs. 
                  You can configure custom endpoints and API keys in settings.
                </p>

                <div className="help-feature-item">
                  <h4>🎯 Recommended Models</h4>
                  <ul>
                    <li><strong>Claude 4.5 Sonnet</strong> - Best for complex coding tasks and reasoning</li>
                    <li><strong>GPT-4</strong> - Excellent general-purpose coding assistant</li>
                    <li><strong>DeepSeek Coder</strong> - Optimized for code generation</li>
                    <li><strong>Qwen Coder</strong> - Fast and efficient for coding tasks</li>
                  </ul>
                </div>

                <div className="help-feature-item">
                  <h4>⚙️ Model Configuration</h4>
                  <p>To add a custom model:</p>
                  <ol>
                    <li>Click the model selector in chat</li>
                    <li>Select "Add Model"</li>
                    <li>Enter model name, ID, and API endpoint</li>
                    <li>Provide your API key</li>
                    <li>Configure max output tokens</li>
                  </ol>
                </div>

                <div className="help-feature-item">
                  <h4>🔧 Advanced Features</h4>
                  <ul>
                    <li><strong>Tool Calling</strong> - Models can execute file operations</li>
                    <li><strong>Thinking Mode</strong> - Extended reasoning for complex tasks</li>
                    <li><strong>Streaming</strong> - Real-time response generation</li>
                    <li><strong>Context Windows</strong> - Large context support (up to 200K tokens)</li>
                  </ul>
                </div>

                <div className="help-info-box">
                  <strong>🔐 Privacy Note:</strong>
                  <p>
                    Your API keys are stored locally and never sent to our servers. 
                    All AI requests go directly to your configured endpoint.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="help-modal-footer">
          <div className="help-footer-info">
            <span>KaizerIDE v1.0.0</span>
            <span>•</span>
            <span>Built with React & Electron</span>
          </div>
          <button className="help-btn-primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
