// frontend/src/hooks/useAgentExecution.js

import { useState, useCallback } from 'react';
import { orchestratorAPI } from '../services/api';
import { useTracking } from './useTracking';
import { useExecutionProgress } from './useExecutionProgress';

/**
 * Hook for managing AI Assistant task execution
 * 
 * Uses useExecutionProgress for comprehensive WebSocket message handling
 * 
 * @param {string} sessionId - User session ID
 * @returns {Object} Execution state and control functions
 */
export const useAgentExecution = (sessionId) => {
  const [executionId, setExecutionId] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { trackError } = useTracking();
  
  // Use enhanced execution progress hook
  const executionProgress = useExecutionProgress(sessionId, executionId, 'ai_assistant');

  /**
   * Execute agent task
   */
  const executeTask = useCallback(async (taskDescription, options = {}) => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    if (!taskDescription || !taskDescription.trim()) {
      throw new Error('Task description is required');
    }

    if (isExecuting) {
      console.warn('Execution already in progress');
      return null;
    }

    try {
      console.log('🤖 Starting AI Assistant task execution');
      setIsExecuting(true);
      
      // Reset execution progress
      executionProgress.reset();
      
      // Start execution via REST API
      const response = await orchestratorAPI.executeAgentTask({
        task_description: taskDescription.trim(),
        context: options.context || [],
        input_data: options.inputData || {},
        metadata: {
          source: options.source || 'chat',
          timestamp: new Date().toISOString(),
          ...options.metadata
        }
      });
      
      const newExecutionId = response.execution_id;
      setExecutionId(newExecutionId);
      
      console.log('✅ AI Assistant task started:', newExecutionId);
      
      return newExecutionId;
      
    } catch (error) {
      console.error('Failed to execute AI Assistant task:', error);
      trackError('agent_execution_failed', error.message);
      setIsExecuting(false);
      throw error;
    }
  }, [sessionId, isExecuting, trackError, executionProgress]);

  /**
   * Cancel execution
   */
  const cancelExecution = useCallback(async () => {
    if (!executionId) {
      console.warn('No execution to cancel');
      return;
    }

    try {
      console.log('🛑 Cancelling AI Assistant execution:', executionId);
      await orchestratorAPI.cancelExecution(executionId);
      setIsExecuting(false);
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      trackError('execution_cancel_failed', error.message);
      throw error;
    }
  }, [executionId, trackError]);

  /**
   * Clear execution state
   */
  const clearExecution = useCallback(() => {
    console.log('🧹 Clearing AI Assistant execution state');
    setExecutionId(null);
    setIsExecuting(false);
    executionProgress.reset();
  }, [executionProgress]);

  // Update isExecuting based on status
  if (executionProgress.isComplete || executionProgress.isFailed || executionProgress.isCancelled) {
    if (isExecuting) {
      setIsExecuting(false);
    }
  }

  return {
    // Execution control
    executionId,
    isExecuting,
    executeTask,
    cancelExecution,
    clearExecution,
    
    // Status from executionProgress
    status: executionProgress.status,
    messages: executionProgress.messages, // All progress messages for chat integration
    progressPercentage: executionProgress.progressPercentage,
    currentStep: executionProgress.currentStep,
    result: executionProgress.result,
    error: executionProgress.error,
    
    // States from executionProgress
    toolStates: executionProgress.toolStates,
    
    // Computed flags
    isRunning: executionProgress.isRunning,
    isComplete: executionProgress.isComplete,
    isFailed: executionProgress.isFailed,
    isCancelled: executionProgress.isCancelled,
  };
};

export default useAgentExecution;