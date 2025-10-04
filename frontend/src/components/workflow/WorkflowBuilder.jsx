// frontend/src/components/WorkflowBuilder.jsx
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

import CustomNode from '../nodes/CustomNode';
import NodeEditor from '../nodes/NodeEditor';

import Sidebar from './WorkflowSidebar';
import WorkflowToolbar from './WorkflowToolbar';

import LanguageSwitcher from '../LanguageSwitcher';

import { useSession } from '../../hooks/useSession';
import { useTracking } from '../../hooks/useTracking';
import { useSessionData } from '../../hooks/useSessionData';
import { sessionAPI } from '../../config/api';
import { WORKFLOW_CONFIG, TRACKING_EVENTS } from '../../config/constants';

import { useWorkflowValidation } from '../../hooks/useWorkflowValidation';
import { useTranslation } from '../../hooks/useTranslation';

import { NODE_TEMPLATES, TAILWIND_COLORS } from '../../constants/nodeTemplates';
import { ICONS } from '../../constants/icons';

import { 
  getNodeTranslationKey, 
  getNodeTypeTranslationKey 
} from '../../utils/translationHelpers';

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
  const { sessionId } = useSession();
  const { 
    trackNodeAdded, 
    trackNodeDeleted, 
    trackNodeEdited,
    trackEdgeAdded,
    trackEdgeDeleted,
    trackWorkflowSaved,
    trackError 
  } = useTracking();
  const { currentWorkflow, updateWorkflow } = useSessionData();
  
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const { t } = useTranslation();

  // Initialize workflow from session
  const initialWorkflow = useMemo(() => 
    currentWorkflow || { nodes: [], edges: [] }, 
    [currentWorkflow]
  );

  // Calculate initial node counter based on existing nodes to prevent ID collisions
  const getInitialNodeCounter = useCallback(() => {
    if (initialWorkflow.nodes.length === 0) return 0;
    
    let maxCounter = 0;
    initialWorkflow.nodes.forEach(node => {
      // Extract counter from node ID (e.g., "gather-data-5" -> 5)
      const match = node.id.match(/-(\d+)$/);
      if (match) {
        const counter = parseInt(match[1], 10);
        maxCounter = Math.max(maxCounter, counter);
      }
    });
    return maxCounter + 1; // Start from next available number
  }, [initialWorkflow.nodes]);
  
  // State declarations
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow.edges);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [nodeCounter, setNodeCounter] = useState(getInitialNodeCounter);
  const [editingNode, setEditingNode] = useState(null);
  const [notification, setNotification] = useState(null);
  const [connectionState, setConnectionState] = useState({
    isConnecting: false,
    sourceNodeId: null,
    sourceHandleId: null,
    sourceHandleType: null
  });

  // Get icon components
  const PlusIcon = ICONS.Plus.component;
  const BrainIcon = ICONS.Brain.component;

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
    
    // Track deletion
    trackNodeDeleted(nodeId);
  }, [setNodes, setEdges, trackNodeDeleted]);

  const editNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      trackNodeEdited(nodeId, { action: 'opened_editor' });
    }
  }, [nodes, trackNodeEdited]);

  const handleNodeAdd = useCallback((event, nodeType) => {
    const nodeTemplate = NODE_TEMPLATES[nodeType];
    if (!nodeTemplate) return;

    const zoom = getViewport().zoom || 1;

    const position = screenToFlowPosition({ 
      x: event.clientX - (WORKFLOW_CONFIG.DEFAULT_NODE_WIDTH * zoom), // Centering the node (assuming node width ~200px)
      y: event.clientY - (WORKFLOW_CONFIG.DEFAULT_NODE_HEIGHT * zoom)   // Centering the node (assuming node height ~100px)
    });

    const newNode = {
      id: `${nodeType}-${nodeCounter}`,
      type: 'custom',
      position,
      data: {
        label: nodeTemplate.label,
        type: nodeType,
        color: nodeTemplate.color,
        icon: nodeTemplate.icon,
        inputs: nodeTemplate.inputs,
        outputs: nodeTemplate.outputs,
        onDelete: deleteNode,
        onEdit: editNode,
      },
    };

    setNodes(prev => [...prev, newNode]);
    setNodeCounter(prev => prev + 1);
    
    // Track node addition
    trackNodeAdded(nodeType, {
      nodeId: newNode.id,
      position: newNode.position
    });
  }, [
    nodeCounter, 
    screenToFlowPosition, 
    getViewport, 
    setNodes, 
    deleteNode, 
    editNode, 
    trackNodeAdded
  ]);

  // Connection handler with tracking
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
    
    // Track edge addition
    trackEdgeAdded(params.source, params.target, {
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle
    });
  }, [setEdges, trackEdgeAdded]);

  // Edge delete handler with tracking
  const onEdgesDelete = useCallback((edgesToDelete) => {
    edgesToDelete.forEach(edge => {
      trackEdgeDeleted(edge.id, {
        source: edge.source,
        target: edge.target
      });
    });
  }, [trackEdgeDeleted]);

  const onDragStart = useCallback((event, nodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', nodeTemplate.id);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const saveWorkflow = useCallback(() => {
    workflowState?.trackInteraction?.('workflow_saved', { 
      nodeCount: nodes.length, 
      connectionCount: edges.length 
    });
    const message = t('workflow.notifications.workflowSaved', { 
      nodes: nodes.length, 
      connections: edges.length 
    });
    showNotification(message, 'success');
  }, [workflowState, nodes.length, edges.length, showNotification, t]);

  const executeWorkflow = useCallback(() => {
    workflowState?.incrementWorkflowsCreated?.();
    workflowState?.trackInteraction?.('workflow_executed', { 
      nodeCount: nodes.length, 
      connectionCount: edges.length 
    });
    const message = t('workflow.notifications.workflowExecuted', { 
      nodes: nodes.length, 
      connections: edges.length 
    });
    showNotification(message, 'success');
  }, [workflowState, nodes.length, edges.length, showNotification, t]);<

  const clearWorkflow = useCallback(() => {
      setNodes([]);
      setEdges([]);
      workflowState?.trackInteraction?.('workflow_cleared');
      showNotification(t('workflow.notifications.workflowCleared'), 'success');
    }, [setNodes, setEdges, workflowState, showNotification, t]);
  
    const miniMapNodeColor = useCallback((node) => {
      return TAILWIND_COLORS[node?.data?.color] || '#6b7280';
    }, []);
  
    // Connection validation - now per handle instead of per node
    const isValidConnection = useCallback((connection) => {
      if (!connection?.source || !connection?.target || connection.source === connection.target) {
        return false;
      }
  
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

    // Check connections for specific handles
    const sourceHandle = connection.sourceHandle || 'output-0';
    const targetHandle = connection.targetHandle || 'input-0';

    // Count existing connections for the specific handles
    const sourceHandleConnections = edges.filter(e => 
      e.source === sourceNode.id && (e.sourceHandle || 'output-0') === sourceHandle
    );
    const targetHandleConnections = edges.filter(e => 
      e.target === targetNode.id && (e.targetHandle || 'input-0') === targetHandle
    );

    // Each handle can only have one connection (you can modify this logic as needed)
    const sourceHandleLimit = 1; // Could be made configurable per handle
    const targetHandleLimit = 1; // Could be made configurable per handle

    return sourceHandleConnections.length < sourceHandleLimit && 
           targetHandleConnections.length < targetHandleLimit;
  }, [edges, nodes]);

  // Enhanced nodes with connection state and callbacks
  const enhancedNodes = useMemo(() => 
    nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        connectionState,
        currentEdges: edges,
        isValidConnection,
        onDelete: deleteNode,
        onEdit: editNode
      }
    })),     
    [nodes, connectionState, edges, isValidConnection, deleteNode, editNode]
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
      
      {/* Language Switcher Panel */}
      <Panel position="top-right" className="z-20">
        <div className="flex items-center space-x-3">
          <LanguageSwitcher 
            variant="compact" 
            className="shadow-lg"
            showLabels={false}
          />
        </div>
      </Panel>
      
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
              padding: WORKFLOW_CONFIG.DEFAULT_PADDING,
              minZoom: WORKFLOW_CONFIG.ZOOM_MIN,
              maxZoom: WORKFLOW_CONFIG.ZOOM_MAX
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
                  <BrainIcon size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    {t('workflow.builder.emptyState.title')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('workflow.builder.emptyState.description')}
                  </p>
                  <button
                    onClick={() => setShowNodePanel(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon size={16} />
                    {t('workflow.builder.emptyState.addFirstNode')}
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
                    {t('workflow.builder.connectionHelper.connecting')}
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