// frontend/src/api/orchestrator.js
import { apiClient } from '../config/api';

/**
 * API client for LangGraph orchestrator
 */

export const orchestratorAPI = {
  /**
   * Execute a workflow from Workflow Builder
   * @param {string} sessionId - User session ID
   * @param {Object} workflow - Workflow definition {nodes: [], edges: []}
   * @param {Object} inputData - Initial input data
   * @returns {Promise} Execution response
   */
  executeWorkflow: async (sessionId, workflow, inputData = {}) => {
    return apiClient.post('/api/orchestrator/execute', {
      session_id: sessionId,
      condition: 'workflow_builder',
      workflow,
      input_data: inputData,
      metadata: {
        started_from: 'workflow_builder',
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Execute an AI Assistant task
   * @param {string} sessionId - User session ID
   * @param {string} taskDescription - Natural language task description
   * @param {Object} inputData - Initial input data
   * @returns {Promise} Execution response
   */
  executeAgentTask: async (sessionId, taskDescription, inputData = {}) => {
    return apiClient.post('/api/orchestrator/execute', {
      session_id: sessionId,
      condition: 'ai_assistant',
      task_description: taskDescription,
      input_data: inputData,
      metadata: {
        started_from: 'ai_assistant',
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Get execution status (for polling)
   * @param {number} executionId - Execution ID
   * @returns {Promise} Status object
   */
  getExecutionStatus: async (executionId) => {
    return apiClient.get(`/api/orchestrator/execution/${executionId}/status`);
  },

  /**
   * Get full execution details
   * @param {number} executionId - Execution ID
   * @returns {Promise} Execution details
   */
  getExecutionDetail: async (executionId) => {
    return apiClient.get(`/api/orchestrator/execution/${executionId}`);
  },

  /**
   * Get execution checkpoints for analysis
   * @param {number} executionId - Execution ID
   * @param {number} limit - Maximum checkpoints to return
   * @returns {Promise} Array of checkpoints
   */
  getExecutionCheckpoints: async (executionId, limit = null) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.get(`/api/orchestrator/execution/${executionId}/checkpoints${params}`);
  },

  /**
   * Cancel a running execution
   * @param {number} executionId - Execution ID
   * @returns {Promise} Cancellation response
   */
  cancelExecution: async (executionId) => {
    return apiClient.post(`/api/orchestrator/execution/${executionId}/cancel`);
  },

  /**
   * Get all executions for a session
   * @param {string} sessionId - Session ID
   * @param {number} limit - Maximum executions to return
   * @returns {Promise} Array of executions
   */
  getSessionExecutions: async (sessionId, limit = 10) => {
    return apiClient.get(`/api/orchestrator/session/${sessionId}/executions?limit=${limit}`);
  },

  /**
   * Create WebSocket connection for real-time updates
   * @param {string} sessionId - Session ID
   * @param {Function} onMessage - Callback for messages
   * @param {Function} onError - Callback for errors
   * @returns {WebSocket} WebSocket connection
   */
  connectWebSocket: (sessionId, onMessage, onError) => {
    const wsUrl = `ws://localhost:8000/api/orchestrator/ws/execution/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return ws;
  }
};

export default orchestratorAPI;