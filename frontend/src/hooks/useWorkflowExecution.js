// frontend/src/hooks/useWorkflowExecution.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { orchestratorAPI } from '../services/api';
import { useTracking } from './useTracking';
import { useWebSocket } from './useWebSocket';
import { useExecutionProgress } from './useExecutionProgress';
import { 
  serializeWorkflowMinimal,
  validateSerializedWorkflow, 
  printWorkflow, 
  serializeWorkflowWithTranslations
} from '../utils/workflowSerializer';

/**
 * Hook for managing workflow execution with real-time progress tracking
 * 
 * Now uses useExecutionProgress for comprehensive WebSocket message handling
 * 
 * @param {string} sessionId - User session ID
 * @param {string} condition - 'workflow_builder' or 'ai_assistant'
 * @returns {Object} Execution state and control functions
 */
export const useWorkflowExecution = (sessionId, condition) => {
  const [executionId, setExecutionId] = useState(null);
  
  const pollingIntervalRef = useRef(null);
  const { trackWorkflowExecuted, trackError } = useTracking();
  
  // Use existing WebSocket connection
  const { isConnected } = useWebSocket({ autoConnect: true });

  // Use enhanced execution progress hook
  const executionProgress = useExecutionProgress(
  sessionId, 
  executionId, 
  condition,
  {
    onExecutionIdReceived: (id) => {
      console.log('Setting execution_id from WebSocket:', id);
      setExecutionId(id);
    }
  }
);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('Stopping execution status polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Start polling as fallback (in case WebSocket fails)
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('Polling already active, skipping');
      return;
    }

    console.log('Starting execution status polling as fallback');

    pollingIntervalRef.current = setInterval(async () => {
      if (!executionId) {
        console.warn('No execution ID, stopping polling');
        stopPolling();
        return;
      }

      try {
        const statusData = await orchestratorAPI.getExecutionStatus(executionId);
      
        console.log('Poll status:', statusData.status, 
                    'Progress:', statusData.progress_percentage + '%');
        
        // Stop polling if execution is complete
        if (['completed', 'failed', 'cancelled'].includes(statusData.status)) {
          console.log('Execution finished:', statusData.status);
          stopPolling();
          
          // Fetch final result if not already set
          if (!executionProgress.result) {
            try {
              const detail = await orchestratorAPI.getExecutionDetail(executionId);
              // Result will be set via WebSocket, this is just a fallback
              console.log('Final result fetched via polling:', detail.final_result);
            } catch (detailErr) {
              console.error('Failed to fetch execution detail:', detailErr);
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        
        // If execution not found, stop polling
        if (err.response?.status === 404) {
          console.error('Execution not found:', executionId);
          stopPolling();
        }
      }
    }, 3000); // Poll every 3 seconds (less frequent since WebSocket is primary)

    console.log('Polling started (interval: 3s, fallback mode)');
  }, [executionId, stopPolling, executionProgress.result]);

  /**
   * Start polling only if WebSocket is not connected
   */
  useEffect(() => {
    if (executionId && !isConnected) {
      console.warn('WebSocket not connected, starting fallback polling');
      startPolling();
    } else if (executionId && isConnected) {
      console.log('WebSocket connected, polling not needed');
      stopPolling();
    }

    return () => stopPolling();
  }, [executionId, isConnected, startPolling, stopPolling]);

  /**
   * Execute workflow
   */
  const executeWorkflow = useCallback(async (workflow, inputData = {}) => {

    console.log(workflow, inputData)

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow must contain nodes');
    }

    try {
      console.log('🚀 Starting workflow execution');
      
      // Serialize workflow
      //const serialized = serializeWorkflowMinimal(workflow);
      const serialized = workflow;

      // Validate
      const validation = validateSerializedWorkflow(serialized);

      if (!validation.valid) {
        const errorMessage = 'Invalid workflow: ' + validation.errors.join(', ');
        setError(errorMessage);
        setStatus('failed');
        
        trackError('WORKFLOW_VALIDATION_FAILED', {
          errors: validation.errors,
          condition: 'workflow_builder'
        });
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }
      console.log('Workflow validated successfully');
      
      // Print workflow for debugging
      printWorkflow(serialized.nodes, serialized.edges);
      
      // Reset execution progress
      executionProgress.reset();
      
    // ============================================
    // 7. TRACK EXECUTION START
    // ============================================
      
      // Start execution via REST API
      // Track execution start
      trackWorkflowExecuted('WORKFLOW_EXECUTION_STARTED', {
        condition: 'workflow_builder',
        node_count: serialized.nodes.length,
        edge_count: serialized.edges.length
      });

    // ============================================
    // 8. START EXECUTION
    // ============================================

      
      const response = await orchestratorAPI.executeWorkflow(
        sessionId,
        serialized,
        inputData
      );
      
      const newExecutionId = response.execution_id;
      setExecutionId(newExecutionId);
      
      console.log('Execution started:', newExecutionId);
      
      // Track analytics
      trackWorkflowExecuted({
        executionId: newExecutionId,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length,
        condition
      });
      
      return newExecutionId;
      
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      trackError('workflow_execution_failed', error.message);
      throw error;
    }
  }, [sessionId, condition, trackWorkflowExecuted, trackError, executionProgress]);

  /**
   * Cancel execution
   */
  const cancelExecution = useCallback(async () => {
    if (!executionId) {
      console.warn('No execution to cancel');
      return;
    }

    try {
      console.log('🛑 Cancelling execution:', executionId);
      await orchestratorAPI.cancelExecution(executionId);
      stopPolling();
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      trackError('execution_cancel_failed', error.message);
      throw error;
    }
  }, [executionId, stopPolling, trackError]);

  /**
   * Clear execution state
   */
  const clearExecution = useCallback(() => {
    console.log('🧹 Clearing execution state');
    setExecutionId(null);
    executionProgress.reset();
    stopPolling();
  }, [executionProgress, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // Execution control
    executionId,
    executeWorkflow,
    cancelExecution,
    clearExecution,
    
    // Status from executionProgress
    status: executionProgress.status,
    progress: executionProgress.messages,
    progressPercentage: executionProgress.progressPercentage,
    currentStep: executionProgress.currentStep,
    result: executionProgress.result,
    error: executionProgress.error,
    
    // States from executionProgress
    nodeStates: executionProgress.nodeStates,
    toolStates: executionProgress.toolStates,
    nodeResults: executionProgress.nodeResults,
    
    // Computed flags
    isRunning: executionProgress.isRunning,
    isComplete: executionProgress.isComplete,
    isFailed: executionProgress.isFailed,
    isCancelled: executionProgress.isCancelled,
  };
};

export default useWorkflowExecution;