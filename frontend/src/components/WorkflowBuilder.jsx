import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Brain } from 'lucide-react';

import CustomNode from './CustomNode';
import Sidebar from './WorkflowSidebar';
import NodeEditor from './NodeEditor';
import WorkflowToolbar from './WorkflowToolbar';
import { useWorkflowState } from '../hooks/useWorkflowState';
import { useWorkflowValidation } from '../hooks/useWorkflowValidation';
import { NODE_TEMPLATES, TAILWIND_COLORS } from '../constants/nodeTemplates';

// Notification Banner Component
const NotificationBanner = memo(({ notification }) => {
  if (!notification) return null;

  const bgColor = notification.type === 'error' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded ${bgColor} text-white z-50 shadow-lg`}>
      {notification.message}
    </div>
  );
});

NotificationBanner.displayName = 'NotificationBanner';

// Main WorkflowBuilder Component
const WorkflowBuilder = () => {
  const workflowState = useWorkflowState();
  const { screenToFlowPosition } = useReactFlow();

  // Initialize workflow from session
  const initialWorkflow = useMemo(() => 
    workflowState.getWorkflowFromSession(), 
    [workflowState]
  );
  
  // State declarations
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

  // Workflow validation
  const workflowValidation = useWorkflowValidation(nodes, edges);

  // All callback functions defined early
  const showNotification = useCallback((message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    setEdges(prevEdges => prevEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    workflowState?.trackInteraction?.('node_deleted', { nodeId });
  }, [setNodes, setEdges, workflowState]);

  const editNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      workflowState?.trackInteraction?.('node_edit_started', { nodeId });
    }
  }, [nodes, workflowState]);

  const onKeyDown = useCallback((event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      if (selectedNodes.length > 0) {
        selectedNodes.forEach(node => deleteNode(node.id));
        workflowState?.trackInteraction?.('nodes_deleted_keyboard', { count: selectedNodes.length });
      }
      
      if (selectedEdges.length > 0) {
        setEdges(prevEdges => prevEdges.filter(edge => !edge.selected));
        workflowState?.trackInteraction?.('edges_deleted_keyboard', { count: selectedEdges.length });
      }
    }
  }, [nodes, edges, deleteNode, setEdges, workflowState]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    if (!sourceNode || !targetNode) return;
    
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
    
    setEdges(prevEdges => addEdge(params, prevEdges));
    workflowState?.trackInteraction?.('nodes_connected', { source: params.source, target: params.target });
  }, [setEdges, workflowState, nodes, edges, showNotification]);

  const onConnectStart = useCallback((event, { nodeId, handleId, handleType }) => {
    setConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourceHandleType: handleType
    });
  }, []);

  const onConnectEnd = useCallback(() => {
    setConnectionState({
      isConnecting: false,
      sourceNodeId: null,
      sourceHandleId: null,
      sourceHandleType: null
    });
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    
    const nodeTemplateId = event.dataTransfer.getData('application/reactflow');
    const nodeTemplate = NODE_TEMPLATES.find(template => template.id === nodeTemplateId);
    
    if (!nodeTemplate) return;
    
    const { zoom } = getViewport();

    const position = screenToFlowPosition({ 
      x: event.clientX - (100 * zoom), 
      y: event.clientY - (50 * zoom)
    });

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
      },
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    setNodeCounter(prev => prev + 1);
    workflowState?.trackInteraction?.('node_added', { type: nodeTemplate.id, position });
  }, [nodeCounter, setNodes, workflowState, screenToFlowPosition]);

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
    showNotification(`Workflow executed with ${nodes.length} nodes and ${edges.length} connections`, 'success');
  }, [workflowState, nodes.length, edges.length, showNotification]);

  const saveWorkflow = useCallback(() => {
    workflowState?.trackInteraction?.('workflow_saved', { 
      nodeCount: nodes.length, 
      connectionCount: edges.length 
    });
    showNotification(`Workflow saved: ${nodes.length} nodes, ${edges.length} connections`, 'success');
  }, [workflowState, nodes.length, edges.length, showNotification]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    workflowState?.trackInteraction?.('workflow_cleared');
  }, [setNodes, setEdges, workflowState]);

  const miniMapNodeColor = useCallback((node) => {
    return TAILWIND_COLORS[node?.data?.color] || '#6b7280';
  }, []);

  // Connection validation
  const isValidConnection = useCallback((connection) => {
    if (!connection?.source || !connection?.target || connection.source === connection.target) {
      return false;
    }

    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    const sourceConnections = edges.filter(e => 
      e.source === sourceNode.id && (!connection.sourceHandle || e.sourceHandle === connection.sourceHandle)
    );
    const targetConnections = edges.filter(e => 
      e.target === targetNode.id && (!connection.targetHandle || e.targetHandle === connection.targetHandle)
    );

    const sourceLimit = sourceNode.data.maxOutputConnections || 1;
    const targetLimit = targetNode.data.maxInputConnections || 1;

    return sourceConnections.length < sourceLimit && targetConnections.length < targetLimit;
  }, [edges, nodes]);

  // Enhanced nodes with connection state and callbacks
  const enhancedNodes = useMemo(() => 
    nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        connectionState,
        onDelete: deleteNode,
        onEdit: editNode
      }
    })), 
    [nodes, connectionState, deleteNode, editNode]
  );

  // Node types
  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  // Save to session with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (workflowState?.saveWorkflowToSession && (nodes.length > 0 || edges.length > 0)) {
        workflowState.saveWorkflowToSession(nodes, edges);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, workflowState]);

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
        <WorkflowToolbar
          nodes={nodes}
          edges={edges}
          workflowValidation={workflowValidation}
          onExecute={executeWorkflow}
          onSave={saveWorkflow}
          onClear={clearWorkflow}
        />

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
                <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-gray-200 max-w-md">
                  <Brain size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Start Building Your Workflow
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop nodes from the sidebar to create your research automation workflow.
                  </p>
                  <button
                    onClick={() => setShowNodePanel(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          setNodes(prevNodes => 
            prevNodes.map(n => 
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