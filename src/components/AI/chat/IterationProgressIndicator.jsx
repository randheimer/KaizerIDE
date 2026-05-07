import React from 'react';
import Icon from '../../Common/Icon';
import './IterationProgressIndicator.css';

/**
 * IterationProgressIndicator - Shows agent iteration progress during multi-step loops
 * Displays "Working... (iteration 2/8)" to give user visibility into agent activity
 */
function IterationProgressIndicator({ current, max }) {
  return (
    <div className="iteration-progress-indicator">
      <div className="iteration-progress-content">
        <Icon name="Loader2" size={14} className="iteration-spinner" />
        <span className="iteration-text">
          Working... (iteration {current}/{max})
        </span>
      </div>
    </div>
  );
}

export default React.memo(IterationProgressIndicator);
