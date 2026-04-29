import { create } from 'zustand';

// Utility: Normalize file paths to use consistent separators (Windows backslashes)
const normalizePath = (path) => {
  if (!path) return path;
  return path.replace(/\//g, '\\');
};

/**
 * editorStore - Tab management, active file, content changes, and AI diff state.
 *
 * Usage:
 *   import { useEditorStore } from '@/lib/stores/editorStore';
 *   const tabs = useEditorStore((s) => s.tabs);
 *   const activeTabPath = useEditorStore((s) => s.activeTabPath);
 */
export const useEditorStore = create((set, get) => ({
  // ── Tabs ───────────────────────────────────────────────────────────────
  tabs: [],
  activeTabPath: null,

  setActiveTabPath: (path) => set({ activeTabPath: path }),

  addTab: (tab) => set((s) => ({ tabs: [...s.tabs, tab] })),

  updateTab: (path, updates) => set((s) => ({
    tabs: s.tabs.map(t => t.path === path ? { ...t, ...updates } : t)
  })),

  removeTab: (path) => {
    const normalizedPath = normalizePath(path);
    const { tabs, activeTabPath } = get();
    const tabIndex = tabs.findIndex(tab => tab.path === normalizedPath);
    const newTabs = tabs.filter(tab => tab.path !== normalizedPath);

    let newActive = activeTabPath;
    if (activeTabPath === normalizedPath) {
      if (newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        newActive = newTabs[newActiveIndex].path;
      } else {
        newActive = null;
      }
    }

    set({ tabs: newTabs, activeTabPath: newActive });
  },

  closeAllTabs: () => set({ tabs: [], activeTabPath: null }),

  markDirty: (path, dirty = true) => set((s) => ({
    tabs: s.tabs.map(t => t.path === path ? { ...t, dirty } : t)
  })),

  markAllClean: () => set((s) => ({
    tabs: s.tabs.map(t => ({ ...t, dirty: false }))
  })),

  updateContent: (path, content) => set((s) => ({
    tabs: s.tabs.map(t => t.path === path ? { ...t, content, dirty: true } : t)
  })),

  // ── AI File Changes (diff state) ───────────────────────────────────────
  aiFileChanges: {},

  setAiFileChange: (path, change) => set((s) => ({
    aiFileChanges: { ...s.aiFileChanges, [normalizePath(path)]: change }
  })),

  clearAiFileChanges: () => set({ aiFileChanges: {} }),

  // ── Helpers ────────────────────────────────────────────────────────────
  getActiveTab: () => {
    const { tabs, activeTabPath } = get();
    return tabs.find(t => t.path === activeTabPath) || null;
  },

  getActiveTabContent: () => {
    const tab = get().getActiveTab();
    return tab ? tab.content : null;
  },

  findTab: (path) => {
    return get().tabs.find(t => t.path === normalizePath(path)) || null;
  },

  hasTab: (path) => {
    return get().tabs.some(t => t.path === normalizePath(path));
  },
}));
