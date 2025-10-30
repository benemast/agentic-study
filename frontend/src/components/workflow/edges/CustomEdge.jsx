// frontend/src/components/workflow/edges/CustomEdge.jsx
import React, { memo } from 'react';
import { 
  getBezierPath, 
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow
} from 'reactflow';
import { ICONS } from '../../../config/icons';

const TrashIcon = ICONS.Trash2.component;

const CustomEdge = memo(({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data
}) => {
  const { setEdges } = useReactFlow();
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  const onEdgeDelete = (evt) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };
  
  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected 
            ? '#3b82f6' // blue-500 for light mode
            : '#94a3b8', // slate-400 for light mode
        }}
        className="transition-all duration-200"
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            
            <button
              className="flex items-center justify-center w-6 h-6 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-full shadow-lg dark:shadow-gray-900/50 transition-all duration-200 hover:scale-110"
              onClick={onEdgeDelete}
              title="Delete connection"
            >
              <TrashIcon size={13} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Additional visual feedback for dark mode - add glow effect when selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={6}
          stroke="transparent"
          className="pointer-events-none animate-pulse"
          style={{
            filter: 'url(#edge-glow)',
          }}
        />
      )}
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
export default CustomEdge;