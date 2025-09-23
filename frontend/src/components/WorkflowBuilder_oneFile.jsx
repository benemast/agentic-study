// frontend/src/components/WorkflowBuilder_oneFile.jsx
import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Handle,
  Position,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Play, 
  Database, 
  FileText, 
  Filter, 
  BarChart3, 
  Brain, 
  Download,
  Plus,
  Settings,
  Trash2,
  Edit3,
  Save,
  RotateCcw
} from 'lucide-react';
import { useSessionStore } from './SessionManager';

// Constants moved outside component to prevent recreation
const ICON_MAP = {
  Database,
  Filter,
  BarChart3,
  Brain,
  Download,
};

const TAILWIND_COLORS = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#10b981',
  'bg-purple-500': '#8b5cf6',
  'bg-orange-500': '#f97316',
  'bg-indigo-500': '#6366f1',
  'bg-yellow-500': '#eab308',
};

const NODE_TEMPLATES = [
  {
    id: 'gather-data',
    label: 'Gather Data',
    type: 'Data Input',
    icon: 'Database',
    color: 'bg-blue-500',
    category: 'input',
    hasInput: 0,
    hasOutput: 1,
    maxInputConnections: 0,
    maxOutputConnections: 3
  },
  {
    id: 'logic-if',
    label: 'Logic If',
    type: 'Conditional',
    icon: 'Filter',
    color: 'bg-yellow-500',
    category: 'logic',
    hasInput: 1,
    hasOutput: 2,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'clean-data',
    label: 'Clean Data',
    type: 'Data Processing',
    icon: 'Filter',
    color: 'bg-green-500',
    category: 'processing',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'sentiment-analysis',
    label: 'Sentiment Analysis',
    type: 'Analysis',
    icon: 'BarChart3',
    color: 'bg-purple-500',
    category: 'analysis',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'generate-insights',
    label: 'Generate Insights',
    type: 'AI Operation',
    icon: 'Brain',
    color: 'bg-orange-500',
    category: 'ai',
    hasInput: 1,
    hasOutput: 1,
    maxInputConnections: 1,
    maxOutputConnections: 1
  },
  {
    id: 'show-results',
    label: 'Show Results',
    type: 'Output',
    icon: 'Download',
    color: 'bg-indigo-500',
    category: 'output',
    hasInput: 1,
    hasOutput: 0,
    maxInputConnections: 1,
    maxOutputConnections: 0
  }
];

// Custom Node Component
const CustomNode = ({ data, selected, id, isValidConnection, nodes }) => {
  const { label, type, color, hasInput = true, hasOutput = true, iconName } = data;

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    data.onDelete?.(id);
  }, [data, id]);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    data.onEdit?.(id);
  }, [data, id]);

  const IconComponent = ICON_MAP[iconName] || Database;
  
  // Get connection state from context or props
  const connectionState = data.connectionState || { isConnecting: false };
  
  // Determine if this node can be a valid target during connection
  const isValidTarget = useMemo(() => {
    if (!connectionState.isConnecting || connectionState.sourceNodeId === id) {
      console.log('Invalid target', connectionState, id);
      return false;
    }
    
    const mockConnection = {
      source: connectionState.sourceNodeId,
      target: id,
      sourceHandle: connectionState.sourceHandleId,
      targetHandle: null
    };
    
    return isValidConnection?.(mockConnection) || false;
  }, [connectionState, id, isValidConnection]);

  // Check if a specific handle should be highlighted
  const getHandleHighlight = useCallback((handleType, handleIndex) => {
      if (!connectionState.isConnecting) return 'normal';
      
      if (connectionState.sourceNodeId === id) {
        // This is the source node - highlight the specific source handle
        if (handleType === connectionState.sourceHandleType) {
          const sourceHandleIndex = connectionState.sourceHandleId ? 
            parseInt(connectionState.sourceHandleId.split('-')[1]) || 0 : 0;
          return handleIndex === sourceHandleIndex ? 'source' : 'normal';
        }
        return 'normal';
      } else if (handleType === 'target' && connectionState.sourceHandleType === 'source') {
        // Check if this specific target handle can accept the connection
        const mockConnection = {
          source: connectionState.sourceNodeId,
          target: id,
          sourceHandle: connectionState.sourceHandleId,
          targetHandle: `input-${handleIndex}` // Use the specific target handle
        };
        
        return isValidConnection?.(mockConnection) ? 'target' : 'normal';
      }
    
    return 'normal';
  }, [connectionState, id, isValidConnection]);

  // Dynamic styling based on connection state - now more granular
  const nodeClassName = useMemo(() => {
    let baseClass = `relative bg-white rounded-lg shadow-lg border-2 transition-all duration-200 min-w-[200px] group`;
    
     if (selected) {
      baseClass += ' border-blue-400 shadow-blue-200';
    } else if (connectionState.isConnecting) {
      if (connectionState.sourceNodeId === id) {
        // Source node
        baseClass += ' border-blue-400 bg-blue-50 shadow-blue-200';
      } else {
        // Check if this node has any valid target handles
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
  
  const inputHandles = useMemo(() => (
    hasInput > 0 && Array.from({ length: hasInput }, (_, idx) => {
      const highlight = getHandleHighlight('target', idx);
      const isHighlighted = highlight === 'target';
      
      const handleStyle = {
        left: `${((idx + 1) / (hasInput + 1)) * 100}%`,
        transform: `translateX(-50%) ${isHighlighted ? 'scale(1.25)' : 'scale(1)'}`,
        zIndex: isHighlighted ? 10 : 1,
        backgroundColor: isHighlighted ? '#10b981' : '#9ca3af',
        boxShadow: isHighlighted ? '0 0 0 2px rgb(34 197 94 / 0.3)' : 'none',
        transition: 'all 0.2s ease-in-out'
      };
      
      return (
        <Handle
          key={`input-${id}-${idx}`}
          type="target"
          position={Position.Top}
          className="w-3 h-3 !border-2 !border-white"
          style={handleStyle}
        />
      );
    })
  ), [hasInput, id, getHandleHighlight]);

  const outputHandles = useMemo(() => (
    hasOutput > 0 && Array.from({ length: hasOutput }, (_, idx) => {
      const highlight = getHandleHighlight('source', idx);
      const isHighlighted = highlight === 'source';
      
      const handleStyle = {
        left: `${((idx + 1) / (hasOutput + 1)) * 100}%`,
        transform: `translateX(-50%) ${isHighlighted ? 'scale(1.25)' : 'scale(1)'}`,
        zIndex: isHighlighted ? 10 : 1,
        backgroundColor: isHighlighted ? '#3b82f6' : '#9ca3af',
        boxShadow: isHighlighted ? '0 0 0 2px rgb(59 130 246 / 0.3)' : 'none',
        transition: 'all 0.2s ease-in-out'
      };
      
      return (
        <Handle
          key={`output-${id}-${idx}`}
          type="source"
          position={Position.Bottom}
          id={`output-${idx}`}
          className="w-3 h-3 !border-2 !border-white mx-1"
          style={handleStyle}
        />
      );
    })
  ), [hasOutput, id, getHandleHighlight]);

  // Add visual indicator for nodes with valid target handles
  const hasValidTargets = connectionState.isConnecting && connectionState.sourceNodeId !== id && 
    hasInput > 0 && Array.from({ length: hasInput }, (_, idx) => {
      const mockConnection = {
        source: connectionState.sourceNodeId,
        target: id,
        sourceHandle: connectionState.sourceHandleId,
        targetHandle: `input-${idx}`
      };
      return isValidConnection?.(mockConnection) || false;
    }).some(Boolean);

  const connectionIndicator = connectionState.isConnecting && hasValidTargets && (
    <div className="absolute inset-0 rounded-lg border-2 border-green-400 bg-green-100 bg-opacity-20 animate-pulse pointer-events-none" />
  );
  
  return (
    <div className={nodeClassName}>
      {connectionIndicator}
      {inputHandles}
      
      <div className={`
        absolute -top-2 -right-2 flex gap-1 transition-opacity duration-200
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `}>
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
            connectionState.isConnecting && isValidTarget ? 'ring-2 ring-green-300' : ''
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
};

// Optimized workflow state management hook
const useWorkflowState = () => {
  const sessionStore = useSessionStore();
  
  const getWorkflowFromSession = useCallback(() => {
    return sessionStore?.sessionData?.currentWorkflow || { nodes: [], edges: [] };
  }, [sessionStore?.sessionData?.currentWorkflow]);

  const saveWorkflowToSession = useCallback((nodes, edges) => {
    if (!sessionStore) return;
    
    useSessionStore.setState(state => ({
      sessionData: {
        ...state.sessionData,
        currentWorkflow: { nodes, edges }
      }
    }));
  }, [sessionStore]);

  return {
    getWorkflowFromSession,
    saveWorkflowToSession,
    trackInteraction: sessionStore?.trackInteraction || (() => {}),
    incrementWorkflowsCreated: sessionStore?.incrementWorkflowsCreated || (() => {})
  };
};

// Memoized Node Editor Modal
const NodeEditor = memo(({ node, isOpen, onClose, onSave, workflowState }) => {
  const [editedNode, setEditedNode] = useState(node || {});

  useEffect(() => {
    setEditedNode(node || {});
  }, [node]);

  const handleSave = useCallback(() => {
    onSave(editedNode);
    workflowState?.trackInteraction?.('node_edited', { 
      nodeId: editedNode.id, 
      changes: { label: editedNode.data?.label } 
    });
    onClose();
  }, [editedNode, onSave, onClose, workflowState]);

  const handleInputChange = useCallback((field, value) => {
    setEditedNode(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
  }, []);

  if (!isOpen || !node) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80">
        <h3 className="text-lg font-semibold mb-4">Edit Node</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={editedNode.data?.label || ''}
              onChange={(e) => handleInputChange('label', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={editedNode.data?.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
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
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
});

NodeEditor.displayName = 'NodeEditor';

// Memoized Notification Banner
const NotificationBanner = memo(({ notification }) => {
  if (!notification) return null;

  const bgColor = notification.type === 'error' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded ${bgColor} text-white z-50`}>
      {notification.message}
    </div>
  );
});

NotificationBanner.displayName = 'NotificationBanner';

// Memoized Sidebar Component
const Sidebar = memo(({ showNodePanel, setShowNodePanel, onDragStart, workflowState }) => {
  const categorizedNodes = useMemo(() => {
    const categories = {};
    NODE_TEMPLATES.forEach(node => {
      if (!categories[node.category]) {
        categories[node.category] = [];
      }
      categories[node.category].push(node);
    });
    return categories;
  }, []);

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${showNodePanel ? 'w-80' : 'w-16'}`}>
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowNodePanel(!showNodePanel)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <Plus size={20} />
          {showNodePanel && <span className="font-medium">Add Nodes</span>}
        </button>
      </div>
      
      {showNodePanel && (
        <div className="p-4 space-y-6">
          {Object.entries(categorizedNodes).map(([category, nodes]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {nodes.map((node) => {
                  const IconComponent = ICON_MAP[node.icon] || Database;
                  
                  return (
                    <div
                      key={node.id}
                      draggable
                      onDragStart={(e) => {
                        onDragStart(e, node);
                        workflowState?.trackInteraction?.('node_drag_started', { type: node.id });
                      }}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 transition-colors"
                    >
                      <div className={`p-2 rounded ${node.color}`}>
                        <IconComponent size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{node.label}</p>
                        <p className="text-xs text-gray-500">{node.type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

const WorkflowBuilder = () => {
  const workflowState = useWorkflowState();
  const { screenToFlowPosition, getViewport } = useReactFlow();

  // Load from session with fallback - use useMemo to prevent recreation
  const initialWorkflow = useMemo(() => 
    workflowState.getWorkflowFromSession(), []
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow.edges);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [nodeCounter, setNodeCounter] = useState(0);
  const [editingNode, setEditingNode] = useState(null);
  const [notification, setNotification] = useState(null);
  const [connectionState, setConnectionState] = useState({
    isConnecting: false,
    sourceNodeId: null,
    sourceHandleId: null,
    sourceHandleType: null
  });

  // Enhanced nodes with connection state
  const enhancedNodes = useMemo(() => 
    nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        connectionState
      }
    })), [nodes, connectionState]);

  // Function to check if a connection is valid
  const isValidConnection = useCallback((connection) => {
    if (!connection || !nodes || !Array.isArray(nodes)) {
      return false;
    }

    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
      return false;
    }

    // Count existing connections
    const sourceConnections = edges.filter(e => 
      e.source === sourceNode.id && (!connection.sourceHandle || e.sourceHandle === connection.sourceHandle)
    );
    const targetConnections = edges.filter(e => 
      e.target === targetNode.id && (!connection.targetHandle || e.targetHandle === connection.targetHandle)
    );

    // Check limits
    const sourceLimit = sourceNode.data.maxOutputConnections || 1;
    const targetLimit = targetNode.data.maxInputConnections || 1;

    return sourceConnections.length < sourceLimit && targetConnections.length < targetLimit;
  }, [edges, nodes]);

  // Handle connection start (when dragging starts from a handle)
  const onConnectStart = useCallback((event, { nodeId, handleId, handleType }) => {
    setConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourceHandleType: handleType
    });
  }, []);

  // Handle connection stop (when dragging ends)
  const onConnectEnd = useCallback((event) => {
    setConnectionState({
      isConnecting: false,
      sourceNodeId: null,
      sourceHandleId: null,
      sourceHandleType: null
    });
  }, []);

  // Node types defined outside or properly memoized
  const nodeTypes = useMemo(() => ({
    customNode: CustomNode,
  }), []);

  // Function to show notification banner
  const showNotification = useCallback((message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Check if workflow has a valid execution path from input to output
    const isWorkflowExecutable = useMemo(() => {
      if (nodes.length === 0 || edges.length === 0) return false;
  
      const inputNodes = nodes.filter(node => node.data.category === 'input');
      const outputNodes = nodes.filter(node => node.data.category === 'output');
      
      if (inputNodes.length === 0 || outputNodes.length === 0) return false;
  
      // Build adjacency list for the graph
      const adjacencyList = new Map();
      nodes.forEach(node => {
        adjacencyList.set(node.id, []);
      });
      
      edges.forEach(edge => {
        if (adjacencyList.has(edge.source)) {
          adjacencyList.get(edge.source).push(edge.target);
        }
      });
  
      // DFS to check if there's a path from any input to any output
      const visited = new Set();
      
      const dfs = (nodeId, targetNodes) => {
        if (visited.has(nodeId)) return false;
        if (targetNodes.some(target => target.id === nodeId)) return true;
        
        visited.add(nodeId);
        const neighbors = adjacencyList.get(nodeId) || [];
        
        for (const neighbor of neighbors) {
          if (dfs(neighbor, targetNodes)) {
            return true;
          }
        }
        
        return false;
      };
  
      // Check if any input node can reach any output node
      for (const inputNode of inputNodes) {
        visited.clear();
        if (dfs(inputNode.id, outputNodes)) {
          return true;
        }
      }
  
      return false;
    }, [nodes, edges]);

  // Save to session with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (workflowState?.saveWorkflowToSession && (nodes.length > 0 || edges.length > 0)) {
        workflowState.saveWorkflowToSession(nodes, edges);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, workflowState]);

  // Handle node deletion
  const deleteNode = useCallback((nodeId) => {
    setNodes(nodes => nodes.filter(node => node.id !== nodeId));
    setEdges(edges => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    workflowState?.trackInteraction?.('node_deleted', { nodeId });
  }, [setNodes, setEdges, workflowState]);

  // Handle node editing
  const editNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      workflowState?.trackInteraction?.('node_edit_started', { nodeId });
    }
  }, [nodes, workflowState]);

  // Handle keyboard events for deletion
  const onKeyDown = useCallback((event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      if (selectedNodes.length > 0) {
        selectedNodes.forEach(node => deleteNode(node.id));
        workflowState?.trackInteraction?.('nodes_deleted_keyboard', { count: selectedNodes.length });
      }
      
      if (selectedEdges.length > 0) {
        setEdges(edges => edges.filter(edge => !edge.selected));
        workflowState?.trackInteraction?.('edges_deleted_keyboard', { count: selectedEdges.length });
      }
    }
  }, [nodes, edges, deleteNode, setEdges, workflowState]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    if (!sourceNode || !targetNode) return;
    
    // Count existing connections
    const sourceConnections = edges.filter(e => e.source === params.source);
    const targetConnections = edges.filter(e => e.target === params.target);
    
    const sourceLimit = sourceNode.data.maxOutputConnections;
    const targetLimit = targetNode.data.maxInputConnections;
    
    if (sourceConnections.length >= sourceLimit) {
      showNotification(`This node can only have ${sourceLimit} outgoing connection${sourceLimit > 1 ? 's' : ''}`);
      return;
    }
    
    if (targetConnections.length >= targetLimit) {
      showNotification(`This node can only have ${targetLimit} incoming connection${targetLimit > 1 ? 's' : ''}`);
      return;
    }
    
    setEdges((eds) => addEdge(params, eds));
    workflowState?.trackInteraction?.('nodes_connected', { source: params.source, target: params.target });
  }, [setEdges, workflowState, nodes, edges, showNotification]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    
    const nodeTemplateId = event.dataTransfer.getData('application/reactflow');
    const nodeTemplate = NODE_TEMPLATES.find(template => template.id === nodeTemplateId);
    
    if (!nodeTemplate) return;
    
    const { x: viewportX, y: viewportY, zoom } = getViewport();
    const x = event.clientX - (100 * zoom);
    const y = event.clientY - (50 * zoom);

    const position = screenToFlowPosition({ x, y });    

    const newNode = {
      id: `${nodeTemplate.id}-${nodeCounter}`,
      type: 'customNode',
      position,
      data: {
        label: nodeTemplate.label,
        type: nodeTemplate.type,
        category: nodeTemplate.category,
        iconName: nodeTemplate.icon,
        color: nodeTemplate.color,
        hasInput: nodeTemplate.hasInput,
        hasOutput: nodeTemplate.hasOutput,
        maxInputConnections: nodeTemplate.maxInputConnections,
        maxOutputConnections: nodeTemplate.maxOutputConnections,
        description: '',
        onDelete: deleteNode,
        onEdit: editNode,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setNodeCounter(counter => counter + 1);
    workflowState?.trackInteraction?.('node_added', { type: nodeTemplate.id, position });
  }, [nodeCounter, setNodes, deleteNode, editNode, workflowState, getViewport]);

  const onDragStart = useCallback((event, nodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', nodeTemplate.id);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const executeWorkflow = useCallback(() => {
    workflowState?.incrementWorkflowsCreated?.();
    workflowState?.trackInteraction?.('workflow_executed', { 
      nodeCount: nodes.length, 
      connectionCount: edges.length 
    });
    alert(`Executing workflow... (This would trigger your FastAPI backend)\n${nodes.length} nodes, ${edges.length} connections`);
  }, [workflowState, nodes.length, edges.length]);

  const saveWorkflow = useCallback(() => {
    workflowState?.trackInteraction?.('workflow_saved', { 
      nodeCount: nodes.length, 
      connectionCount: edges.length 
    });
    alert(`Workflow saved! ${nodes.length} nodes, ${edges.length} connections`);
  }, [workflowState, nodes.length, edges.length]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    workflowState?.trackInteraction?.('workflow_cleared');
  }, [setNodes, setEdges, workflowState]);

  const miniMapNodeColor = useCallback((node) => {
    return TAILWIND_COLORS[node?.data?.color] || '#6b7280';
  }, []);

  return (
    <div className="h-full flex min-h-0 bg-gray-50">
      <NotificationBanner notification={notification} />
      
      <Sidebar 
        showNodePanel={showNodePanel}
        setShowNodePanel={setShowNodePanel}
        onDragStart={onDragStart}
        workflowState={workflowState}
      />

      {/* Main Workflow Area */}
      <div className="flex-1 relative">
        {/* Top Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-gray-800">Research Workflow</h1>
              <span className="text-sm text-gray-500">
                {nodes.length} nodes, {edges.length} connections
              </span>
              {/* Workflow Status Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                workflowValidation.isValid 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  workflowValidation.isValid ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                {workflowValidation.message}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={saveWorkflow}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              >
                <Save size={16} />
                Save
              </button>
              <button 
                onClick={clearWorkflow}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              >
                <RotateCcw size={16} />
                Clear
              </button>              
              <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100">
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={executeWorkflow}                
                disabled={!isWorkflowExecutable}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isWorkflowExecutable 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={workflowValidation.details}
              >
                <Play size={16} />
                Execute
              </button>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="pt-16 h-full" onKeyDown={onKeyDown} tabIndex={0}>
          <ReactFlow
            nodes={enhancedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            isValidConnection={isValidConnection}
            className="bg-gray-50"
            fitView
            fitViewOptions={{
              padding: 0.3,
              minZoom: 0.3,
              maxZoom: 1.5
            }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
            deleteKeyCode={null}
          >
            <Background color="#e5e7eb" size={1} />
            <Controls className="bg-white border border-gray-200" />
            <MiniMap 
              className="bg-white border border-gray-200"
              nodeColor={miniMapNodeColor}
            />
            
            {/* Empty State */}
            {nodes.length === 0 && (
              <Panel position="center">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-gray-200">
                  <Brain size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Start Building Your Workflow
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop nodes from the sidebar to create your research automation workflow.
                  </p>
                  <button
                    onClick={() => setShowNodePanel(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Add Your First Node
                  </button>
                </div>
              </Panel>
            )}

             {/* Workflow Status Help Panel */}
            {!workflowValidation.isValid && nodes.length > 0 && (
              <Panel position="top-left">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-800 mb-1">
                        {workflowValidation.message}
                      </h4>
                      <p className="text-sm text-yellow-700">
                        {workflowValidation.details}
                      </p>
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            {/* Connection Helper Overlay */}
            {connectionState.isConnecting && (
              <Panel position="top-center">
                <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-blue-800 text-sm font-medium">
                    🔗 Drag to connect nodes • Green = Valid target • Gray = Invalid
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Node Editor Modal */}
      <NodeEditor
        node={editingNode}
        isOpen={!!editingNode}
        onClose={() => setEditingNode(null)}
        onSave={(editedNode) => {
          setNodes(nodes => 
            nodes.map(n => 
              n.id === editedNode.id ? editedNode : n
            )
          );
        }}
        workflowState={workflowState}
      />
    </div>
  );
};

export default WorkflowBuilder;