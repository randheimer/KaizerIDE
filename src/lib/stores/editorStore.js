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

  // ── Split View (Pane 2) ──────────────────────────────────────────────
  pane2Tabs: [],
  pane2ActiveTab: null,

  setPane2ActiveTab: (path) => set({ pane2ActiveTab: path }),

  addPane2Tab: (tab) => set((s) => ({ pane2Tabs: [...s.pane2Tabs, tab] })),

  removePane2Tab: (path) => {
    const normalizedPath = normalizePath(path);
    const { pane2Tabs, pane2ActiveTab } = get();
    const tabIndex = pane2Tabs.findIndex(tab => tab.path === normalizedPath);
    const newTabs = pane2Tabs.filter(tab => tab.path !== normalizedPath);
    let newActive = pane2ActiveTab;
    if (pane2ActiveTab === normalizedPath) {
      if (newTabs.length > 0) {
        newActive = newTabs[Math.min(tabIndex, newTabs.length - 1)].path;
      } else {
        newActive = null;
      }
    }
    set({ pane2Tabs: newTabs, pane2ActiveTab: newActive });
  },

  updatePane2Tab: (path, updates) => set((s) => ({
    pane2Tabs: s.pane2Tabs.map(t => t.path === path ? { ...t, ...updates } : t)
  })),

  updatePane2Content: (path, content) => set((s) => ({
    pane2Tabs: s.pane2Tabs.map(t => t.path === path ? { ...t, content, dirty: true } : t)
  })),

  // Move tab from pane1 to pane2
  moveToPane2: (path) => {
    const normalizedPath = normalizePath(path);
    const { tabs, pane2Tabs } = get();
    const tab = tabs.find(t => t.path === normalizedPath);
    if (!tab) return;
    set({
      tabs: tabs.filter(t => t.path !== normalizedPath),
      pane2Tabs: [...pane2Tabs, tab],
      pane2ActiveTab: normalizedPath,
    });
  },

  // Move tab from pane2 to pane1
  moveToPane1: (path) => {
    const normalizedPath = normalizePath(path);
    const { tabs, pane2Tabs } = get();
    const tab = pane2Tabs.find(t => t.path === normalizedPath);
    if (!tab) return;
    set({
      pane2Tabs: pane2Tabs.filter(t => t.path !== normalizedPath),
      tabs: [...tabs, tab],
      activeTabPath: normalizedPath,
    });
  },

  // ── Pinned Tabs ───────────────────────────────────────────────────────
  pinnedTabs: JSON.parse(localStorage.getItem('kaizer-pinned-tabs') || '[]'),

  togglePinTab: (path) => {
    const normalizedPath = normalizePath(path);
    const { pinnedTabs } = get();
    const next = pinnedTabs.includes(normalizedPath)
      ? pinnedTabs.filter(p => p !== normalizedPath)
      : [...pinnedTabs, normalizedPath];
    localStorage.setItem('kaizer-pinned-tabs', JSON.stringify(next));
    set({ pinnedTabs: next });
  },

  isPinned: (path) => get().pinnedTabs.includes(normalizePath(path)),

  // ── Bookmarks ─────────────────────────────────────────────────────────
  // { [filePath]: number[] } — line numbers per file
  bookmarks: JSON.parse(localStorage.getItem('kaizer-bookmarks') || '{}'),

  toggleBookmark: (filePath, line) => {
    const normalizedPath = normalizePath(filePath);
    const { bookmarks } = get();
    const fileBookmarks = bookmarks[normalizedPath] || [];
    const next = fileBookmarks.includes(line)
      ? fileBookmarks.filter(l => l !== line)
      : [...fileBookmarks, line].sort((a, b) => a - b);
    const updated = { ...bookmarks, [normalizedPath]: next };
    if (next.length === 0) delete updated[normalizedPath];
    localStorage.setItem('kaizer-bookmarks', JSON.stringify(updated));
    set({ bookmarks: updated });
  },

  getFileBookmarks: (filePath) => {
    const normalizedPath = normalizePath(filePath);
    return get().bookmarks[normalizedPath] || [];
  },

  getAllBookmarks: () => {
    const { bookmarks } = get();
    const result = [];
    for (const [file, lines] of Object.entries(bookmarks)) {
      for (const line of lines) {
        result.push({ file, line });
      }
    }
    return result.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  },

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
