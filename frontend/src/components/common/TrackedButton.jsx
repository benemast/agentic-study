// frontend/src/components/common/TrackedButton.jsx
/**
 * Button component that automatically tracks clicks
 */
import React from 'react';
import { useTracking } from '../../hooks/useTracking';

const TrackedButton = ({ 
  children, 
  onClick, 
  trackingData = {}, 
  className = '',
  disabled = false,
  ...props 
}) => {
  const { trackClick } = useTracking();

  const handleClick = (e) => {
    // Track the click
    trackClick('button_click', {
      buttonText: typeof children === 'string' ? children : 'button',
      ...trackingData
    });

    // Execute the original onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default TrackedButton;