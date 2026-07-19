import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

/**
 * chatStore - Centralized state for the chat panel.
 *
 * Organized as slices so components can subscribe to narrow portions
 * (prevents unrelated state changes from re-rendering the whole panel).
 *
 * Usage:
 *   import { useChatStore } from '@/lib/stores/chatStore';
 *
 *   // Single field (preferred for perf):
 *   const input = useChatStore((s) => s.input);
 *
 *   // Multiple fields with shallow comparison:
 *   const { input, setInput } = useChatStore(
 *     (s) => ({ input: s.input, setInput: s.setInput }),
 *     shallow
 *   );
 *
 * Re-export `shallow` from this module so callers don't need a second import.
 */
export { shallow };

/**
 * Which popup is currently open. Exactly one (or none) may be open at a time,
 * which naturally prevents the old class of bugs where two menus overlapped.
 */
export const POPUP_NONE = null;
export const POPUP_CONTEXT = 'context';
export const POPUP_MODE = 'mode';
export const POPUP_MODEL = 'model';

const initialState = {
  // ── Messages slice ─────────────────────────────────────────────────────
  messages: [],
  streamingMsg: null,
  currentTurnId: null,
  toolGroups: {},
  filesChangedCard: null,
  isStreaming: false,
  isAgentRunning: false,

  // ── Composer slice ─────────────────────────────────────────────────────
  input: '',
  contextPills: [],
  currentMode: 'agent',
  autoApproveCommands: false,

  // ── UI slice (popup + modal state) ────────────────────────────────────
  openPopup: POPUP_NONE,
  popupAnchor: null, // { x, y } from getBoundingClientRect
  showSettingsModal: false,
  showHistoryModal: false,
  showFilePicker: false,

  // ── Chat history slice ─────────────────────────────────────────────────
  chatHistory: [],
  currentChatId: null,
};

export const useChatStore = create(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ── Messages actions ───────────────────────────────────────────────
    setMessages: (messages) =>
      set((s) => ({ messages: typeof messages === 'function' ? messages(s.messages) : messages })),
    appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
    updateMessageAt: (index, patch) =>
      set((s) => ({
        messages: s.messages.map((m, i) => (i === index ? { ...m, ...patch } : m)),
      })),
    clearMessages: () => set({ messages: [], toolGroups: {}, currentTurnId: null }),

    setStreamingMsg: (streamingMsg) =>
      set((s) => ({
        streamingMsg: typeof streamingMsg === 'function' ? streamingMsg(s.streamingMsg) : streamingMsg,
      })),

    setCurrentTurnId: (currentTurnId) => set({ currentTurnId }),

    setToolGroups: (toolGroups) =>
      set((s) => ({
        toolGroups: typeof toolGroups === 'function' ? toolGroups(s.toolGroups) : toolGroups,
      })),
    updateToolGroup: (turnId, patch) =>
      set((s) => ({
        toolGroups: {
          ...s.toolGroups,
          [turnId]: { ...s.toolGroups[turnId], ...patch },
        },
      })),

    setFilesChangedCard: (filesChangedCard) => set({ filesChangedCard }),

    setIsStreaming: (isStreaming) => set({ isStreaming }),
    setIsAgentRunning: (isAgentRunning) => set({ isAgentRunning }),

    // ── Composer actions ───────────────────────────────────────────────
    setInput: (input) =>
      set((s) => ({ input: typeof input === 'function' ? input(s.input) : input })),

    setContextPills: (contextPills) =>
      set((s) => ({
        contextPills:
          typeof contextPills === 'function' ? contextPills(s.contextPills) : contextPills,
      })),
    addContextPill: (pill) => set((s) => ({ contextPills: [...s.contextPills, pill] })),
    removeContextPill: (id) =>
      set((s) => ({ contextPills: s.contextPills.filter((p) => p.id !== id) })),
    clearContextPills: () => set({ contextPills: [] }),

    setCurrentMode: (currentMode) => set({ currentMode }),
    setAutoApproveCommands: (autoApproveCommands) => set({ autoApproveCommands }),

    // ── UI actions ─────────────────────────────────────────────────────
    /**
     * Open a popup by id, optionally anchored to a DOM rect.
     * Pass `null` to close.
     */
    openPopupMenu: (id, anchor = null) => set({ openPopup: id, popupAnchor: anchor }),
    closePopup: () => set({ openPopup: POPUP_NONE, popupAnchor: null }),

    setShowSettingsModal: (showSettingsModal) => set({ showSettingsModal }),
    setShowHistoryModal: (showHistoryModal) => set({ showHistoryModal }),
    setShowFilePicker: (showFilePicker) => set({ showFilePicker }),

    // ── Chat history actions ───────────────────────────────────────────
    setChatHistory: (chatHistory) =>
      set((s) => ({
        chatHistory: typeof chatHistory === 'function' ? chatHistory(s.chatHistory) : chatHistory,
      })),
    setCurrentChatId: (currentChatId) => set({ currentChatId }),

    // ── Convenience resets ─────────────────────────────────────────────
    resetTurn: () =>
      set({
        streamingMsg: null,
        currentTurnId: null,
        isStreaming: false,
        isAgentRunning: false,
      }),

    resetChat: () =>
      set({
        messages: [],
        streamingMsg: null,
        currentTurnId: null,
        toolGroups: {},
        filesChangedCard: null,
        isStreaming: false,
        isAgentRunning: false,
        input: '',
        contextPills: [],
      }),
  }))
);

// ── Narrow selectors (preferred by consumers for stable refs) ─────────────
export const selectInput = (s) => s.input;
export const selectContextPills = (s) => s.contextPills;
export const selectCurrentMode = (s) => s.currentMode;
export const selectIsStreaming = (s) => s.isStreaming;
export const selectIsAgentRunning = (s) => s.isAgentRunning;
export const selectMessages = (s) => s.messages;
export const selectStreamingMsg = (s) => s.streamingMsg;
export const selectOpenPopup = (s) => s.openPopup;
export const selectPopupAnchor = (s) => s.popupAnchor;
