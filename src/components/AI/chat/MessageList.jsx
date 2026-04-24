import React, { useMemo, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import ToolGroupCard from './ToolGroupCard';

/**
 * MessageList - virtualized list of completed messages + tool groups only.
 *
 * IMPORTANT: the live streaming message is rendered by the host OUTSIDE
 * this component. Putting it inside Virtuoso's Footer caused re-measurement
 * on every token (~30fps) which restarted the `messageSlideIn` CSS
 * animation, making streamed text look like it was perpetually fading in.
 *
 * The host still renders an outer wrapper for drag-and-drop listeners;
 * MessageList fills that wrapper.
 */
function MessageList({
  messages,
  toolGroups,
  renderMessage,
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
    />
  );
}

export default React.memo(MessageList);
