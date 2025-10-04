// frontend/src/components/CustomNode.jsx
import React, { memo, useCallback, useMemo } from 'react';
import { Position } from 'reactflow';
import NodeHandle from './NodeHandle';
import { renderIcon, ICONS } from '../../constants/icons';

const CustomNode = memo(({ data, selected, id, nodes }) => {
  const { 
    label, 
    type, 
    color, 
    hasInput = 1, 
    hasOutput = 1, 
    iconName,
    connectionState = { isConnecting: false },
    currentEdges = [], 
    isValidConnection, 
    onDelete,
    onEdit
  } = data;

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [onDelete, id]);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit?.(id);
  }, [onEdit, id]);

  const IconComponent = renderIcon(iconName, { size: 20, className: "text-white" });
  const EditIcon = ICONS.Edit3.component;
  const TrashIcon = ICONS.Trash2.component;
  
  const getHandleHighlight = useCallback((handleType, handleIndex) => {
    if (!connectionState.isConnecting) return 'normal';
    
    // If this is the source node, highlight the specific handle being dragged from
    if (connectionState.sourceNodeId === id) {
      if (handleType === 'source' && connectionState.sourceHandleType === 'source') {
        const sourceHandleIndex = connectionState.sourceHandleId ? 
          parseInt(connectionState.sourceHandleId.split('-')[1]) || 0 : 0;
        return handleIndex === sourceHandleIndex ? 'source' : 'normal';
      }
      return 'normal';
    }
    
    // If this is a potential target node, check if this specific handle can accept the connection
    if (handleType === 'target' && connectionState.sourceHandleType === 'source') {
      const targetHandleId = `input-${handleIndex}`;
      
      // Check if this specific target handle already has a connection
      const targetHandleConnections = currentEdges.filter(e => 
        e.target === id && (e.targetHandle || 'input-0') === targetHandleId
      );
      
      // If handle is already at limit, don't highlight
      if (targetHandleConnections.length >= 1) return 'normal';
      
      // Check if the source handle is already connected
      const sourceHandleConnections = currentEdges.filter(e => 
        e.source === connectionState.sourceNodeId && 
        (e.sourceHandle || 'output-0') === connectionState.sourceHandleId
      );
      
      // If source handle is already at limit, don't highlight
      if (sourceHandleConnections.length >= 1) return 'normal';
      
      const mockConnection = {
        source: connectionState.sourceNodeId,
        target: id,
        sourceHandle: connectionState.sourceHandleId,
        targetHandle: targetHandleId
      };
      
      const isValid = isValidConnection?.(mockConnection);
      return isValid ? 'target' : 'normal';
    }
    
    return 'normal';
  }, [connectionState, id, isValidConnection, currentEdges]);

  const nodeClassName = useMemo(() => {
    let baseClass = 'relative bg-white rounded-lg shadow-lg border-2 transition-all duration-200 min-w-[200px] group';
    
    if (selected) {
      baseClass += ' border-blue-400 shadow-blue-200';
    } else if (connectionState.isConnecting) {
      if (connectionState.sourceNodeId === id) {
        baseClass += ' border-blue-400 bg-blue-50 shadow-blue-200';
      } else {
        const hasValidTargetHandle = hasInput > 0 && Array.from({ length: hasInput }, (_, idx) => {
          const mockConnection = {
            source: connectionState.sourceNodeId,
            target: id,
            sourceHandle: connectionState.sourceHandleId,
            targetHandle: `input-${idx}`
          };
          return isValidConnection?.(mockConnection) || false;
        }).some(Boolean);
        
        if (hasValidTargetHandle) {
          baseClass += ' border-green-400 bg-green-50 shadow-green-200 ring-1 ring-green-200';
        } else {
          baseClass += ' border-gray-300 bg-gray-100 opacity-60';
        }
      }
    } else {
      baseClass += ' border-gray-200 hover:border-gray-300';
    }
    
    return baseClass;
  }, [selected, connectionState, id, hasInput, isValidConnection]);

  const inputHandles = useMemo(() => 
    hasInput > 0 ? Array.from({ length: hasInput }, (_, idx) => {
      const highlight = getHandleHighlight('target', idx);
      const isHighlighted = highlight === 'target';
      const handleId = `input-${idx}`;
      
      return (
        <NodeHandle
          key={`input-${id}-${idx}`}
          type="target"
          position={Position.Top}
          id={handleId}
          index={idx}
          total={hasInput}
          isHighlighted={isHighlighted}
        />
      );
    }) : null
  , [hasInput, id, getHandleHighlight]);

  const outputHandles = useMemo(() => 
    hasOutput > 0 ? Array.from({ length: hasOutput }, (_, idx) => {
      const highlight = getHandleHighlight('source', idx);
      const isHighlighted = highlight === 'source';
      const handleId = `output-${idx}`;
      
      return (
        <NodeHandle
          key={`output-${id}-${idx}`}
          type="source"
          position={Position.Bottom}
          id={handleId}
          index={idx}
          total={hasOutput}
          isHighlighted={isHighlighted}
        />
      );
    }) : null
  , [hasOutput, id, getHandleHighlight]);

  const hasValidTargets = connectionState.isConnecting && 
    connectionState.sourceNodeId !== id && 
    hasInput > 0 && 
    Array.from({ length: hasInput }, (_, idx) => {
      const mockConnection = {
        source: connectionState.sourceNodeId,
        target: id,
        sourceHandle: connectionState.sourceHandleId,
        targetHandle: `input-${idx}`
      };
      return isValidConnection?.(mockConnection) || false;
    }).some(Boolean);

  return (
    <div className={nodeClassName}>
      {connectionState.isConnecting && hasValidTargets && (
        <div className="absolute inset-0 rounded-lg border-2 border-green-400 bg-green-100 bg-opacity-20 animate-pulse pointer-events-none" />
      )}
      
      {inputHandles}
      
      <div className={`absolute -top-2 -right-2 flex gap-1 transition-opacity duration-200 ${
        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <button
          onClick={handleEdit}
          className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-lg"
          title="Edit node"
        >
          <EditIcon size={12} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
          title="Delete node"
        >
          <TrashIcon size={12} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color} transition-all duration-200 ${
            connectionState.isConnecting && hasValidTargets ? 'ring-2 ring-green-300' : ''
          }`}>
            {IconComponent}
          </div>
          <div>
            <h3 className="font-medium text-gray-800">{label}</h3>
            <p className="text-xs text-gray-500">{type}</p>
          </div>
        </div>
      </div>
      
      {outputHandles}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
export default CustomNode;