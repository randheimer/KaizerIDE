/**
 * Custom React Hooks
 * 
 * Organized by category for better maintainability and discoverability.
 * 
 * ## Active Hooks
 * 
 * ### Chat Hooks (`./chat`)
 * - `useChatHistory` - Manage chat session persistence with Electron IPC
 * 
 * ### Event Hooks (`./events`)
 * - `useFileChanges` - Track file modifications via custom events
 * 
 * ## Deprecated Hooks (`./deprecated`)
 * 
 * The following hooks are deprecated and replaced by `chatStore`:
 * - `useChatState` - Use `chatStore` messages slice instead
 * - `useContextPills` - Use `chatStore.contextPills` instead
 * - `useUIState` - Use `chatStore.openPopup` instead
 * 
 * See `./deprecated/README.md` for migration guide.
 * 
 * ## Usage
 * 
 * ```js
 * // Import from category subfolders:
 * import { useChatHistory } from './hooks/chat';
 * import { useFileChanges } from './hooks/events';
 * 
 * // Or import from main barrel:
 * import { useChatHistory, useFileChanges } from './hooks';
 * ```
 * 
 * @module hooks
 */

// Active hooks - organized by category
export { useChatHistory } from './chat';
export { useFileChanges } from './events';

// Deprecated hooks - kept for backward compatibility
// These will be removed in a future major version
export { useChatState, useContextPills, useUIState } from './deprecated';
