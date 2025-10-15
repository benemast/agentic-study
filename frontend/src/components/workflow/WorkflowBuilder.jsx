// frontend/src/components/workflow/WorkflowBuilder.jsx
import * as Sentry from "@sentry/react";

import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
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

// Components
import CustomNode from '../nodes/CustomNode';
import NodeEditor from '../nodes/NodeEditor';
import Sidebar from './WorkflowSidebar';
import WorkflowToolbar from './WorkflowToolbar';
import LanguageSwitcher from '../LanguageSwitcher';
import ExecutionProgress from '../ExecutionProgress';

// Hooks
import { useSession } from '../../hooks/useSession';
import { useTracking } from '../../hooks/useTracking';
import { useSessionData } from '../../hooks/useSessionData';
import { useWorkflowValidation } from '../../hooks/useWorkflowValidation';
import { useTranslation } from '../../hooks/useTranslation';
import { useWorkflowExecution } from '../../hooks/useWorkflowExecution';
import { serializeWorkflow } from '../../utils/workflowSerializer';

// Config & API
import { sessionAPI } from '../../config/api';
import { 
  WORKFLOW_CONFIG, 
  UI_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES 
} from '../../config/constants';

// Constants
import { NODE_TEMPLATES, TAILWIND_COLORS } from '../../constants/nodeTemplates';
import { ICONS } from '../../constants/icons';

// Utils
import { getNodeTranslationKey} from '../../utils/translationHelpers';

// ========================================
// Notification Banner Component
// ========================================
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

// ========================================
// Main WorkflowBuilder Component
// ========================================
const WorkflowBuilder = () => {
  // ========================================
  // HOOKS
  // ========================================
  const { sessionId, isActive, updateActivity } = useSession();
  const { 
    trackNodeAdded, 
    trackNodeDeleted, 
    trackNodeEdited,
    trackEdgeAdded,
    trackEdgeDeleted,
    trackWorkflowSaved,
    trackWorkflowExecuted,
    trackWorkflowCleared,
    trackError 
  } = useTracking();
  const { currentWorkflow, updateWorkflow } = useSessionData();
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const { t, currentLanguage } = useTranslation();

  // ========================================
  // INITIAL STATE
  // ========================================
  // Initialize workflow from session
  const initialWorkflow = useMemo(() => 
    currentWorkflow || { nodes: [], edges: [] }, 
    [currentWorkflow]
  );

  // Calculate initial node counter to prevent ID collisions
  const getInitialNodeCounter = useCallback(() => {
    if (initialWorkflow.nodes.length === 0) return 0;
    
    let maxCounter = 0;
    initialWorkflow.nodes.forEach(node => {
      const match = node.id.match(/-(\d+)$/);
      if (match) {
        const counter = parseInt(match[1], 10);
        maxCounter = Math.max(maxCounter, counter);
      }
    });
    return maxCounter + 1;
  }, [initialWorkflow.nodes]);

  // ========================================
  // STATE - UI & Local State
  // ========================================
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

  // ========================================
  // CONSTANTS - Icons & Node Types
  // ========================================
  const PlusIcon = ICONS.Plus.component;
  const BrainIcon = ICONS.Brain.component;

  // Custom node types for ReactFlow
  const nodeTypes = useMemo(() => ({ 
    custom: CustomNode 
  }), []);

  // ========================================
  // WORKFLOW VALIDATION
  // ========================================
  const workflowValidation = useWorkflowValidation(nodes, edges);

  // ========================================
  // NOTIFICATIONS
  // ========================================
  const showNotification = useCallback((message, type = 'error') => {
    console.log("showNotification: " + message)   
    setNotification({ message, type });
    setTimeout(() => setNotification(null), UI_CONFIG.NOTIFICATION_DURATION);
  }, []);

  // ========================================
  // AUTO-SAVE - Sync with Session
  // ========================================
  useEffect(() => {
    if (!sessionId || !isActive) return;

    const autoSaveInterval = setInterval(() => {
      if (nodes.length > 0 || edges.length > 0) {
        updateWorkflow(nodes, edges);
      }
    }, UI_CONFIG.DEBOUNCE_DELAY);

    return () => clearInterval(autoSaveInterval);
  }, [sessionId, isActive, nodes, edges, updateWorkflow]);

  // Update activity on interaction
  useEffect(() => {
    updateActivity();
  }, [nodes.length, edges.length, updateActivity]);

  // ========================================
  // NODE OPERATIONS
  // ========================================
  const deleteNode = useCallback((nodeId) => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    setEdges(prevEdges => prevEdges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    trackNodeDeleted(nodeId);
    //showNotification(t('workflow.notifications.nodeDeleted'), 'success')
  }, [setNodes, setEdges, trackNodeDeleted, showNotification, t]);

  const editNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      trackNodeEdited(nodeId, { action: 'opened_editor' });
    }
  }, [nodes, trackNodeEdited]);

  const handleNodeSave = useCallback((updatedNode) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === updatedNode.id ? updatedNode : node
      )
    );
    setEditingNode(null);
    
    trackNodeEdited(updatedNode.id, { 
      action: 'saved',
      changes: updatedNode.data 
    });
    
    showNotification(t('workflow.notifications.nodeSaved'), 'success');
  }, [setNodes, trackNodeEdited, showNotification, t]);

  // ========================================
  // DRAG AND DROP HANDLERS
  // ========================================
  const onDragStart = useCallback((event, nodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeTemplate));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();

    /*

    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    // Check handle-specific connections
    const sourceHandle = connection.sourceHandle || 'output-0';
    const targetHandle = connection.targetHandle || 'input-0';

    const sourceHandleConnections = edges.filter(e => 
      e.source === connection.source && (e.sourceHandle || 'output-0') === sourceHandle
    );
    const targetHandleConnections = edges.filter(e => 
      e.target === connection.target && (e.targetHandle || 'input-0') === targetHandle
    );

    // Get limits from node data (already stored during node creation)
    const sourceHandleLimit = sourceNode.data?.maxOutputConnections || 1;
    const targetHandleLimit = targetNode.data?.maxInputConnections || 1;

    */

    try {
      const nodeTemplate = JSON.parse(
        event.dataTransfer.getData('application/reactflow')
      );

      if (!nodeTemplate || !nodeTemplate.id) {
        console.error('Invalid node template');
        return;
      }

      // Check max nodes limit
      if (nodes.length >= WORKFLOW_CONFIG.MAX_NODES) {
        showNotification(
          t('workflow.notifications.maxNodesReached', { max: WORKFLOW_CONFIG.MAX_NODES }),
          'error'
        );
        return;
      }

      const zoom = getViewport().zoom || 1;
      const position = screenToFlowPosition({ 
        x: event.clientX - (WORKFLOW_CONFIG.DEFAULT_NODE_WIDTH / 2 * zoom), // Centering the node (assuming node width ~200px)
        y: event.clientY - (WORKFLOW_CONFIG.DEFAULT_NODE_HEIGHT / 2 * zoom)   // Centering the node (assuming node height ~100px)
      });

      const nodeId = `${nodeTemplate.id}-${nodeCounter}`;
      setNodeCounter(prev => prev + 1);

      // Get translations for this specific node
      const nodeTranslations = t(getNodeTranslationKey(nodeTemplate.id));

      const newNode = {
        id: nodeId,
        type: 'custom',
        position: position,
        data: {
          label: nodeTranslations.label || nodeTemplate.label,
          type: nodeTranslations.type || nodeTemplate.type,
          description: nodeTranslations.description || '',
          category: nodeTemplate.category,
          iconName: nodeTemplate.icon,
          color: nodeTemplate.color,
          hasInput: nodeTemplate.hasInput ?? 1,
          hasOutput: nodeTemplate.hasOutput ?? 1,
          maxInputConnections: nodeTemplate.maxInputConnections ?? 1,
          maxOutputConnections: nodeTemplate.maxOutputConnections ?? 1,
          config: { ...nodeTemplate.defaultConfig },
          onDelete: deleteNode,
          onEdit: editNode,
          inputs: nodeTemplate.inputs || [],
          outputs: nodeTemplate.outputs || [],
        },
      };

      setNodes(prevNodes => [...prevNodes, newNode]);
          
      trackNodeAdded(nodeTemplate.type, { 
        nodeId, 
        category: nodeTemplate.category,
        totalNodes: nodes.length + 1,
        method: 'drag_drop'
      });
      
      //showNotification(t('workflow.notifications.nodeAdded'), 'success');
    } catch (error) {
      console.error('Error dropping node:', error);
      showNotification('Failed to add node', 'error');
    }
  }, [
    nodes.length,
    nodeCounter,
    getViewport,
    screenToFlowPosition,
    setNodes,
    trackNodeAdded,
    deleteNode,
    editNode,
    showNotification,
    t
  ]);


  // ========================================
  // EDGE/CONNECTION OPERATIONS
  // ========================================
  const getConnectionValidation = useCallback((connection) => {
    const result = {
      isValid: false,
      reason: null,
      sourceNode: null,
      targetNode: null,
      sourceHandle: connection.sourceHandle || 'output-0',
      targetHandle: connection.targetHandle || 'input-0',
      sourceHandleConnections: [],
      targetHandleConnections: [],
      sourceHandleLimit: 1,
      targetHandleLimit: 1
    };

    if (!connection?.source || !connection?.target || connection.source === connection.target) {
      result.reason = 'invalid_connection';
      return result;
    }

    if (edges.length >= WORKFLOW_CONFIG.MAX_EDGES) {
      result.reason = 'max_edges_reached';
      return result;
    }

    result.sourceNode = nodes.find(n => n.id === connection.source);
    result.targetNode = nodes.find(n => n.id === connection.target);

    if (!result.sourceNode || !result.targetNode) {
      result.reason = 'nodes_not_found';
      return result;
    }
  
    result.sourceHandleConnections = edges.filter(e => 
      e.source === connection.source && (e.sourceHandle || 'output-0') === result.sourceHandle
    );
    result.targetHandleConnections = edges.filter(e => 
      e.target === connection.target && (e.targetHandle || 'input-0') === result.targetHandle
    );

    result.sourceHandleLimit = result.sourceNode.data?.maxOutputConnections || 1;
    result.targetHandleLimit = result.targetNode.data?.maxInputConnections || 1;

    if (result.sourceHandleConnections.length >= result.sourceHandleLimit) {
      result.reason = 'source_handle_max_reached';
      return result;
    }

    if (result.targetHandleConnections.length >= result.targetHandleLimit) {
      result.reason = 'target_handle_max_reached';
      return result;
    }

    result.isValid = true;
    return result;
  }, [edges, nodes]);
  
  const isValidConnection = useCallback((connection) => {
    return getConnectionValidation(connection).isValid;
  }, [getConnectionValidation]);
  
  const onConnect = useCallback((params) => {
    const validation = getConnectionValidation(params);

      console.log("Connection valid: " + validation.isValid);
    
    if (!validation.isValid) {
      
      console.log("Validation reason: " + validation.reason);

      switch (validation.reason) {
        case 'max_edges_reached':
          showNotification(
            t('workflow.notifications.maxEdgesReached', { max: WORKFLOW_CONFIG.MAX_EDGES }),
            'error'
          );
          break;
          
        case 'source_handle_max_reached':
          showNotification(
            t('workflow.notifications.sourceHandleMaxReached', { max: validation.sourceHandleLimit }) 
            || `Source handle already has the maximum of ${validation.sourceHandleLimit} connection${validation.sourceHandleLimit > 1 ? 's' : ''}`,
            'error'
          );
          break;
          
        case 'target_handle_max_reached':
          showNotification(
            t('workflow.notifications.targetHandleMaxReached', { max: validation.targetHandleLimit }) 
            || `Target handle already has the maximum of ${validation.targetHandleLimit} connection${validation.targetHandleLimit > 1 ? 's' : ''}`,
            'error'
          );
          break;
          
        default:
          showNotification(
            t('workflow.notifications.connectionFailed') || 'Cannot create connection',
            'error'
          );
      }
      return;
    }
    
    setEdges(eds => addEdge(params, eds));
      
    trackEdgeAdded(params.source, params.target);
    showNotification(t('workflow.notifications.connectionAdded'), 'success');
  }, [getConnectionValidation, edges, nodes, setEdges, trackEdgeAdded, showNotification, t]);

  const onEdgesDelete = useCallback((edgesToDelete) => {
    edgesToDelete.forEach(edge => {
      trackEdgeDeleted(edge.id);
    });
    showNotification(t('workflow.notifications.connectionDeleted'), 'success');
  }, [trackEdgeDeleted, showNotification, t]);

  // Connection state handlers
  const onConnectStart = useCallback((_, { nodeId, handleId, handleType }) => {
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

  // ========================================
  // WORKFLOW EXECUTION
  // ========================================
  
  /*
  const executeWorkflow = useCallback(() => {
    if (!workflowValidation.isValid) {
      showNotification(
        t('workflow.notifications.validationFailed'), 
        'error'
      );
      return;
    }

    trackWorkflowExecuted({ 
      nodeCount: nodes.length, 
      edgeCount: edges.length 
    });
    
    showNotification(
      t('workflow.notifications.workflowExecuted', { 
        nodes: nodes.length, 
        connections: edges.length 
      }), 
      'success'
    );
  }, [workflowValidation.isValid, nodes.length, edges.length, trackWorkflowExecuted, showNotification, t]);
  */
  const {
    status: executionStatus,
    progress: executionProgress,
    progressPercentage,
    currentStep,
    result: executionResult,
    error: executionError,
    executeWorkflow,
    cancelExecution
  } = useWorkflowExecution(sessionId, 'workflow_builder');

  const handleExecuteWorkflow = async () => {
    if (!sessionId || nodes.length === 0) {
      showNotification('Cannot execute empty workflow', 'error');
      return;
    }

    try {
      const result = await executeWorkflow({ nodes, edges }, {
        source: 'default',
        query: 'sample query'
      });
      
      console.log(result);
      
      showNotification('Workflow execution started', 'success');
    } catch (error) {
      console.error('Failed to start workflow:', error);
      showNotification('Failed to start workflow', 'error');
    }
  };

  // ========================================
  // WORKFLOW ACTIONS
  // ========================================
  const saveWorkflow = useCallback(async () => {
    if (!sessionId) {
      showNotification(ERROR_MESSAGES.SESSION_EXPIRED, 'error');
      return;
    }

    try {
      updateWorkflow(nodes, edges);
      await sessionAPI.quickSave(sessionId, {
        workflow: { nodes, edges },
        timestamp: new Date().toISOString()
      });
      
      trackWorkflowSaved({ 
        nodeCount: nodes.length, 
        edgeCount: edges.length 
      });
      
      showNotification(SUCCESS_MESSAGES.SAVED, 'success');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      
      // ADD: Log workflow save failures with context
      Sentry.captureException(error, {
        tags: {
          error_type: 'workflow_save_failed',
          component: 'WorkflowBuilder'
        },
        contexts: {
          workflow: {
            node_count: nodes.length,
            edge_count: edges.length,
            session_id: sessionId,
          }
        }
      });
      
      trackError('workflow_save_failed', error.message);
      showNotification(ERROR_MESSAGES.SAVE_FAILED, 'error');
    }
  }, [sessionId, nodes, edges, updateWorkflow, trackWorkflowSaved, trackError, showNotification]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    trackWorkflowCleared({ 
      nodeCount: 0, 
      edgeCount: 0 
    });
    updateWorkflow([], []);
    showNotification(t('workflow.notifications.workflowCleared'), 'success');
  }, [setNodes, setEdges, updateWorkflow, trackWorkflowCleared, showNotification, t]);

  // ========================================
  // ENHANCED NODES WITH CALLBACKS
  // ========================================
  const enhancedNodes = useMemo(() => 
    nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        label: t(getNodeTranslationKey(node.id.replace(/-\d+$/, ''))),
        connectionState,
        currentEdges: edges,
        isValidConnection,
        onDelete: deleteNode,
        onEdit: editNode,
        isConnecting: connectionState.isConnecting,
        isValidTarget: connectionState.isConnecting && 
                      connectionState.sourceNodeId !== node.id,
      }
    })),
    [nodes, t, deleteNode, editNode, connectionState, edges, isValidConnection,]
  );

  // ========================================
  // MINIMAP NODE COLOR
  // ========================================
  const miniMapNodeColor = useCallback((node) => {
    return TAILWIND_COLORS[node?.data?.color] || '#6b7280';
  }, []);

  // ========================================
  // RENDER
  // ========================================
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
        currentWorkflow={currentWorkflow}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <WorkflowToolbar
          nodes={nodes}
          edges={edges}
          workflowValidation={workflowValidation}
          onExecute={handleExecuteWorkflow}
          onSave={saveWorkflow}
          onClear={clearWorkflow}
        />

        {/* ReactFlow Canvas */}
        <div className="h-full pt-16">
          <ReactFlow
            nodes={enhancedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            isValidConnection={isValidConnection}
            className="bg-gray-50"
            fitView
            fitViewOptions={{ padding: WORKFLOW_CONFIG.DEFAULT_PADDING }}
            minZoom={WORKFLOW_CONFIG.ZOOM_MIN}
            maxZoom={WORKFLOW_CONFIG.ZOOM_MAX}
            defaultViewport={{ x: 0, y: 0, zoom: 0.3 }}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode="Shift"
          >
            <Background 
              gap={WORKFLOW_CONFIG.GRID_SIZE} 
              color="#e5e7eb"
              size={1}
            />
            <Controls className="bg-white border border-gray-200" />
            <MiniMap 
              className="bg-white border border-gray-200"
              nodeColor={miniMapNodeColor}
              maskColor="rgba(0, 0, 0, 0.1)"
            />

            {/* Empty State Panel */}
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

            {/* Validation Warning Panel */}
            {!workflowValidation.isValid && nodes.length > 0 && (
              <Panel position="top-left" className="m-4">
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

            {/* Connection Helper Panel */}
            {connectionState.isConnecting && (
              <Panel position="top-center" className="m-4">
                <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-blue-800 text-sm font-medium">
                    {t('workflow.builder.connectionHelper.connecting')}
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
        {/* Execution Progress Panel */}
        {executionStatus !== 'idle' && (
          <div className="w-96 border-l border-gray-200 p-4 overflow-y-auto">
            <ExecutionProgress
              status={executionStatus}
              progress={executionProgress}
              progressPercentage={progressPercentage}
              currentStep={currentStep}
              condition="workflow_builder"
              onCancel={cancelExecution}
            />
            
            {/* Show results */}
            {executionResult && (
              <div className="mt-4 bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Results</h4>
                <pre className="text-sm text-green-800 overflow-x-auto">
                  {JSON.stringify(executionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node Editor Modal */}
      {editingNode && (
        <NodeEditor
          node={editingNode}
          isOpen={!!editingNode}
          onClose={() => setEditingNode(null)}
          onSave={handleNodeSave}
        />
      )}
    </div>
  );
};

export default WorkflowBuilder;