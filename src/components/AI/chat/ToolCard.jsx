import React, { memo } from 'react';
import { getToolRenderer } from './toolRenderers';

/**
 * ToolCard - thin dispatcher.
 *
 * Delegates rendering to the matching tool renderer in the registry.
 * Add a new tool by creating a component in `toolRenderers/` and
 * registering it in `toolRenderers/index.js`.
 */
const ToolCard = memo(function ToolCard(props) {
  const Renderer = getToolRenderer(props.message?.name);
  return <Renderer {...props} />;
});

ToolCard.displayName = 'ToolCard';

export default ToolCard;
