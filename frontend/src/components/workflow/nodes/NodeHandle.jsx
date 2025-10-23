// frontend/src/components/nodes/NodeHandle.jsx
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const NodeHandle = memo(({ 
  type, 
  position, 
  id, 
  index, 
  total, 
  isHighlighted,
  style: customStyle 
}) => {
  const baseStyle = {
    left: `${((index + 1) / (total + 1)) * 100}%`,
    transform: `translateX(-50%) ${isHighlighted ? 'scale(1.25)' : 'scale(1)'}`,
    zIndex: isHighlighted ? 10 : 1,
    backgroundColor: isHighlighted ? 
      (type === 'source' ? '#3b82f6' : '#10b981') : '#9ca3af',
    boxShadow: isHighlighted ? 
      `0 0 0 2px ${type === 'source' ? 'rgb(59 130 246 / 0.3)' : 'rgb(34 197 94 / 0.3)'}` : 'none',
    transition: 'all 0.2s ease-in-out',
    ...customStyle
  };

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className="w-3 h-3 !border-2 !border-white"
      style={baseStyle}
    />
  );
});

NodeHandle.displayName = 'NodeHandle';
export default NodeHandle;