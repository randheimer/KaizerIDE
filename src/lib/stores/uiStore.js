import { create } from 'zustand';

/**
 * uiStore - UI visibility toggles, modal state, and transient UI concerns.
 *
 * Usage:
 *   import { useUIStore } from '@/lib/stores/uiStore';
 *   const sidebarVisible = useUIStore((s) => s.sidebarVisible);
 */
// Helper: read a number from localStorage with a fallback
const readNum = (key, fallback) => {
  try {
    const v = parseInt(localStorage.getItem(key), 10);
    return Number.isFinite(v) ? v : fallback;
  } catch { return fallback; }
};

export const useUIStore = create((set, get) => ({
  // ── Panel visibility ───────────────────────────────────────────────────
  sidebarVisible: true,
  terminalVisible: false,
  chatVisible: true,

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarVisible: (v) => set({ sidebarVisible: v }),
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setTerminalVisible: (v) => set({ terminalVisible: v }),
  toggleChat: () => set((s) => ({ chatVisible: !s.chatVisible })),
  setChatVisible: (v) => set({ chatVisible: v }),

  // ── Panel sizes (persisted in localStorage) ────────────────────────────
  sidebarWidth: readNum('kaizer-sidebar-width', 280),
  terminalHeight: readNum('kaizer-terminal-height', 250),
  chatWidth: readNum('kaizer-chat-width', 340),

  setSidebarWidth: (w) => {
    localStorage.setItem('kaizer-sidebar-width', String(w));
    set({ sidebarWidth: w });
  },
  setTerminalHeight: (h) => {
    localStorage.setItem('kaizer-terminal-height', String(h));
    set({ terminalHeight: h });
  },
  setChatWidth: (w) => {
    localStorage.setItem('kaizer-chat-width', String(w));
    set({ chatWidth: w });
  },

  // ── Modal state ────────────────────────────────────────────────────────
  // showSettings: false | true | string (tab name)
  showSettings: false,
  showHelpModal: false,
  showSSHModal: false,
  showCommandPalette: false,
  showGoToFile: false,

  openSettings: (tab) => set({ showSettings: tab || true }),
  closeSettings: () => set({ showSettings: false }),
  toggleHelpModal: () => set((s) => ({ showHelpModal: !s.showHelpModal })),
  setShowHelpModal: (v) => set({ showHelpModal: v }),
  setShowSSHModal: (v) => set({ showSSHModal: v }),
  toggleCommandPalette: () => set((s) => ({ showCommandPalette: !s.showCommandPalette })),
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),
  setShowGoToFile: (v) => set({ showGoToFile: v }),

  // ── File picker ────────────────────────────────────────────────────────
  filePickerOpen: false,
  filePickerStartPath: '',
  filePickerMode: 'attach', // 'attach' | 'folder'

  openFilePicker: (startPath, mode = 'attach') => set({
    filePickerOpen: true,
    filePickerStartPath: startPath || '',
    filePickerMode: mode,
  }),
  closeFilePicker: () => set({ filePickerOpen: false }),

  // ── Error toast ────────────────────────────────────────────────────────
  errorMessage: null,
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  clearError: () => set({ errorMessage: null }),
}));
