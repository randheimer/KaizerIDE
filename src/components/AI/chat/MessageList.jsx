import React, { useMemo } from 'react';
import ToolGroupCard from './ToolGroupCard';

/**
 * MessageList - simple, reliable message list.
 *
 * Renders every message and interleaved tool group in-order. The host
 * component provides scrolling via `.chat-messages-new`, and puts the
 * live streaming message + typing indicator immediately below this list.
 *
 * Virtualization was attempted (react-virtuoso) but caused height-measure
 * races with the streaming footer and fade-in animations. For realistic
 * chat lengths (<~500 messages per session) plain DOM rendering is fine
 * and avoids the virtualization bugs.
 */
function MessageList({
  messages,
  toolGroups,
  renderMessage,
  onToggleGroupExpanded,
  onToggleRowExpanded,
}) {
  // Build a flat list of renderables: a message followed optionally by the
  // tool group that ran during the turn it started.
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
        if (group && group.tools.length > 0) {
          out.push({ kind: 'tool-group', group });
        }
      }
    }
    return out;
  }, [messages, toolGroups]);

  return (
    <>
      {items.map((item) => {
        if (item.kind === 'tool-group') {
          return (
            <ToolGroupCard
              key={`group-${item.group.turnId}`}
              group={item.group}
              onToggleExpanded={onToggleGroupExpanded}
              onToggleRowExpanded={onToggleRowExpanded}
            />
          );
        }
        const msg = item.msg;
        const key = msg.id ?? `msg-${msg.role}-${item.index}`;
        return <React.Fragment key={key}>{renderMessage(msg, item.index)}</React.Fragment>;
      })}
    </>
  );
}

export default React.memo(MessageList);
