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
 * ## State Management
 * 
 * Global state is managed via Zustand stores in `src/lib/stores/`:
 * - `chatStore` - Chat messages, streaming, composer state
 * - `workspaceStore` - Workspace path, SSH connection, settings
 * - `editorStore` - Tabs, active file, AI diff state
 * - `uiStore` - Panel visibility, modals, error toasts
 * - `toastStore` - Global toast notifications
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
