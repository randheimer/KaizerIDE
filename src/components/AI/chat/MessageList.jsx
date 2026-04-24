import React, { useMemo, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import ToolGroupCard from './ToolGroupCard';
import TypingIndicator from './TypingIndicator';

/**
 * MessageList - virtualized chat message list.
 *
 * Flattens messages + interleaved completed tool groups into a single list
 * of typed items, then renders via `react-virtuoso` for 60fps with huge
 * histories. The streaming message and typing indicator live in the footer
 * so they stay pinned at the bottom without jitter.
 *
 * The host still renders an outer wrapper for drag-and-drop listeners;
 * MessageList fills that wrapper.
 */
function MessageList({
  messages,
  toolGroups,
  streamingMsg,
  isAgentRunning,
  renderMessage,
  renderStreamingMessage,
  onToggleGroupExpanded,
  onToggleRowExpanded,
  onAtBottomChange,
}) {
  const virtuosoRef = useRef(null);

  // ── Build flat item list: messages + interleaved completed tool groups ──
  const items = useMemo(() => {
    const groupsSorted = Object.values(toolGroups).sort((a, b) => a.turnId - b.turnId);
    const out = [];
    let userCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      out.push({ kind: 'message', msg, index: i });
      if (msg.role === 'user') {
        userCount += 1;
        const group = groupsSorted[userCount - 1];
        if (group && group.tools.length > 0 && group.status === 'done') {
          out.push({ kind: 'tool-group', group, key: `group-${group.turnId}` });
        }
      }
    }
    return out;
  }, [messages, toolGroups]);

  const itemContent = useCallback(
    (_, item) => {
      if (item.kind === 'tool-group') {
        return (
          <ToolGroupCard
            group={item.group}
            onToggleExpanded={onToggleGroupExpanded}
            onToggleRowExpanded={onToggleRowExpanded}
          />
        );
      }
      return renderMessage(item.msg, item.index);
    },
    [renderMessage, onToggleGroupExpanded, onToggleRowExpanded]
  );

  const computeItemKey = useCallback((_, item) => {
    if (item.kind === 'tool-group') return item.key;
    // Stable key for messages: prefer id if present, else role + index
    return item.msg.id ?? `msg-${item.msg.role}-${item.index}`;
  }, []);

  // Footer holds the live streaming message + typing indicator — always at
  // the bottom, never re-measured by the virtualizer.
  const Footer = useCallback(() => {
    const showTyping =
      isAgentRunning && !streamingMsg?.content && !streamingMsg?.thinkingContent;
    return (
      <>
        {streamingMsg && renderStreamingMessage(streamingMsg)}
        {showTyping && <TypingIndicator />}
      </>
    );
  }, [isAgentRunning, streamingMsg, renderStreamingMessage]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="chat-virtuoso"
      style={{ height: '100%', width: '100%' }}
      data={items}
      computeItemKey={computeItemKey}
      itemContent={itemContent}
      followOutput="smooth"
      atBottomThreshold={80}
      atBottomStateChange={onAtBottomChange}
      increaseViewportBy={{ top: 300, bottom: 600 }}
      components={{ Footer }}
    />
  );
}

export default React.memo(MessageList);
