import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSessionStore } from './SessionManager';

// Node type definitions
const NODE_TYPES = {
  start: { label: 'Start', icon: '🚀', color: 'bg-gray-100 border-gray-400' },
  agent: { label: 'AI Agent', icon: '🤖', color: 'bg-blue-100 border-blue-400' },
  condition: { label: 'Condition', icon: '🔍', color: 'bg-yellow-100 border-yellow-400' },
  action: { label: 'Action', icon: '⚡', color: 'bg-green-100 border-green-400' },
  end: { label: 'End', icon: '🏁', color: 'bg-red-100 border-red-400' }
};

// Individual Node Component
const Node = ({ node, isSelected, onSelect, onMove, onDelete, onEdit, onConnectionStart, dragState }) => {
  const nodeRef = useRef(null);
  const nodeType = NODE_TYPES[node.type];

  const handleMouseDown = (e) => {
    if (e.target.closest('.node-action') || e.target.closest('.connection-point')) return;
    
    const rect = nodeRef.current.getBoundingClientRect();
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    dragState.current = {
      isDragging: true,
      nodeId: node.id,
      offset: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    };
    
    onSelect(node.id);
    e.preventDefault();
  };

  const handleConnectionStart = (e, side) => {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    const point = {
      x: rect.left - canvasRect.left + rect.width / 2,
      y: rect.top - canvasRect.top + rect.height / 2
    };
    
    onConnectionStart(node.id, point, side);
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute cursor-move select-none ${isSelected ? 'z-20' : 'z-10'}`}
      style={{ left: node.position.x, top: node.position.y }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
    >
      <div className={`relative p-3 rounded-lg border-2 shadow-md ${nodeType.color} ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
      }`}>
        
        {/* Left connection point (input) */}
        {node.type !== 'start' && (
          <div 
            className="connection-point absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-500 rounded-full border-2 border-white cursor-crosshair hover:bg-gray-700"
            onMouseDown={(e) => handleConnectionStart(e, 'input')}
          />
        )}
        
        {/* Right connection point (output) */}
        {node.type !== 'end' && (
          <div 
            className="connection-point absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-500 rounded-full border-2 border-white cursor-crosshair hover:bg-gray-700"
            onMouseDown={(e) => handleConnectionStart(e, 'output')}
          />
        )}

        {/* Node content */}
        <div className="flex items-center space-x-2 min-w-20">
          <span className="text-lg">{nodeType.icon}</span>
          <div>
            <div className="text-sm font-bold">{node.label || nodeType.label}</div>
          </div>
        </div>

        {/* Action buttons */}
        {isSelected && node.type !== 'start' && node.type !== 'end' && (
          <div className="absolute -top-6 right-0 flex space-x-1">
            <button
              className="node-action w-5 h-5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              onClick={(e) => { e.stopPropagation(); onEdit(node); }}
            >
              ✏
            </button>
            <button
              className="node-action w-5 h-5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Connection Line Component
const Connection = ({ connection, isSelected, onSelect, onDelete }) => {
  const { start, end } = connection;
  
  // Simple straight line for now
  const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  
  return (
    <g>
      <path
        d={path}
        stroke={isSelected ? "#3b82f6" : "#6b7280"}
        strokeWidth={isSelected ? "3" : "2"}
        fill="none"
        markerEnd="url(#arrowhead)"
        className="cursor-pointer hover:stroke-blue-400"
        onClick={(e) => { e.stopPropagation(); onSelect(connection.id); }}
      />
      {isSelected && (
        <circle
          cx={(start.x + end.x) / 2}
          cy={(start.y + end.y) / 2}
          r="8"
          fill="#ef4444"
          className="cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onDelete(connection.id); }}
        />
      )}
    </g>
  );
};

// Node Palette
const NodePalette = ({ onAddNode }) => {
  const { trackInteraction } = useSessionStore();

  const addNode = (type) => {
    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 300 },
      label: NODE_TYPES[type].label
    };
    onAddNode(newNode);
    trackInteraction('node_added', { type });
  };

  return (
    <div className="w-60 bg-white border-r p-4">
      <h3 className="font-semibold mb-4">Node Types</h3>
      
      <div className="space-y-2">
        {Object.entries(NODE_TYPES).map(([type, config]) => (
          <button
            key={type}
            onClick={() => addNode(type)}
            className={`w-full p-2 rounded border-2 border-dashed transition-all ${config.color} hover:scale-105`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{config.icon}</span>
              <span className="text-sm font-medium">{config.label}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-xs text-gray-600">
        <p>• Click to add nodes</p>
        <p>• Drag nodes to move</p>
        <p>• Drag between connection points</p>
      </div>
    </div>
  );
};

// Node Editor Modal
const NodeEditor = ({ node, isOpen, onClose, onSave }) => {
  const [editedNode, setEditedNode] = useState(node || {});

  useEffect(() => {
    setEditedNode(node || {});
  }, [node]);

  if (!isOpen || !node) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80">
        <h3 className="text-lg font-semibold mb-4">Edit {NODE_TYPES[node.type]?.label}</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={editedNode.label || ''}
              onChange={(e) => setEditedNode({...editedNode, label: e.target.value})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={editedNode.description || ''}
              onChange={(e) => setEditedNode({...editedNode, description: e.target.value})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              rows="2"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(editedNode); onClose(); }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Workflow state management
const useWorkflowState = () => {
  const sessionStore = useSessionStore();
  
  const getWorkflowFromSession = () => {
    return sessionStore.sessionData.currentWorkflow || {
      nodes: [{ id: 'start_1', type: 'start', position: { x: 150, y: 100 }, label: 'Start' }],
      connections: []
    };
  };

  const saveWorkflowToSession = (nodes, connections) => {
    useSessionStore.setState(state => ({
      sessionData: {
        ...state.sessionData,
        currentWorkflow: { nodes, connections }
      }
    }));
  };

  return {
    getWorkflowFromSession,
    saveWorkflowToSession,
    trackInteraction: sessionStore.trackInteraction,
    incrementWorkflowsCreated: sessionStore.incrementWorkflowsCreated
  };
};

// Main WorkflowBuilder Component
const WorkflowBuilder = () => {
  const workflowState = useWorkflowState();
  
  // Load from session
  const initialWorkflow = workflowState.getWorkflowFromSession();
  const [nodes, setNodes] = useState(initialWorkflow.nodes);
  const [connections, setConnections] = useState(initialWorkflow.connections);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  
  // Connection creation state
  const [connectionStart, setConnectionStart] = useState(null);
  const [previewLine, setPreviewLine] = useState(null);
  
  // Drag state
  const dragState = useRef({ isDragging: false, nodeId: null, offset: { x: 0, y: 0 } });

  // Save to session whenever workflow changes
  useEffect(() => {
    workflowState.saveWorkflowToSession(nodes, connections);
  }, [nodes, connections]);

  // Global mouse handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { isDragging, nodeId, offset } = dragState.current;
      
      if (isDragging && nodeId) {
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        const newPosition = {
          x: Math.max(0, e.clientX - canvasRect.left - offset.x),
          y: Math.max(0, e.clientY - canvasRect.top - offset.y)
        };
        
        setNodes(prev => prev.map(node => 
          node.id === nodeId ? { ...node, position: newPosition } : node
        ));
      }
      
      // Update preview line during connection creation
      if (connectionStart) {
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        setPreviewLine({
          start: connectionStart.point,
          end: { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top }
        });
      }
    };

    const handleMouseUp = () => {
      dragState.current = { isDragging: false, nodeId: null, offset: { x: 0, y: 0 } };
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [connectionStart]);

  // Handlers
  const handleAddNode = (node) => {
    setNodes(prev => [...prev, node]);
  };

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
  };

  const handleSelectConnection = (connectionId) => {
    setSelectedConnectionId(connectionId);
    setSelectedNodeId(null);
  };

  const handleDeleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.fromId !== nodeId && c.toId !== nodeId));
    setSelectedNodeId(null);
  };

  const handleDeleteConnection = (connectionId) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
    setSelectedConnectionId(null);
  };

  const handleEditNode = (node) => {
    setEditingNode(node);
  };

  const handleSaveNode = (editedNode) => {
    setNodes(prev => prev.map(n => n.id === editedNode.id ? editedNode : n));
  };

  const handleConnectionStart = (nodeId, point, side) => {
    if (connectionStart) {
      // Complete connection
      if (connectionStart.nodeId !== nodeId) {
        const newConnection = {
          id: `conn_${Date.now()}`,
          fromId: connectionStart.nodeId,
          toId: nodeId,
          start: connectionStart.point,
          end: point
        };
        setConnections(prev => [...prev, newConnection]);
        workflowState.trackInteraction('connection_created', { from: connectionStart.nodeId, to: nodeId });
      }
      setConnectionStart(null);
      setPreviewLine(null);
    } else {
      // Start connection
      setConnectionStart({ nodeId, point, side });
    }
  };

  const handleCanvasClick = () => {
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectionStart(null);
    setPreviewLine(null);
  };

  const handleSaveWorkflow = () => {
    workflowState.incrementWorkflowsCreated();
    workflowState.trackInteraction('workflow_saved', { 
      nodeCount: nodes.length, 
      connectionCount: connections.length 
    });
    alert(`Workflow saved! ${nodes.length} nodes, ${connections.length} connections`);
  };

  const handleClearWorkflow = () => {
    setNodes([{ id: 'start_1', type: 'start', position: { x: 150, y: 100 }, label: 'Start' }]);
    setConnections([]);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectionStart(null);
    setPreviewLine(null);
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Node Palette */}
      <NodePalette onAddNode={handleAddNode} />
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Workflow Builder</h2>
              <div className="text-sm text-gray-500">
                {nodes.length} nodes • {connections.length} connections
                {connectionStart && <span className="text-blue-600"> • Click target to connect</span>}
              </div>
            </div>
            
            <div className="space-x-2">
              {connectionStart && (
                <button
                  onClick={() => { setConnectionStart(null); setPreviewLine(null); }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSaveWorkflow}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={handleClearWorkflow}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            id="canvas"
            className="w-full h-full relative"
            style={{
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
            onClick={handleCanvasClick}
          >
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#6b7280" />
                </marker>
              </defs>
              
              {/* Existing connections */}
              {connections.map(connection => (
                <Connection
                  key={connection.id}
                  connection={connection}
                  isSelected={selectedConnectionId === connection.id}
                  onSelect={handleSelectConnection}
                  onDelete={handleDeleteConnection}
                />
              ))}
              
              {/* Preview line */}
              {previewLine && (
                <path
                  d={`M ${previewLine.start.x} ${previewLine.start.y} L ${previewLine.end.x} ${previewLine.end.y}`}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  fill="none"
                  className="pointer-events-none"
                />
              )}
            </svg>

            {/* Nodes */}
            <div className="absolute inset-0" style={{ zIndex: 2 }}>
              {nodes.map(node => (
                <Node
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={handleSelectNode}
                  onMove={() => {}} // Handled by global mouse events
                  onDelete={handleDeleteNode}
                  onEdit={handleEditNode}
                  onConnectionStart={handleConnectionStart}
                  dragState={dragState}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Node Editor Modal */}
      <NodeEditor
        node={editingNode}
        isOpen={!!editingNode}
        onClose={() => setEditingNode(null)}
        onSave={handleSaveNode}
      />
    </div>
  );
};

export default WorkflowBuilder;