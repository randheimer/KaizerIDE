import { create } from 'zustand';

/**
 * gitStore - Git state management for sidebar Git panel.
 */
export const useGitStore = create((set, get) => ({
  // Whether the workspace is a git repo
  isRepo: false,
  // Current branch name
  currentBranch: null,
  // All branches
  branches: [],
  // Changed files from git status
  changedFiles: [], // { path, status } where status is 'M','A','D','U','?'
  // Staged files
  stagedFiles: [],
  // Recent commits
  commits: [],
  // Loading state
  loading: false,
  // Last error
  error: null,

  // Check if directory is a git repo and load initial state
  init: async (repoPath) => {
    if (!repoPath || !window.electron?.gitIsRepo) return;
    try {
      const res = await window.electron.gitIsRepo(repoPath);
      if (!res.isRepo) {
        set({ isRepo: false, changedFiles: [], stagedFiles: [], currentBranch: null, branches: [], commits: [] });
        return;
      }
      set({ isRepo: true });
      await get().refresh(repoPath);
    } catch (err) {
      set({ isRepo: false, error: err.message });
    }
  },

  // Refresh all git state
  refresh: async (repoPath) => {
    if (!repoPath) return;
    set({ loading: true, error: null });
    try {
      const [statusRes, branchesRes, logRes] = await Promise.all([
        window.electron.gitStatus(repoPath),
        window.electron.gitBranches(repoPath),
        window.electron.gitLog(repoPath, 30),
      ]);

      const changedFiles = [];
      if (statusRes.success) {
        for (const f of (statusRes.modified || [])) changedFiles.push({ path: f, status: 'M' });
        for (const f of (statusRes.created || [])) changedFiles.push({ path: f, status: 'A' });
        for (const f of (statusRes.deleted || [])) changedFiles.push({ path: f, status: 'D' });
        for (const f of (statusRes.not_added || [])) changedFiles.push({ path: f, status: '?' });
        for (const f of (statusRes.conflicted || [])) changedFiles.push({ path: f, status: 'C' });

        const stagedFiles = [];
        for (const f of (statusRes.staged || [])) stagedFiles.push(f);

        set({
          currentBranch: statusRes.current,
          changedFiles,
          stagedFiles,
        });
      }

      if (branchesRes.success) {
        set({ branches: branchesRes.branches });
      }

      if (logRes.success) {
        set({ commits: logRes.commits });
      }

      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  // Stage files
  stage: async (repoPath, files) => {
    try {
      await window.electron.gitStage(repoPath, files);
      await get().refresh(repoPath);
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Unstage files
  unstage: async (repoPath, files) => {
    try {
      await window.electron.gitUnstage(repoPath, files);
      await get().refresh(repoPath);
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Commit staged changes
  commit: async (repoPath, message) => {
    try {
      const res = await window.electron.gitCommit(repoPath, message);
      if (res.success) {
        await get().refresh(repoPath);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err) {
      set({ error: err.message });
      return { success: false, error: err.message };
    }
  },

  // Switch branch
  checkout: async (repoPath, branch) => {
    try {
      await window.electron.gitCheckout(repoPath, branch);
      await get().refresh(repoPath);
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Get diff for a file
  getDiff: async (repoPath, file) => {
    try {
      const res = await window.electron.gitDiff(repoPath, file);
      return res.success ? res.diff : '';
    } catch {
      return '';
    }
  },
}));
