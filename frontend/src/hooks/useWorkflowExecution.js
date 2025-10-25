// frontend/src/hooks/useWorkflowExecution.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { orchestratorAPI } from '../services/api';
import { useTracking } from './useTracking';
import { useWebSocket } from './useWebSocket';
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
  
  const pollingIntervalRef = useRef(null);
  const { trackWorkflowExecuted, trackError } = useTracking();
  
  // Use existing WebSocket connection instead of creating a new one
  const { on: wsOn, off: wsOff, isConnected } = useWebSocket({ autoConnect: true });

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('🛑 Stopping execution status polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Start polling as fallback (in case WebSocket fails)
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('⏭️ Polling already active, skipping');
      return;
    }

    console.log('🔄 Starting execution status polling');

    pollingIntervalRef.current = setInterval(async () => {
      if (!executionId) {
        console.warn('⚠️ No execution ID, stopping polling');
        stopPolling();
        return;
      }

      try {
        const statusData = await orchestratorAPI.getExecutionStatus(executionId);
      
        console.log('📊 Poll status:', statusData.status, 
                    'Progress:', statusData.progress_percentage + '%');
        
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
          console.log('✅ Execution finished:', statusData.status);
          stopPolling();
          
          // Fetch final result
          try {
            const detail = await orchestratorAPI.getExecutionDetail(executionId);
            setResult(detail.final_result);
          
            
            if (statusData.status === 'completed') {
              console.log('✅ Final result:', detail.final_result);
              setProgressPercentage(100);
            } else if (statusData.status === 'failed') {
              console.error('❌ Execution failed:', detail.error_message);
              setError(detail.error_message || statusData.error_message);
            }
          } catch (detailErr) {
            console.error('Failed to fetch execution detail:', detailErr);
            // Set error from status if detail fetch fails
            if (statusData.status === 'failed') {
              setError(statusData.error_message || 'Execution failed');
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        
        // If execution not found, it might be deleted or never created
        if (err.response?.status === 404) {
          console.error('❌ Execution not found:', executionId);
          setError('Execution not found');
          setStatus('failed');
          stopPolling();
        }
        
        // Don't stop polling on other errors - might be temporary
        // Let it retry on next interval
      }
    }, 2000); // Poll every 2 seconds

    console.log('✅ Polling started (interval: 2s)');
  }, [executionId, stopPolling]);


  /**
   * Handle execution progress messages from WebSocket
   */
  useEffect(() => {
    if (!isConnected) return;
    
    const handleExecutionProgress = (message) => {
      console.log('Execution progress:', message);
      
      // Only handle messages for current execution
      if (message.execution_id !== executionId) return;
      
      const { event_type, ...data } = message;
      
      switch (event_type) {
        case 'execution_started':
          setStatus('running');
          break;
        
        case 'node_started':
        case 'node_start':
          setProgress(prev => [...prev, {
            type: 'node_start',
            nodeId: data.node_id,
            nodeLabel: data.node_label,
            step: data.step,
            timestamp: new Date().toISOString()
          }]);
          setCurrentStep({
            nodeId: data.node_id,
            label: data.node_label,
            step: data.step
          });
          break;
        
        case 'node_completed':
        case 'node_end':
          setProgress(prev => [...prev, {
            type: 'node_complete',
            nodeId: data.node_id,
            result: data.result,
            step: data.step,
            timestamp: new Date().toISOString()
          }]);
          break;
        
        case 'agent_decision':
          setProgress(prev => [...prev, {
            type: 'agent_decision',
            action: data.action,
            reasoning: data.reasoning,
            confidence: data.confidence,
            step: data.step,
            timestamp: new Date().toISOString()
          }]);
          setCurrentStep({
            action: data.action,
            step: data.step
          });
          break;
        
        case 'tool_execution_start':
          setProgress(prev => [...prev, {
            type: 'tool_start',
            tool: data.tool_name,
            step: data.step,
            timestamp: new Date().toISOString()
          }]);
          break;
        
        case 'tool_execution_completed':
          setProgress(prev => [...prev, {
            type: 'tool_complete',
            tool: data.tool_name,
            result: data.result_summary,
            step: data.step,
            timestamp: new Date().toISOString()
          }]);
          break;
        
        case 'execution_completed':
          setStatus('completed');
          setResult(data.final_result);
          setProgressPercentage(100);
          stopPolling();
          break;
        
        case 'execution_failed':
        case 'execution_error':
          setStatus('failed');
          setError(data.error);
          stopPolling();
          break;
        
        case 'execution_cancelled':
          setStatus('cancelled');
          stopPolling();
          break;
      }
    };
    
    // Subscribe to execution_progress messages
    wsOn('execution_progress', handleExecutionProgress);

    // Check execution status after reconnection
    // If we have a running execution and reconnect, check its current status
    if (executionId && status === 'running') {
      console.log('✅ Reconnected - checking execution status:', executionId);
      
      // Check status immediately
      orchestratorAPI.getExecutionStatus(executionId)
        .then(statusData => {
          console.log('📊 Current execution status:', statusData);
          
          setStatus(statusData.status);
          setProgressPercentage(statusData.progress_percentage || 0);
          
          if (statusData.current_step) {
            setCurrentStep({
              step: statusData.current_step,
              nodeId: statusData.current_node
            });
          }
          
          // If execution completed while disconnected, fetch results
          if (['completed', 'failed', 'cancelled'].includes(statusData.status)) {
            orchestratorAPI.getExecutionDetail(executionId)
              .then(detail => {
                setResult(detail.final_result);
                if (statusData.status === 'failed') {
                  setError(statusData.error_message);
                }
              })
              .catch(err => console.error('Failed to fetch execution detail:', err));
            
            stopPolling();
          } else {
            // Still running - ensure polling is active
            if (!pollingIntervalRef.current) {
              console.log('✅ Restarting polling after reconnect');
              startPolling();
            }
          }
        })
        .catch(err => {
          console.error('Failed to check execution status after reconnect:', err);
          // Start polling as fallback
          if (!pollingIntervalRef.current) {
            startPolling();
          }
        });
    }

    // Cleanup
    return () => {
      wsOff('execution_progress', handleExecutionProgress);
    };
  }, [executionId, isConnected, wsOn, wsOff, startPolling, stopPolling]);

  /**
   * Calculate progress percentage based on steps
   */
  useEffect(() => {
    if (status === 'completed') {
      setProgressPercentage(100);
    } else if (progress.length > 0 && currentStep) {
      // Estimate progress based on steps
      const percentage = Math.min((currentStep.step / 10) * 100, 99);
      setProgressPercentage(percentage);
    }
  }, [progress, currentStep, status]);

  
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
        //console.log('Serialized workflow:', cleanWorkflow);
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

      // Start execution
      const response = await orchestratorAPI.executeWorkflow(
        sessionId,
        cleanWorkflow,
        inputData
      );

      setExecutionId(response.execution_id);
      setStatus('running');

      // Start polling as fallback if WebSocket isn't connected
      if (!isConnected) {
        console.warn('WebSocket not connected, using polling fallback');
        startPolling();
      } else {
        // Still start polling after 5 seconds as safety fallback
        setTimeout(() => {
          if (status === 'running') {
            startPolling();
          }
        }, 5000);
      }

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
  }, [sessionId, isConnected, startPolling, trackWorkflowExecuted, trackError]);

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

      // Start execution
      const response = await orchestratorAPI.executeAgentTask(
        sessionId,
        taskDescription,
        inputData
      );

      setExecutionId(response.execution_id);
      setStatus('running');

      // Start polling as fallback
      if (!isConnected) {
        console.warn('WebSocket not connected, using polling fallback');
        startPolling();
      } else {
        setTimeout(() => {
          if (status === 'running') {
            startPolling();
          }
        }, 5000);
      }

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
  }, [sessionId, isConnected, startPolling, trackWorkflowExecuted, trackError]);

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
    } catch (err) {
      console.error('Failed to cancel execution:', err);
    }
  }, [executionId, condition, stopPolling, trackError]);

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
    };
  }, [stopPolling]);

  return {
    // State
    executionId,
    status,
    progress,
    progressPercentage,
    currentStep,
    result,
    error,
    isConnected,
    
    // Actions
    executeWorkflow,
    executeAgentTask,
    cancelExecution,
    getCheckpoints,
  };
};

export default useWorkflowExecution;