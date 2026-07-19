import { create } from 'zustand';

const DEFAULT_SETTINGS = {
  provider: "openai-compatible",
  endpoint: "http://localhost:20128/v1",
  apiKey: "",
  selectedModel: { id: "kr/claude-sonnet-4.5", name: "Claude Sonnet 4.5", maxOutputTokens: 16000, maxContextTokens: 200000 },
  models: [
    { id: "kr/claude-sonnet-4.5", name: "Claude Sonnet 4.5", maxOutputTokens: 16000, maxContextTokens: 200000 },
    { id: "kr/claude-haiku-4.5", name: "Claude Haiku 4.5", maxOutputTokens: 16000, maxContextTokens: 200000 },
    { id: "cx/gpt-5.3-codex", name: "GPT-5.3 Codex", maxOutputTokens: 16000, maxContextTokens: 128000 },
    { id: "qw/qwen3-coder-plus", name: "Qwen3 Coder+", maxOutputTokens: 16000, maxContextTokens: 131072 },
    { id: "gemini/gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash", maxOutputTokens: 16000, maxContextTokens: 1048576 }
  ],
  systemPrompts: {},
  tokenSaver: {
    enabled: true,
    targetTokenBudget: 2000,
    hardCharLimit: 8000,
    adaptiveMode: true,
    deduplicateLines: true,
    showCompressionBadge: true,
    perTool: {
      run_command: { budget: 2000, strategy: 'semantic' },
      read_file: { budget: 3000, strategy: 'structural' },
      search_files: { budget: 1500, strategy: 'grouped' },
      grep_index: { budget: 1500, strategy: 'grouped' },
      search_index: { budget: 1500, strategy: 'grouped' },
      list_directory: { budget: 800, strategy: 'capped' },
    }
  }
};

/**
 * workspaceStore - Workspace path, SSH connection, and settings.
 *
 * Usage:
 *   import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
 *   const workspacePath = useWorkspaceStore((s) => s.workspacePath);
 */
export const useWorkspaceStore = create((set, get) => ({
  // ── Workspace ──────────────────────────────────────────────────────────
  workspacePath: null,
  sshConnection: null,

  setWorkspacePath: (path) => set({ workspacePath: path }),
  setSSHConnection: (conn) => set({ sshConnection: conn }),

  // ── Settings ───────────────────────────────────────────────────────────
  settings: (() => {
    try {
      const saved = localStorage.getItem('kaizer-settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  })(),

  setSettings: (newSettings) => {
    set({ settings: newSettings });
    localStorage.setItem('kaizer-settings', JSON.stringify(newSettings));
  },

  updateSettings: (partial) => {
    const current = get().settings;
    const merged = { ...current, ...partial };
    set({ settings: merged });
    localStorage.setItem('kaizer-settings', JSON.stringify(merged));
  },
}));

export { DEFAULT_SETTINGS };
