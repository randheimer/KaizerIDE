import { create } from 'zustand';

/**
 * uiStore - UI visibility toggles, modal state, and transient UI concerns.
 *
 * Usage:
 *   import { useUIStore } from '@/lib/stores/uiStore';
 *   const sidebarVisible = useUIStore((s) => s.sidebarVisible);
 */
export const useUIStore = create((set, get) => ({
  // ── Panel visibility ───────────────────────────────────────────────────
  sidebarVisible: true,
  terminalVisible: false,

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarVisible: (v) => set({ sidebarVisible: v }),
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setTerminalVisible: (v) => set({ terminalVisible: v }),

  // ── Modal state ────────────────────────────────────────────────────────
  // showSettings: false | true | string (tab name)
  showSettings: false,
  showHelpModal: false,
  showSSHModal: false,
  showCommandPalette: false,

  openSettings: (tab) => set({ showSettings: tab || true }),
  closeSettings: () => set({ showSettings: false }),
  toggleHelpModal: () => set((s) => ({ showHelpModal: !s.showHelpModal })),
  setShowHelpModal: (v) => set({ showHelpModal: v }),
  setShowSSHModal: (v) => set({ showSSHModal: v }),
  toggleCommandPalette: () => set((s) => ({ showCommandPalette: !s.showCommandPalette })),
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),

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
