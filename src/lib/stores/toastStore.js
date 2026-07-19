import { create } from 'zustand';

/**
 * toastStore - lightweight global toast notifications.
 *
 * Usage:
 *   import { useToastStore, toast } from '@/lib/stores/toastStore';
 *
 *   // Imperative (most common):
 *   toast.success('Copied to clipboard');
 *   toast.error('Failed to save');
 *   toast.info('Agent stopped');
 *
 *   // Or via the hook for dynamic rendering:
 *   const toasts = useToastStore((s) => s.toasts);
 */
export const useToastStore = create((set, get) => ({
  toasts: [],

  push: (msg, { type = 'info', duration = 2500 } = {}) => {
    const id = Date.now() + Math.random();
    const t = { id, msg, type, createdAt: Date.now() };
    set((s) => ({ toasts: [...s.toasts, t] }));
    if (duration > 0) {
      setTimeout(() => {
        get().dismiss(id);
      }, duration);
    }
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

// Imperative sugar — call from anywhere without useEffect boilerplate.
export const toast = {
  info: (msg, opts) => useToastStore.getState().push(msg, { ...opts, type: 'info' }),
  success: (msg, opts) => useToastStore.getState().push(msg, { ...opts, type: 'success' }),
  error: (msg, opts) =>
    useToastStore.getState().push(msg, { ...opts, type: 'error', duration: 3500 }),
  warn: (msg, opts) => useToastStore.getState().push(msg, { ...opts, type: 'warning' }),
};
