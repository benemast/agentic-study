// frontend/src/hooks/useWorkflowExecution.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { orchestratorAPI } from '../config/api';
import { useTracking } from './useTracking';
import { serializeWorkflow } from '../utils/workflowSerializer';

/**
 * Hook for managing workflow execution with real-time progress tracking
 * 
 * @param {string} sessionId - User session ID
 * @param {string} condition - 'workflow_builder' or 'ai_assistant'
 * @returns {Object} Execution state and control functions
 */
export const useWorkflowExecution = (sessionId, condition) => {
  const [executionId, setExecutionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, starting, running, completed, failed, cancelled
  const [progress, setProgress] = useState([]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentStep, setCurrentStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const { trackWorkflowExecuted, trackError } = useTracking();

  /**
   * Connect WebSocket for real-time updates
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return; // Already connected

    wsRef.current = orchestratorAPI.connectWebSocket(
      sessionId,
      (message) => {
        console.log('WebSocket message:', message);
        
        // Handle different message types
        switch (message.type) {
          case 'node_start':
            setProgress(prev => [...prev, {
              type: 'node_start',
              nodeId: message.node_id,
              nodeLabel: message.node_label,
              step: message.step,
              timestamp: new Date().toISOString()
            }]);
            setCurrentStep({
              nodeId: message.node_id,
              label: message.node_label,
              step: message.step
            });
            break;

          case 'node_complete':
            setProgress(prev => [...prev, {
              type: 'node_complete',
              nodeId: message.node_id,
              success: message.success,
              step: message.step,
              timestamp: new Date().toISOString()
            }]);
            break;

          case 'agent_decision':
            setProgress(prev => [...prev, {
              type: 'agent_decision',
              action: message.action,
              reasoning: message.reasoning,
              step: message.step,
              timestamp: new Date().toISOString()
            }]);
            setCurrentStep({
              action: message.action,
              step: message.step
            });
            break;

          case 'tool_execution':
            setProgress(prev => [...prev, {
              type: 'tool_execution',
              tool: message.tool,
              step: message.step,
              timestamp: new Date().toISOString()
            }]);
            break;

          case 'error':
            setError(message.error);
            setStatus('failed');
            break;

          case 'complete':
            setStatus('completed');
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      },
      (error) => {
        console.error('WebSocket error:', error);
        // Fall back to polling if WebSocket fails
        startPolling();
      }
    );
  }, [sessionId]);

  /**
   * Disconnect WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Start polling for status updates (fallback for WebSocket)
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    pollingIntervalRef.current = setInterval(async () => {
      if (!executionId) return;

      try {
        const statusData = await orchestratorAPI.getExecutionStatus(executionId);
        
        setStatus(statusData.status);
        setProgressPercentage(statusData.progress_percentage || 0);
        
        if (statusData.current_step) {
          setCurrentStep({
            step: statusData.current_step,
            nodeId: statusData.current_node
          });
        }

        // Stop polling if execution is complete
        if (['completed', 'failed', 'cancelled'].includes(statusData.status)) {
          stopPolling();
          
          // Fetch final result
          const detail = await orchestratorAPI.getExecutionDetail(executionId);
          setResult(detail.final_result);
          
          if (statusData.status === 'failed') {
            setError(statusData.error_message);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds
  }, [executionId]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Execute workflow (Workflow Builder condition)
   */
  const executeWorkflow = useCallback(async (workflow, inputData = {}) => {
    try {
      setStatus('starting');
      setProgress([]);
      setError(null);
      setResult(null);
      setProgressPercentage(0);

      let cleanWorkflow;  

      if (workflow.nodes && workflow.edges) {
        cleanWorkflow = serializeWorkflow(workflow.nodes, workflow.edges);
        console.log('Serialized workflow:', cleanWorkflow);
      } else if (Array.isArray(workflow)) {
        cleanWorkflow = serializeWorkflow(workflow[0], workflow[1]);
      } else {
        cleanWorkflow = workflow;
      }


      // Track execution start
      trackWorkflowExecuted('WORKFLOW_EXECUTION_STARTED', {
        condition: 'workflow_builder',
        node_count: workflow?.nodes?.length || 0,
        edge_count: workflow?.edges?.length || 0
      });

      // Connect WebSocket before starting
      connectWebSocket();

      // Start execution
      const response = await orchestratorAPI.executeWorkflow(
        sessionId,
        cleanWorkflow,
        inputData
      );

      setExecutionId(response.execution_id);
      setStatus('running');

      // Start polling as fallback
      setTimeout(() => {
        if (status === 'running') {
          startPolling();
        }
      }, 5000); // Start polling after 5 seconds if still running

      return response;
    } catch (err) {
      console.error('Failed to start workflow execution:', err);
      setError(err.message || 'Failed to start execution');
      setStatus('failed');
      
      trackError('WORKFLOW_EXECUTION_FAILED', {
        error: err.message,
        condition: 'workflow_builder'
      });
      
      throw err;
    }
  }, [sessionId, connectWebSocket, startPolling, trackWorkflowExecuted, trackError]);

  /**
   * Execute AI Assistant task
   */
  const executeAgentTask = useCallback(async (taskDescription, inputData = {}) => {
    try {
      setStatus('starting');
      setProgress([]);
      setError(null);
      setResult(null);
      setProgressPercentage(0);

      // Track execution start
      trackWorkflowExecuted({
        condition: 'ai_assistant',
        task_length: taskDescription.length
      });

      // Connect WebSocket
      connectWebSocket();

      // Start execution
      const response = await orchestratorAPI.executeAgentTask(
        sessionId,
        taskDescription,
        inputData
      );

      setExecutionId(response.execution_id);
      setStatus('running');

      // Start polling as fallback
      setTimeout(() => {
        if (status === 'running') {
          startPolling();
        }
      }, 5000);

      return response;
    } catch (err) {
      console.error('Failed to start agent execution:', err);
      setError(err.message || 'Failed to start execution');
      setStatus('failed');
      
      trackError('AGENT_EXECUTION_FAILED', {
        error: err.message,
        condition: 'ai_assistant'
      });
      
      throw err;
    }
  }, [sessionId, connectWebSocket, startPolling, trackWorkflowExecuted, trackError]);

  /**
   * Cancel execution
   */
  const cancelExecution = useCallback(async () => {
    if (!executionId) return;

    try {
      await orchestratorAPI.cancelExecution(executionId);
      setStatus('cancelled');
      
      trackError('EXECUTION_CANCELLED', {
        execution_id: executionId,
        condition
      });
      
      stopPolling();
      disconnectWebSocket();
    } catch (err) {
      console.error('Failed to cancel execution:', err);
    }
  }, [executionId, condition, stopPolling, disconnectWebSocket, trackError]);

  /**
   * Get execution checkpoints
   */
  const getCheckpoints = useCallback(async () => {
    if (!executionId) return [];

    try {
      return await orchestratorAPI.getExecutionCheckpoints(executionId);
    } catch (err) {
      console.error('Failed to get checkpoints:', err);
      return [];
    }
  }, [executionId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopPolling();
      disconnectWebSocket();
    };
  }, [stopPolling, disconnectWebSocket]);

  return {
    // State
    executionId,
    status,
    progress,
    progressPercentage,
    currentStep,
    result,
    error,
    
    // Actions
    executeWorkflow,
    executeAgentTask,
    cancelExecution,
    getCheckpoints,
    
    // WebSocket control
    connectWebSocket,
    disconnectWebSocket
  };
};

export default useWorkflowExecution;