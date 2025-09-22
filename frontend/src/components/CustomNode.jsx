import React, { memo, useCallback, useMemo } from 'react';
import { Position } from 'reactflow';
import { Database, Filter, BarChart3, Brain, Download, Edit3, Trash2 } from 'lucide-react';
import NodeHandle from './NodeHandle';

const ICON_COMPONENTS = {
  Database,
  Filter,
  BarChart3,
  Brain,
  Download,
};

const CustomNode = memo(({ data, selected, id, isValidConnection, nodes }) => {
  const { 
    label, 
    type, 
    color, 
    hasInput = 1, 
    hasOutput = 1, 
    iconName,
    connectionState = { isConnecting: false },
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

  const IconComponent = ICON_COMPONENTS[iconName] || Database;
  
  const getHandleHighlight = useCallback((handleType, handleIndex) => {
    if (!connectionState.isConnecting) return 'normal';
    
    if (connectionState.sourceNodeId === id) {
      if (handleType === connectionState.sourceHandleType) {
        const sourceHandleIndex = connectionState.sourceHandleId ? 
          parseInt(connectionState.sourceHandleId.split('-')[1]) || 0 : 0;
        return handleIndex === sourceHandleIndex ? 'source' : 'normal';
      }
      return 'normal';
    } else if (handleType === 'target' && connectionState.sourceHandleType === 'source') {
      const mockConnection = {
        source: connectionState.sourceNodeId,
        target: id,
        sourceHandle: connectionState.sourceHandleId,
        targetHandle: `input-${handleIndex}`
      };
      
      return isValidConnection?.(mockConnection) ? 'target' : 'normal';
    }
    
    return 'normal';
  }, [connectionState, id, isValidConnection]);

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
      
      return (
        <NodeHandle
          key={`input-${id}-${idx}`}
          type="target"
          position={Position.Top}
          id={`input-${idx}`}
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
      
      return (
        <NodeHandle
          key={`output-${id}-${idx}`}
          type="source"
          position={Position.Bottom}
          id={`output-${idx}`}
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
          <Edit3 size={12} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
          title="Delete node"
        >
          <Trash2 size={12} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color} transition-all duration-200 ${
            connectionState.isConnecting && hasValidTargets ? 'ring-2 ring-green-300' : ''
          }`}>
            <IconComponent size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">{label}</h3>
            <p className="text-xs text-gray-500">{type}</p>
            {connectionState.isConnecting && hasValidTargets && (
              <p className="text-xs text-green-600 font-medium">✓ Valid target</p>
            )}
          </div>
        </div>
      </div>
      
      {outputHandles}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
export default CustomNode;