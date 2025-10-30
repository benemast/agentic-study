// frontend/src/components/workflow/nodes/NodeHandle.jsx
import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

const NodeHandle = memo(({ 
  type, 
  position, 
  id, 
  index = 0, 
  total = 1, 
  isHighlighted,
  label,
  style: customStyle 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate position based on handle orientation
  const isVertical = position === Position.Top || position === Position.Bottom;
  const isHorizontal = position === Position.Left || position === Position.Right;
  
  // For top/bottom: calculate horizontal position
  // For left/right: calculate vertical position
  const offset = total > 1 
    ? `${((index + 1) / (total + 1)) * 100}%` 
    : '50%'; // Center if only one handle
  
  // Determine colors based on state
  const getHandleColor = () => {
    if (isHighlighted) {
      return type === 'source' ? '#3b82f6' : '#10b981'; // Blue for source, Green for target
    }
    if (isHovered) {
      return type === 'source' ? '#60a5fa' : '#34d399'; // Lighter blue/green on hover
    }
    return '#6b7280'; // Default gray
  };
  
  const getHandleShadow = () => {
    if (isHighlighted) {
      const color = type === 'source' 
        ? 'rgb(59 130 246 / 0.4)' 
        : 'rgb(34 197 94 / 0.4)';
      return `0 0 0 3px ${color}`;
    }
    if (isHovered) {
      return '0 2px 6px 0 rgb(0 0 0 / 0.2)';
    }
    return '0 1px 3px 0 rgb(0 0 0 / 0.1)';
  };
  
  const baseStyle = {
    // Position based on orientation
    ...(isVertical && { 
      left: offset,
      transform: `translateX(-50%) ${isHighlighted || isHovered ? 'scale(1.3)' : 'scale(1)'}`,
    }),
    ...(isHorizontal && { 
      top: offset,
      transform: `translateY(-50%) ${isHighlighted || isHovered ? 'scale(1.3)' : 'scale(1)'}`,
    }),
    
    // Appearance
    width: '12px',
    height: '12px',
    zIndex: isHighlighted ? 10 : isHovered ? 5 : 1,
    backgroundColor: getHandleColor(),
    border: '2.5px solid white',
    boxShadow: getHandleShadow(),
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    ...customStyle
  };

  return (
    <>
      <Handle
        type={type}
        position={position}
        id={id}
        style={baseStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {label && (
        <div 
          style={{
            position: 'absolute',
            ...(position === Position.Top && { top: '-24px', left: offset, transform: 'translateX(-50%)' }),
            ...(position === Position.Bottom && { bottom: '-24px', left: offset, transform: 'translateX(-50%)' }),
            ...(position === Position.Left && { left: '-60px', top: offset, transform: 'translateY(-50%)' }),
            ...(position === Position.Right && { right: '-60px', top: offset, transform: 'translateY(-50%)' }),
            fontSize: '10px',
            color: '#6b7280',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {label}
        </div>
      )}
    </>
  );
});

NodeHandle.displayName = 'NodeHandle';
export default NodeHandle;