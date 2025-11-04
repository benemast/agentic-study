// frontend/src/components/workflow/WorkflowBuilder.jsx
import { captureException } from '../../config/sentry';

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
import CustomEdge from './edges/CustomEdge';
import CustomNode from './nodes/CustomNode';
import NodeEditor from './nodes/NodeEditor';
import NodeResultsModal from './nodes/NodeResultsModal';

import Sidebar from './WorkflowSidebar';
import WorkflowToolbar from './WorkflowToolbar';
import LanguageSwitcher from '../LanguageSwitcher';
import ExecutionProgress from '../ExecutionProgress';

// Hooks
import { useSession } from '../../hooks/useSession';
import { useSessionData } from '../../hooks/useSessionData';
import { useTracking } from '../../hooks/useTracking';
import { useWorkflowValidation } from '../../hooks/useWorkflowValidation';
import { useTranslation } from '../../hooks/useTranslation';
import { useWorkflowExecution } from '../../hooks/useWorkflowExecution';

// Config & API
import { sessionAPI } from '../../services/api';
import { 
  WORKFLOW_CONFIG, 
  UI_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES 
} from '../../config/constants';

// Constants
import { NODE_TEMPLATES, TAILWIND_COLORS, getLoadReviewsLabel } from '../../config/nodeTemplates';
import { ICONS } from '../../config/icons';

// Utils
import { getNodeTranslationKey } from '../../utils/translationHelpers';
import { serializeWorkflowMinimal } from '../../utils/workflowSerializer';

// ========================================
// Notification Banner Component
// ========================================
const NotificationBanner = memo(({ notification }) => {
  if (!notification) return null;

  const bgColor = notification.type === 'error' 
    ? 'bg-red-500 dark:bg-red-600' 
    : 'bg-green-500 dark:bg-green-600';

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded ${bgColor} text-white z-50 shadow-lg`}>
      {notification.message}
    </div>
  );
});

NotificationBanner.displayName = 'NotificationBanner';


const NODE_TYPES = {
  custom: CustomNode
};

const EDGE_TYPES = {
  custom: CustomEdge
};

// ========================================
// Main WorkflowBuilder Component
// ========================================
const WorkflowBuilder = () => {
  // ========================================
  // HOOKS
  // ========================================

  // Session identity & health
  const { sessionId, isActive, updateActivity } = useSession();
  
  // Session data (workflows only)
  const { 
    currentWorkflow,
    updateWorkflow,
    incrementWorkflowsCreated,
    setCurrentView,
    getStudyProgress
  } = useSessionData();
  
  const studyProgress = getStudyProgress();
  const currentTaskKey = studyProgress.task1Completed ? 'task2' : 'task1';
  const studyDataset = studyProgress.config[currentTaskKey].dataset

  // Tracking
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
  
  // ReactFlow hooks
  const { screenToFlowPosition, getViewport } = useReactFlow();
  
  // Translation
  const { t, currentLanguage } = useTranslation();

  // ========================================
  // INITIAL STATE
  // ========================================
  const initialWorkflow = useMemo(() => {
    if (!currentWorkflow) {
      return { nodes: [], edges: [] };
    }
    
    // Check if currentWorkflow has correct structure
    if (currentWorkflow.nodes) {
      return currentWorkflow;
    }
    
    // Wrong structure detected
    console.warn("Wrong Workflow structure detected! Restructuring!");
    return { 
      nodes: Array.isArray(currentWorkflow) ? currentWorkflow : [], 
      edges: [] 
    };
  }, [currentWorkflow]);

  // Calculate initial node counter
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
  // STATE - UI & LOCAL
  // ========================================
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow.edges);
  const [showNodePanel, setShowNodePanel] = useState(true);
  const [nodeCounter, setNodeCounter] = useState(getInitialNodeCounter);
  const [editingNode, setEditingNode] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedNodeResult, setSelectedNodeResult] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false); 
  const [connectionState, setConnectionState] = useState({
    isConnecting: false,
    sourceNodeId: null,
    sourceHandleId: null,
    sourceHandleType: null
  });

  // ========================================
  // CONSTANTS
  // ========================================
  const PlusIcon = ICONS.Plus.component;
  const BrainIcon = ICONS.Brain.component;

  // ========================================
  // WORKFLOW VALIDATION
  // ========================================
  const workflowValidation = useWorkflowValidation(nodes, edges, t);

  // ========================================
  // WORKFLOW EXECUTION
  // ========================================
  const {
    executeWorkflow,
    cancelExecution,
    status: executionStatus,
    messages: executionMessages,
    progressPercentage,
    currentStep,
    nodeStates,
    toolStates,
    nodeResults,
    result: executionResult,
    error: executionError   
  } = useWorkflowExecution(sessionId, 'workflow_builder');

  const handleViewNodeResults = useCallback((nodeId) => {
    console.log('🔍 === MODAL OPEN DEBUG ===');
    console.log('📦 Requested node:', nodeId);
    console.log('📦 All nodeResults:', nodeResults);
    console.log('📦 Specific result:', nodeResults?.[nodeId]);
    console.log('📦 Result status:', nodeResults?.[nodeId]?.status);
    console.log('📦 Result has results?:', nodeResults?.[nodeId]?.results !== undefined);
    console.log('📦 Result has result?:', nodeResults?.[nodeId]?.result !== undefined);
    console.log('📦 Full result data:', JSON.stringify(nodeResults?.[nodeId], null, 2));
    
    const result = nodeResults?.[nodeId];
    
    if (result) {
      setSelectedNodeResult(result);
      setShowResultsModal(true);
    } else {
      console.error('❌ No result found!');
    }
    console.log('🔍 === MODAL OPEN DEBUG END ===');
  }, [nodeResults]);

  // ========================================
  // NOTIFICATIONS
  // ========================================
  const showNotification = useCallback((message, type = 'error') => {
    console.log("showNotification: " + message);
    setNotification({ message, type });
    setTimeout(() => setNotification(null), UI_CONFIG.NOTIFICATION_DURATION);
  }, []);

  // ========================================
  // AUTO-SAVE - Sync with Session
  // ========================================
  const previousWorkflowRef = useRef({ nodes: [], edges: [] });

  useEffect(() => {
    if (!sessionId || !isActive) return;

    const autoSaveInterval = setInterval(() => {
      // Only update if workflow actually changed
      const currentNodesStr = JSON.stringify(nodes);
      const currentEdgesStr = JSON.stringify(edges);
      const previousNodesStr = JSON.stringify(previousWorkflowRef.current.nodes);
      const previousEdgesStr = JSON.stringify(previousWorkflowRef.current.edges);
      
      if (currentNodesStr !== previousNodesStr || currentEdgesStr !== previousEdgesStr) {
        // Use the updateWorkflow from useSessionData
        updateWorkflow({ nodes, edges });
        previousWorkflowRef.current = { nodes, edges };
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
  }, [setNodes, setEdges, trackNodeDeleted]);

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

  
  // helper to resolve configSchema functions
  const resolveConfigSchema = useCallback((configSchema) => {
    if (!configSchema) return [];
    
    return configSchema.map(field => {
      // If options is a function, execute it and store the result
      if (typeof field.options === 'function') {
        const resolvedOptions = field.options();
        
        // Sort alphabetically by label
        const sortedOptions = [...resolvedOptions].sort((a, b) => 
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        );
        
        return {
          ...field,
          options: sortedOptions
        };
      }
      return field;
    });
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();

    try {
      const droppedData = JSON.parse(
        event.dataTransfer.getData('application/reactflow')
      );

      if (!droppedData || !droppedData.id) {
        console.error('Invalid node template');
        return;
      }

      // CRITICAL: Look up the original template from NODE_TEMPLATES
      // This preserves functions in configSchema.options
      const nodeTemplate = NODE_TEMPLATES.find(t => t.id === droppedData.id);
      
      if (!nodeTemplate) {
        console.error('Template not found:', droppedData.id);
        return;
      }

      if (nodeTemplate.maxAllowed) {
        const currentCount = nodes.filter(
          n => n.data?.template_id === nodeTemplate.id
        ).length;
        
        if (currentCount >= nodeTemplate.maxAllowed) {
          showNotification(
            t('workflow.notifications.maxAllowedReached', { 
              name: t(getNodeTranslationKey(nodeTemplate.id)).label || nodeTemplate.label,
              max: nodeTemplate.maxAllowed 
            }),
            'error'
          );
          return;  // Block the drop
        }
      }

      const zoom = getViewport().zoom || 1;
      const position = screenToFlowPosition({ 
        x: event.clientX - (WORKFLOW_CONFIG.DEFAULT_NODE_WIDTH / 2 * zoom), // Centering the node (assuming node width ~200px)
        y: event.clientY - (WORKFLOW_CONFIG.DEFAULT_NODE_HEIGHT / 2 * zoom)   // Centering the node (assuming node height ~100px)
      });

      const nodeId = `${nodeTemplate.id}-${nodeCounter}`;
      setNodeCounter(prev => prev + 1);

      const nodeTranslations = t(getNodeTranslationKey(nodeTemplate.id));
    
    // Handle label - special case for load-reviews
    let nodeLabel = nodeTranslations.label || nodeTemplate.label;
    if (nodeTemplate.id === 'load-reviews') {
      nodeLabel = getLoadReviewsLabel(studyDataset);
    }
    
    // Handle config - special case for load-reviews
    let nodeConfig = { ...nodeTemplate.defaultConfig };
    if (nodeTemplate.id === 'load-reviews') {
      nodeConfig = {
        ...nodeTemplate.defaultConfig,
        category: studyDataset,
        limit: null
      };
    }

      const newNode = {
        id: nodeId,
        type: 'custom',
        position: position,
        data: {
          label: nodeLabel,
          type: nodeTranslations.type || nodeTemplate.type,
          description: nodeTranslations.description || '',
          template_id: nodeTemplate.id,
          category: nodeTemplate.category,
          iconName: nodeTemplate.icon,
          color: nodeTemplate.color,
          hasInput: nodeTemplate.hasInput ?? 1,
          hasOutput: nodeTemplate.hasOutput ?? 1,
          maxInputConnections: nodeTemplate.maxInputConnections ?? 1,
          maxOutputConnections: nodeTemplate.maxOutputConnections ?? 1,
          config: nodeConfig,
          configSchema: resolveConfigSchema(nodeTemplate.configSchema),
          studyDataset: studyDataset,
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
      
    } catch (error) {
      console.error('Error dropping node:', error);
      showNotification('Failed to add node', 'error');
    }
  }, [
    nodes.length,
    nodeCounter,
    studyDataset,
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
    // Normalize handle IDs
    const sourceHandle = params.sourceHandle || 'output-0';
    const targetHandle = params.targetHandle || 'input-0';
    
    // Get validation
    const validation = getConnectionValidation(params);
    
    // Track edges to remove for auto-replace
    const edgesToRemove = [];
    let shouldAutoReplace = false;
    let replacementMessage = '';
    
    // Check if we should auto-replace
    if (!validation.isValid) {
      // Auto-replace for source handle
      if (validation.reason === 'source_handle_max_reached' && validation.sourceHandleLimit === 1) {
        const oldConnections = edges.filter(e => 
          e.source === params.source && 
          (e.sourceHandle || 'output-0') === sourceHandle
        );
        
        if (oldConnections.length > 0) {
          edgesToRemove.push(...oldConnections);
          shouldAutoReplace = true;
          replacementMessage = 'Connection replaced (old source connection removed)';
        }
      } 
      // Auto-replace for target handle
      else if (validation.reason === 'target_handle_max_reached' && validation.targetHandleLimit === 1) {
        const oldConnections = edges.filter(e => 
          e.target === params.target && 
          (e.targetHandle || 'input-0') === targetHandle
        );
        
        if (oldConnections.length > 0) {
          edgesToRemove.push(...oldConnections);
          shouldAutoReplace = true;
          replacementMessage = 'Connection replaced (old target connection removed)';
        }
      }
    }
    
    // If we're auto-replacing, proceed
    if (shouldAutoReplace) {
      setEdges(eds => {
        // Remove old edges
        const filteredEdges = eds.filter(e => 
          !edgesToRemove.some(toRemove => toRemove.id === e.id)
        );
        // Add new edge
        return addEdge(params, filteredEdges);
      });
      
      // Track removals
      edgesToRemove.forEach(edge => {
        trackEdgeDeleted(edge.id);
      });
      
      // Track addition
      trackEdgeAdded(params.source, params.target);
      
      // Show success message
      showNotification(replacementMessage, 'success');
      return;
    }
    
    // If not auto-replacing and still not valid, show error
    if (!validation.isValid) {
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
    
    // Normal connection - just add it
    setEdges(eds => addEdge(params, eds));
    trackEdgeAdded(params.source, params.target);
    showNotification(t('workflow.notifications.connectionAdded'), 'success');
  }, [getConnectionValidation, setEdges, trackEdgeAdded, trackEdgeDeleted, showNotification, t, edges]);

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
// ADD THIS TO WorkflowBuilder.jsx (replace your handleRunWorkflow or similar)

  const handleExecuteWorkflow = async () => {
    // Step 1: Check validation
    if (!workflowValidation.canExecute) {
      showNotification(
        workflowValidation.details || t('workflow.notifications.validationFailed'),
        'error'
      );
      if (workflowValidation.configErrors.length > 0) {
        console.error('Node configuration errors:', workflowValidation.configErrors);
      }
      return;
    }

    try {
      // Step 2: Debug - Check nodes before serialization
      console.group('🚀 Workflow Execution Debug');
      console.log('📦 Nodes on canvas:', nodes.length);
      console.log('🔗 Edges on canvas:', edges.length);
      console.log('📋 Node templates:', nodes.map(n => ({
        id: n.id,
        template: n.data?.template_id,
        label: n.data?.label
      })));

      // Step 3: Serialize with filtering
      const serializedWorkflow = serializeWorkflowMinimal(nodes, edges);
      
      console.log('📤 Serialized nodes:', serializedWorkflow.nodes.length);
      console.log('📤 Serialized edges:', serializedWorkflow.edges.length);
      console.groupEnd();

      // Step 4: Check if we have nodes after serialization
      if (serializedWorkflow.nodes.length === 0) {
        console.error('❌ No nodes after serialization! Check the debug logs above.');
        showNotification(
          'Workflow has no valid connected nodes. Make sure you have load-reviews and show-results nodes connected.',
          'error'
        );
        return;
      }

      // Step 5: Execute
      const result = await executeWorkflow(serializedWorkflow, {
        session_id: sessionId,
        category: studyDataset,
        language: currentLanguage
      });
      
      /*
      const result = await executeWorkflow({ nodes, edges }, {
        session_id: sessionId,
        category: studyDataset,
        language: currentLanguage
      });      
      */

      console.log('✅ Execution started:', result);
      
      trackWorkflowExecuted({ 
        nodeCount: serializedWorkflow.nodes.length,
        edgeCount: serializedWorkflow.edges.length,
        hasConfig: serializedWorkflow.nodes.some(n => n.data?.config && Object.keys(n.data.config).length > 0),
        filteredNodes: nodes.length - serializedWorkflow.nodes.length
      });
      
      showNotification(
        t('workflow.notifications.executionStarted') || 'Workflow execution started',
        'success'
      );

    } catch (error) {
      console.error('❌ Failed to start workflow:', error);
      
      captureException(error, {
        tags: {
          error_type: error.response?.status === 500 ? 'server_error' : 'client_error',
          condition: 'workflow_builder'
        },
        extra: {
          nodeCount: nodes.length,
          edgeCount: edges.length
        }
      });

      showNotification(
        error.response?.data?.detail || error.message || t('workflow.notifications.executionFailed'),
        'error'
      );

      trackError('WORKFLOW_EXECUTION_FAILED', {
        error: error.message,
        nodeCount: nodes.length,
        edgeCount: edges.length
      });
    }
  };

  const exclude_handleExecuteWorkflow = async () => {
    if (!sessionId || nodes.length === 0) {
      showNotification('Cannot execute empty workflow', 'error');
      return;
    }

    // Simple validation check - hook handles everything!
    if (!workflowValidation.canExecute) {
      showNotification(
        workflowValidation.details || t('workflow.notifications.validationFailed'),
        'error'
      );

      // Log config errors if present
      if (workflowValidation.configErrors.length > 0) {
        console.error('Node configuration errors:', workflowValidation.configErrors);
      }

      return;
    }

    try {
      // Full send Log
      console.group('Executing Workflow');
      console.log('Nodes:', nodes.length);
      console.log('Edges:', edges.length);
      console.log('Node Configs:', nodes.map(n => ({
        id: n.id,
        template: n.data?.template_id,
        config: n.data?.config
      })));
      console.groupEnd();

      // Execute workflow with full config data
      // serializeWorkflow now includes config in each node
      const result = await executeWorkflow({ nodes, edges }, {
        session_id: sessionId,
        category: studyDataset,
        language: currentLanguage
      });
      
      console.log('Execution started:', result);
      
      trackWorkflowExecuted({ 
        nodeCount: nodes.length, 
        edgeCount: edges.length,
        hasConfig: nodes.some(n => n.data?.config && Object.keys(n.data.config).length > 0)
      });
      
      showNotification(
        t('workflow.notifications.executionStarted') || 'Workflow execution started',
        'success'
      );

    } catch (error) {
      console.error('Failed to start workflow:', error);
      
      captureException(error, {
        tags: {
          error_type: error.response?.status === 500 
            ? 'server_error' 
            : 'execution_error',
          component: 'WorkflowBuilder',
          context: 'workflow_execution'
        },
        level: 'error',
        extra: {
          workflow_nodes: nodes.length,
          workflow_edges: edges.length,
          error_message: error.message,
          validation_state: workflowValidation
        }
      });
      
      showNotification(
        error.response?.data?.detail || t('workflow.notifications.executionFailed') || 'Failed to execute workflow',
        'error'
      );
      trackError('workflow_execution_failed', error.response?.data?.detail);
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
      // Update via useSessionData hook
      updateWorkflow({ nodes, edges });
      
      await sessionAPI.update(sessionId, {
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

      captureException(error, {
        tags: {
          error_type: 'workflow_save_failed',
          component: 'WorkflowBuilder'
        },
        contexts: {
            node_count: workflow?.nodes?.length,
            edge_count: workflow?.edges?.length, 
            session_id: sessionId,
        }
      });
      
      trackError('workflow_save_failed', error.message);
      showNotification(ERROR_MESSAGES.SAVE_FAILED, 'error');
    }
  }, [sessionId, nodes, edges, updateWorkflow, trackWorkflowSaved, trackError, showNotification]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    
    // Update via useSessionData hook
    updateWorkflow({ nodes: [], edges: [] });
    
    trackWorkflowCleared({ 
      nodeCount: 0, 
      edgeCount: 0 
    });

    showNotification(t('workflow.notifications.workflowCleared'), 'success');
  }, [setNodes, setEdges, updateWorkflow, trackWorkflowCleared, showNotification, t]);

  // ========================================
  // ENHANCED NODES
  // ========================================
  const enhancedNodes = useMemo(() => 
    nodes.map(node => {
    // Get the node ID without the counter suffix (e.g., "load-data-1" -> "load-data")
    const baseNodeId = node.id.replace(/-\d+$/, '');
    
    // Get translations - this returns an object like {label, type, description}
    const nodeTranslations = t(getNodeTranslationKey(baseNodeId));
    
    // Extract the label - handle both object and string returns
    const translatedLabel = typeof nodeTranslations === 'object' 
      ? (nodeTranslations.label || node.data.label)
      : nodeTranslations;

    let nodeExecutionState = nodeStates[node.id] || {};

    if (!nodeExecutionState) {
      const altId = node.id.replace(/_/g, '-').replace(/-/g, '_');
      nodeExecutionState = nodeStates[altId] || {};
    }
    
    return {
      ...node,
      data: {
        ...node.data,
        //label: translatedLabel,  // Now correctly extracts just the label string
        connectionState,
        currentEdges: edges,
        isValidConnection,
        onDelete: deleteNode,
        onEdit: editNode,
        onViewResults: handleViewNodeResults,
        isConnecting: connectionState.isConnecting,
        isValidTarget: connectionState.isConnecting && 
                      connectionState.sourceNodeId !== node.id,
        executionState: {
          status: nodeExecutionState.status,                    // 'running', 'completed', 'error'
          progress: nodeExecutionState.progress,                // 0-100
          message: nodeExecutionState.message,                  // Status message
          executionTime: nodeExecutionState.execution_time_ms,  // Time in ms
          error: nodeExecutionState.error,                      // Error message
          hasExecuted: nodeExecutionState.hasExecuted
        }
      }
    };
  }), [
    nodes, 
    t, 
    deleteNode, 
    editNode, 
    connectionState, 
    edges,
    isValidConnection,
    nodeStates,
    handleViewNodeResults
  ]);

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
    <div className="h-full flex min-h-0 bg-gray-50 dark:bg-gray-900">
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
        nodes={nodes}
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
        <div className="workflow-canvas h-full pt-16">
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
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            defaultEdgeOptions={{ type: 'custom' }}
            isValidConnection={isValidConnection}
            className="bg-gray-50"
            data-tour="workflow-canvas"
            fitView
            fitViewOptions={{ padding: WORKFLOW_CONFIG.DEFAULT_PADDING }}
            minZoom={WORKFLOW_CONFIG.ZOOM_MIN}
            maxZoom={WORKFLOW_CONFIG.ZOOM_MAX}
            defaultViewport={{ x: 0, y: 0, zoom: 0.3 }}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode="Shift"
          >
            <Background 
              color="#e5e7eb"
              className="dark:!bg-gray-700"
              gap={WORKFLOW_CONFIG.GRID_SIZE} 
              size={1}
            />
            <Controls className="bg-white border border-gray-200 dark:!bg-gray-700" />
            <MiniMap 
              nodeColor={miniMapNodeColor}
              maskColor="rgba(0, 0, 0, 0.2)"
              className="bg-white border border-gray-200 dark:!bg-gray-800"
            />

            {/* Empty State Panel */}
            {nodes.length === 0 && (
              <Panel position="center">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center border border-gray-200 dark:border-gray-700">
                  {/* Removed for Production clean-up
                  <div className="text-5xl mb-4">🔧</div>
                  */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {t('workflow.builder.emptyState.title')}
                  </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                    {t('workflow.builder.emptyState.description')}
                  </p>
                  {/* Removed for Production clean-up
                  <button
                    onClick={() => setShowNodePanel(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon size={16} />
                    {t('workflow.builder.emptyState.addFirstNode')}
                  </button>
                   */}
                </div>
              </Panel>
            )}

            {/* Validation Warning Panel */}
            {!workflowValidation.isValid && nodes.length > 0 && (
              <Panel position="top-left" className="m-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 max-w-sm shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                        {workflowValidation.message}
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
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
                <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">
                    {t('workflow.builder.connectionHelper.connecting')}
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
        {/* Execution Progress Panel */}
        {executionStatus !== 'idle' && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-y-auto">
            <ExecutionProgress
              status={executionStatus}
              messages={executionMessages}
              progressPercentage={progressPercentage}
              currentStep={currentStep}
              nodeStates={nodeStates}
              toolStates={toolStates}
              condition="workflow_builder"
              onCancel={cancelExecution}
            />
            
            {/* Show results */}
            {executionResult && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                  {t('workflow.execution.results') || 'Results'}
                </h4>
                <pre className="text-sm text-green-800 dark:text-green-200 overflow-x-auto">
                  {JSON.stringify(executionResult, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Show errors */}
            {executionError && executionStatus === 'failed' && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                  {t('workflow.execution.error') || 'Error'}
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200">
                  {executionError}
                </p>
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

      {/* Node Results Modal */}
      {showResultsModal && (
        <NodeResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedNodeResult(null);
          }}
          nodeResult={selectedNodeResult}
        />
      )}

    </div>
  );
};

export default WorkflowBuilder;