// frontend/src/hooks/useExecutionProgress.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { notificationService } from '../services/notificationService';
import { toast } from 'react-hot-toast';

/**
 * Helper: Extract data from message (handles nested data field)
 */
const extractData = (message) => {
  if (message.data) {
    return { ...message, ...message.data };
  }
  return message;
};

/**
 * Complete execution progress hook with ALL streaming support
 * 
 * Handles WebSocket messages for:
 * - Execution level (orchestrator)
 * - Node level (graph)
 * - Tool level (tools)
 * - LLM level (streaming tokens)
 * - Agent level (decisions)
 * 
 * @param {string} sessionId - Session ID for WebSocket connection
 * @param {string} executionId - Execution ID for message filtering (may be null initially)
 * @param {string} condition - 'workflow_builder' or 'ai_assistant'
 */
export const useExecutionProgress = (sessionId, executionId, condition, callbacks = {}) => {
  // State
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentStep, setCurrentStep] = useState(null);
  const [nodeStates, setNodeStates] = useState({});
  const [toolStates, setToolStates] = useState({});
  const [nodeResults, setNodeResults] = useState({}); 
  const [llmStates, setLlmStates] = useState({});
  const [agentStates, setAgentStates] = useState({});
  
  const { onExecutionIdReceived } = callbacks;

  // Refs
  const startTimeRef = useRef(null);
  const messageCounterRef = useRef(0);
  
  // WebSocket
  const { on: wsOn, off: wsOff } = useWebSocket();

  /**
   * Add message to timeline
   */
  const addMessage = useCallback((message) => {
    const messageWithId = {
      ...message,
      id: `${message.type}-${Date.now()}-${messageCounterRef.current++}`,
      timestamp: message.timestamp || new Date().toISOString()
    };
    
    setMessages(prev => [...prev, messageWithId]);
  }, []);

  /**
   * Clear all state (when execution starts/ends)
   */
  const clearState = useCallback(() => {
    setMessages([]);
    setProgressPercentage(0);
    setCurrentStep(null);
    setNodeStates({});
    setToolStates({});
    setNodeResults({});
    setLlmStates({});
    setAgentStates({});
    startTimeRef.current = null;
    messageCounterRef.current = 0;
  }, []);

  // ========================================
  // EXECUTION LEVEL HANDLERS
  // ========================================

  const handleExecutionStart = useCallback((message) => {
    console.log('Execution start:', message);
    
    const data = extractData(message);
    const { execution_id } = data;
    
    // STEP 1: CAPTURE execution_id from WebSocket (PRIMARY SOURCE)
    // This must happen BEFORE the executionId check below!
    if (execution_id && !executionId && onExecutionIdReceived) {
      console.log('Captured execution_id from WebSocket:', execution_id);
      onExecutionIdReceived(execution_id);
    }
    
    // STEP 2: Filter out messages for other executions
    // Now that we've captured the ID, ignore messages that don't match
    if (executionId && message.execution_id !== executionId) {
      console.log('Skipping - belongs to different execution');
      return;
    }
    
    // STEP 3: Update state
    setStatus('running');
    clearState(); // Clear previous execution data
    startTimeRef.current = Date.now();
    
    // STEP 4: Add message to timeline
    addMessage({
      type: 'execution',
      subtype: message.subtype || 'start', // Preserve original subtype
      content: 'Execution started',
      step: data.step,
      total_steps: data.total_steps
    });
    
    // 🔑 STEP 5: Notify user
    notificationService.notifyExecutionStarted(execution_id || executionId, condition);
    toast.success('Execution started');
  }, [executionId, condition, clearState, addMessage, onExecutionIdReceived, startTimeRef]);
  /**
   * Handle execution_progress
   */
  const handleExecutionProgress = useCallback((message) => {
    console.log('Execution progress:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    
    if (data.progress !== undefined) {
      setProgressPercentage(data.progress);
    }
    
    if (data.message) {
      addMessage({
        type: 'execution',
        subtype: 'progress',
        content: data.message,
        progress: data.progress
      });
    }
  }, [executionId, addMessage]);

  /**
   * Handle execution_end
   */
  const handleExecutionEnd = useCallback((message) => {
    console.log('Execution end:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : null;
    
    setStatus('completed');
    setProgressPercentage(100);
    setCurrentStep(null);
    
    addMessage({
      type: 'execution',
      subtype: 'end',
      content: 'Execution completed',
      steps_completed: data.steps_completed,
      execution_time_ms: data.execution_time_ms,
      duration
    });
    
    notificationService.notifyExecutionCompleted(executionId, condition, duration);
    toast.success('Execution completed!');
  }, [executionId, condition, addMessage]);

  /**
   * Handle execution_error
   */
  const handleExecutionError = useCallback((message) => {
    console.error('Execution error:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    
    setStatus('failed');
    setCurrentStep(null);
    
    addMessage({
      type: 'execution',
      subtype: 'error',
      content: data.error || 'Execution failed',
      error_type: data.error_type
    });
    
    notificationService.notifyExecutionFailed(executionId, condition, data.error);
    toast.error(`Execution failed: ${data.error}`);
  }, [executionId, condition, addMessage]);

  // ========================================
  // NODE LEVEL HANDLERS (Workflow Builder)
  // ========================================

  /**
   * Handle node_start
   */
  const handleNodeStart = useCallback((message) => {
    console.log('Node start:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { node_id, node_label, step_number } = data;
    
    // Initialize node state immediately with all fields
    setNodeStates(prev => {
      const updatedState = {
        ...prev,
        [node_id]: {
          status: 'running',
          label: node_label,
          step: step_number,
          hasExecuted: true,
          timestamp: Date.now(),
          error: null,  // Initialize error field
          error_type: null
        }
      };
      console.log('🟢 Node start state:', { node_id, status: 'running' });
      return updatedState;
    });

    setNodeResults(prevResults => {
      const updatedResults = {
        ...prevResults,
        [node_id]: {
          node_id,
          node_label,
          step_number,
          status: 'running',
          tool_executions: [],
          error: null,  // Initialize error field
          error_type: null
        }
      };
      console.log('🟢 Node results initialized:', { node_id, status: 'running' });
      return updatedResults;
    });
    
    setCurrentStep({
      nodeId: node_id,
      label: node_label,
      step: step_number
    });
    
    addMessage({
      type: 'node',
      subtype: 'start',
      nodeId: node_id,
      nodeLabel: node_label,
      content: `${node_label}: started`,
      step: step_number
    });
  }, [executionId, addMessage]);

  /**
   * Handle node_progress
   */
  const handleNodeProgress = useCallback((message) => {
    console.log('Node progress:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { node_id, node_label, step_number, progress } = data;
    
    setNodeStates(prev => ({
      ...prev,
      [node_id]: {
        ...prev[node_id],
        progress,
        status: 'running'
      }
    }));
    
    if (data.message) {
      addMessage({
        type: 'node',
        subtype: 'progress',
        nodeId: node_id,
        nodeLabel: node_label,
        content: data.message,
        step: step_number,
        progress
      });
    }
  }, [executionId, addMessage]);

  /**
   * Handle node_end
   */ 
  const handleNodeEnd = useCallback((message) => {
    console.log('Node end:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { 
      node_id, 
      node_label, 
      step_number, 
      execution_time_ms, 
      output_data, 
      input_data, 
      error,
      success,
      results
    } = data;
    
    const finalStatus = error ? 'error' : 'completed';
    console.log(`🏁 Node end: ${node_id} - Status: ${finalStatus}`, { error, success });
    
    setNodeStates(prev => ({
      ...prev,
      [node_id]: {
        ...prev[node_id],
        status: finalStatus,
        hasExecuted: true,
        execution_time_ms,
        results: data.results,
        error,
        timestamp: Date.now()
      }
    }));

    setNodeResults(prevResults => ({
      ...prevResults,
      [node_id]: {
        ...prevResults[node_id],  // Keep existing data (tool_executions, etc.)
        node_id,
        node_label,
        step_number,
        status: finalStatus,
        execution_time_ms,
        input_data,
        output_data,
        success,
        results,
        error
      }
    }));
    
    addMessage({
      type: 'node',
      subtype: 'end',
      nodeId: node_id,
      nodeLabel: node_label,
      content: `${node_label}: completed`,
      step: step_number
    });
  }, [executionId, addMessage]);

  /**
   * Handle node_error
   */
  const handleNodeError = useCallback((message) => {
    console.error('Node error:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { node_id, node_label, step_number, error, error_type } = data;
    
    // Force immediate state update to ensure error state persists
    // even if node transitions rapidly from start -> error
    setNodeStates(prev => {
      const updatedState = {
        ...prev,
        [node_id]: {
          ...prev[node_id],
          status: 'error',
          hasExecuted: true,
          error,
          error_type,
          timestamp: Date.now()
        }
      };
      console.log('🔴 Node error state updated:', { node_id, status: 'error', error });
      return updatedState;
    });
    
    setNodeResults(prevResults => {
      const updatedResults = {
        ...prevResults,
        [node_id]: {
          ...prevResults[node_id],
          node_id,
          node_label,
          step_number,
          status: 'error',
          error,
          error_type
        }
      };
      console.log('🔴 Node results updated:', { node_id, status: 'error' });
      return updatedResults;
    });
    
    addMessage({
      type: 'node',
      subtype: 'error',
      nodeId: node_id,
      nodeLabel: node_label,
      content: `${node_label}: ${error}`,
      error,
      error_type,
      step: step_number
    });
    
    toast.error(`Node failed: ${node_label}`);
  }, [executionId, addMessage]);

  // ========================================
  // TOOL LEVEL HANDLERS (Both conditions)
  // ========================================

  /**
   * Handle tool_start
   */
  const handleToolStart = useCallback((message) => {
    console.log('Tool start:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name } = data;
    
    setToolStates(prev => ({
      ...prev,
      [tool_name]: {
        status: 'running',
        start_time: Date.now()
      }
    }));
    
    addMessage({
      type: 'tool',
      subtype: 'start',
      toolName: tool_name,
      content: `${tool_name}: started`
    });
  }, [executionId, addMessage]);

  /**
   * Handle tool_progress
   */
  const handleToolProgress = useCallback((message) => {
    console.log('Tool progress:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name, progress } = data;
    
    setToolStates(prev => ({
      ...prev,
      [tool_name]: {
        ...prev[tool_name],
        progress,
        status: 'running'
      }
    }));
    
    if (data.message) {
      addMessage({
        type: 'tool',
        subtype: 'progress',
        toolName: tool_name,
        content: data.message,
        progress
      });
    }
  }, [executionId, addMessage]);

  /**
   * Handle tool_end
   */
  const handleToolEnd = useCallback((message) => {
    console.log('Tool end:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name, execution_time_ms, output_length, node_id, error } = data;
    
    setToolStates(prev => {
      const toolState = prev[tool_name];
      return {
        ...prev,
        [tool_name]: {
          ...toolState,
          status: error ? 'error' : 'completed',
          execution_time_ms,
          output_length,
          error,
          end_time: Date.now()
        }
      };
    });
    
    // Add tool execution to node result
    if (node_id) {
      setNodeResults(prevResults => ({
        ...prevResults,
        [node_id]: {
          ...prevResults[node_id],
          tool_executions: [
            ...(prevResults[node_id]?.tool_executions || []),
            {
              tool_name,
              execution_time_ms,
              status: error ? 'error' : 'completed',
              error
            }
          ]
        }
      }));
    }
    
    addMessage({
      type: 'tool',
      subtype: 'end',
      toolName: tool_name,
      content: `${tool_name}: ${error ? 'failed' : 'completed'}`,
      execution_time_ms,
      output_length
    });
  }, [executionId, addMessage]);

  /**
   * Handle tool_error
   */
  const handleToolError = useCallback((message) => {
    console.error('Tool error:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name, error } = data;
    
    setToolStates(prev => ({
      ...prev,
      [tool_name]: {
        ...prev[tool_name],
        status: 'failed',
        error,
        end_time: Date.now()
      }
    }));
    
    addMessage({
      type: 'tool',
      subtype: 'error',
      toolName: tool_name,
      content: error,
      error
    });
    
    toast.error(`Tool failed: ${tool_name}`);
  }, [executionId, addMessage]);

  // ========================================
  // LLM LEVEL HANDLERS (Streaming tokens)
  // ========================================

  /**
   * Handle llm_start
   */
  const handleLlmStart = useCallback((message) => {
    console.log('🤖 LLM start:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name, step_number } = data;
    
    const key = `${tool_name}_${step_number || 0}`;
    
    setLlmStates(prev => ({
      ...prev,
      [key]: {
        status: 'running',
        tool_name,
        chunks: [],
        chunk_count: 0,
        start_time: Date.now()
      }
    }));
    
    // Update current step to show thinking
    setCurrentStep(prev => ({
      ...prev,
      thinking: true,
      tool_name
    }));
    
    addMessage({
      type: 'llm',
      subtype: 'start',
      toolName: tool_name,
      content: `${tool_name}: thinking started`,
      step: step_number
    });
  }, [executionId, addMessage]);

  /**
   * Handle llm_new_token / agent_thinking / sentiment_analysis_progress / insight_thinking / tool_progress
   * These are all token streaming events with different names
   */
  const handleLlmToken = useCallback((message) => {
    console.log('LLM token:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name, chunk, chunks_received, step_number } = data;
    
    const key = `${tool_name || 'default'}_${step_number || 0}`;
    
    setLlmStates(prev => {
      const current = prev[key] || { chunks: [], chunk_count: 0 };
      return {
        ...prev,
        [key]: {
          ...current,
          chunks: [...current.chunks, chunk],
          chunk_count: chunks_received || current.chunk_count + 1,
          last_update: Date.now()
        }
      };
    });
    
    // Update current step with chunk count
    setCurrentStep(prev => ({
      ...prev,
      thinking: true,
      chunks: chunks_received || (prev?.chunks || 0) + 1
    }));
    
    // Don't add every token to timeline - too many messages!
    // Only add every 10th or so
    if (chunks_received % 10 === 0) {
      addMessage({
        type: 'llm',
        subtype: 'token',
        toolName: tool_name,
        content: `${tool_name}: thinking... (${chunks_received} chunks)`,
        chunks: chunks_received,
        step: step_number
      });
    }
  }, [executionId, addMessage]);

  /**
   * Handle llm_end
   */
  const handleLlmEnd = useCallback((message) => {
    console.log('LLM end:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name, step_number, tokens_generated, elapsed_ms, ttfb_ms } = data;
    
    const key = `${tool_name}_${step_number || 0}`;
    
    setLlmStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: 'completed',
        tokens_generated,
        elapsed_ms,
        ttfb_ms,
        end_time: Date.now()
      }
    }));
    
    // Clear thinking indicator
    setCurrentStep(prev => ({
      ...prev,
      thinking: false
    }));
    
    addMessage({
      type: 'llm',
      subtype: 'end',
      toolName: tool_name,
      content: `${tool_name}: completed (${tokens_generated} tokens, ${elapsed_ms}ms)`,
      tokens_generated,
      elapsed_ms,
      ttfb_ms,
      step: step_number
    });
  }, [executionId, addMessage]);

  /**
   * Handle llm_error
   */
  const handleLlmError = useCallback((message) => {
    console.error('LLM error:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_name, error } = data;
    
    const key = `${tool_name}_${data.step_number || 0}`;
    
    setLlmStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: 'failed',
        error,
        end_time: Date.now()
      }
    }));
    
    setCurrentStep(prev => ({
      ...prev,
      thinking: false
    }));
    
    addMessage({
      type: 'llm',
      subtype: 'error',
      toolName: tool_name,
      content: `${tool_name}: ${error}`,
      error
    });
    
    toast.error(`LLM error: ${tool_name}`);
  }, [executionId, addMessage]);

  // ========================================
  // AGENT LEVEL HANDLERS (AI Assistant)
  // ========================================

  /**
   * Handle agent_action
   */
  const handleAgentAction = useCallback((message) => {
    console.log('🎯 Agent action:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool, tool_input, log, step_number } = data;
    
    const actionKey = `action_${Date.now()}`;
    
    setAgentStates(prev => ({
      ...prev,
      [actionKey]: {
        type: 'action',
        tool,
        tool_input,
        log,
        timestamp: Date.now()
      }
    }));
    
    setCurrentStep({
      action: tool,
      step: step_number
    });
    
    addMessage({
      type: 'agent',
      subtype: 'action',
      content: `Agent action: ${tool}`,
      tool,
      tool_input: tool_input,
      step: step_number
    });
  }, [executionId, addMessage]);

  /**
   * Handle agent_finish
   */
  const handleAgentFinish = useCallback((message) => {
    console.log('🏁 Agent finish:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { output, step_number } = data;
    
    setAgentStates(prev => ({
      ...prev,
      finish: {
        type: 'finish',
        output,
        timestamp: Date.now()
      }
    }));
    
    setCurrentStep(null);
    
    addMessage({
      type: 'agent',
      subtype: 'finish',
      content: 'Agent finished',
      output,
      step: step_number
    });
  }, [executionId, addMessage]);

  // ========================================
  // BATCH UPDATES
  // ========================================

  /**
   * Handle batch_update - supports both old and new unified format
   */
  const handleBatchUpdate = useCallback((message) => {
    console.log('Batch update:', message.message_count, 'messages');
    
    // Process each message in the batch
    if (message.messages && Array.isArray(message.messages)) {
      message.messages.forEach(msg => {
        // Handle unified format: { type: 'execution', subtype: 'start' }
        if (msg.subtype) {
          const messageKey = `${msg.type}_${msg.subtype}`;
          
          switch (messageKey) {
            // Execution messages
            case 'execution_started':
            case 'execution_start':
              handleExecutionStart(msg);
              break;
            case 'execution_progress':
              handleExecutionProgress(msg);
              break;
            case 'execution_end':
              handleExecutionEnd(msg);
              break;
            case 'execution_error':
              handleExecutionError(msg);
              break;
            
            // Node messages
            case 'node_start':
              handleNodeStart(msg);
              break;
            case 'node_progress':
              handleNodeProgress(msg);
              break;
            case 'node_end':
              handleNodeEnd(msg);
              break;
            case 'node_error':
              handleNodeError(msg);
              break;
            
            // Tool messages
            case 'tool_start':
              handleToolStart(msg);
              break;
            case 'tool_progress':
              handleToolProgress(msg);
              break;
            case 'tool_end':
              handleToolEnd(msg);
              break;
            case 'tool_error':
              handleToolError(msg);
              break;
            
            // LLM messages
            case 'llm_start':
              handleLlmStart(msg);
              break;
            case 'llm_token':
              handleLlmToken(msg);
              break;
            case 'llm_end':
              handleLlmEnd(msg);
              break;
            case 'llm_error':
              handleLlmError(msg);
              break;
            
            // Agent messages
            case 'agent_action':
              handleAgentAction(msg);
              break;
            case 'agent_finish':
              handleAgentFinish(msg);
              break;
            
            default:
              console.warn('Unknown unified message:', messageKey, msg);
          }
        } else {
          // Handle old format: { type: 'execution_started' }
          switch (msg.type) {
            // Execution
            case 'execution_started':
            case 'execution_start':
              handleExecutionStart(msg);
              break;
            case 'execution_progress':
              handleExecutionProgress(msg);
              break;
            case 'execution_end':
              handleExecutionEnd(msg);
              break;
            case 'execution_error':
              handleExecutionError(msg);
              break;
            
            // Node
            case 'node_start':
              handleNodeStart(msg);
              break;
            case 'node_progress':
              handleNodeProgress(msg);
              break;
            case 'node_end':
              handleNodeEnd(msg);
              break;
            case 'node_error':
              handleNodeError(msg);
              break;
            
            // Tool
            case 'tool_start':
              handleToolStart(msg);
              break;
            case 'tool_progress':
              handleToolProgress(msg);
              break;
            case 'tool_end':
              handleToolEnd(msg);
              break;
            case 'tool_error':
              handleToolError(msg);
              break;
            
            // LLM
            case 'llm_start':
              handleLlmStart(msg);
              break;
            case 'llm_end':
              handleLlmEnd(msg);
              break;
            case 'llm_error':
              handleLlmError(msg);
              break;
            
            // LLM streaming tokens (different event names)
            case 'agent_thinking':
            case 'sentiment_analysis_progress':
            case 'insight_thinking':
              handleLlmToken(msg);
              break;
            
            // Agent
            case 'agent_action':
              handleAgentAction(msg);
              break;
            case 'agent_finish':
              handleAgentFinish(msg);
              break;
            
            default:
              console.warn('Unknown message type in batch:', msg.type);
          }
        }
      });
    }
  }, [
    handleExecutionStart,
    handleExecutionProgress,
    handleExecutionEnd,
    handleExecutionError,
    handleNodeStart,
    handleNodeProgress,
    handleNodeEnd,
    handleNodeError,
    handleToolStart,
    handleToolProgress,
    handleToolEnd,
    handleToolError,
    handleLlmStart,
    handleLlmToken,
    handleLlmEnd,
    handleLlmError,
    handleAgentAction,
    handleAgentFinish
  ]);

  // ========================================
  // UNIFIED MESSAGE HANDLERS
  // ========================================
  
  /**
   * Handle all execution messages
   */
  const handleExecutionMessage = useCallback((message) => {
    console.log(`Execution [${message.subtype}]:`, message);
    
    switch (message.subtype) {
      case 'started':
      case 'start':
        handleExecutionStart(message);
        break;
      case 'progress':
        handleExecutionProgress(message);
        break;
      case 'end':
        handleExecutionEnd(message);
        break;
      case 'error':
        handleExecutionError(message);
        break;
      default:
        console.warn('Unknown execution subtype:', message.subtype, message);
    }
  }, [handleExecutionStart, handleExecutionProgress, handleExecutionEnd, handleExecutionError]);
  
  /**
   * Handle all node messages
   */
  const handleNodeMessage = useCallback((message) => {
    console.log(`Node [${message.subtype}]:`, message);
    
    switch (message.subtype) {
      case 'start':
        handleNodeStart(message);
        break;
      case 'progress':
        handleNodeProgress(message);
        break;
      case 'end':
        handleNodeEnd(message);
        break;
      case 'error':
        handleNodeError(message);
        break;
      default:
        console.warn('Unknown node subtype:', message.subtype, message);
    }
  }, [handleNodeStart, handleNodeProgress, handleNodeEnd, handleNodeError]);
  
  /**
   * Handle all tool messages
   */
  const handleToolMessage = useCallback((message) => {
    console.log(`Tool [${message.subtype}]:`, message);
    
    switch (message.subtype) {
      case 'start':
        handleToolStart(message);
        break;
      case 'progress':
        handleToolProgress(message);
        break;
      case 'end':
        handleToolEnd(message);
        break;
      case 'error':
        handleToolError(message);
        break;
      default:
        console.warn('Unknown tool subtype:', message.subtype, message);
    }
  }, [handleToolStart, handleToolProgress, handleToolEnd, handleToolError]);
  
  /**
   * Handle all LLM messages
   */
  const handleLlmMessage = useCallback((message) => {
    console.log(`LLM [${message.subtype}]:`, message);
    
    switch (message.subtype) {
      case 'start':
        handleLlmStart(message);
        break;
      case 'token':
        handleLlmToken(message);
        break;
      case 'end':
        handleLlmEnd(message);
        break;
      case 'error':
        handleLlmError(message);
        break;
      default:
        console.warn('Unknown LLM subtype:', message.subtype, message);
    }
  }, [handleLlmStart, handleLlmToken, handleLlmEnd, handleLlmError]);
  
  /**
   * Handle all agent messages
   */
  const handleAgentMessage = useCallback((message) => {
    console.log(`Agent [${message.subtype}]:`, message);
    
    switch (message.subtype) {
      case 'action':
        handleAgentAction(message);
        break;
      case 'finish':
        handleAgentFinish(message);
        break;
      default:
        console.warn('Unknown agent subtype:', message.subtype, message);
    }
  }, [handleAgentAction, handleAgentFinish]);

  // ========================================
  // SUBSCRIBE TO WEBSOCKET EVENTS (UNIFIED)
  // ========================================

  useEffect(() => {
    // Subscribe with sessionId (connection identifier)
    if (!sessionId) return;
    
    console.log('Subscribing to execution events for session:', sessionId, 'execution:', executionId);
  
    // Create stable handler wrapper that doesn't change
    const handlers = {
      execution: handleExecutionMessage,
      node: handleNodeMessage,
      tool: handleToolMessage,
      llm: handleLlmMessage,
      agent: handleAgentMessage,
      batch_update: handleBatchUpdate,
      execution_start: handleExecutionStart,
      node_start: handleNodeStart,
      node_error: handleNodeError,
      tool_start: handleToolStart
    };
    
    // Subscribe to all events
    Object.entries(handlers).forEach(([event, handler]) => {
      wsOn(event, handler);
    });
    
    // Cleanup
    return () => {
      console.log('Unsubscribing from execution events');
      Object.entries(handlers).forEach(([event, handler]) => {
        wsOff(event, handler);
      });
    };
  }, [
    sessionId, 
    executionId
    // Handlers intentionally omitted - they're captured in closure
  ]);

  // ========================================
  // DEBUG LOGGING
  // ========================================

  useEffect(() => {
    if (executionId) {
      console.log('Execution State:', {
        status,
        messages: messages.length,
        nodes: Object.keys(nodeStates),
        tools: Object.keys(toolStates),
        llms: Object.keys(llmStates),
        agents: Object.keys(agentStates),
        progress: progressPercentage + '%',
        thinking: currentStep?.thinking || false
      });
    }
  }, [executionId, status, messages.length, nodeStates, toolStates, llmStates, agentStates, progressPercentage, currentStep]);

  // ========================================
  // RESET FUNCTION
  // ========================================

  /**
   * Reset function - manually clear all state
   */
  const reset = useCallback(() => {
    console.log('Resetting execution progress');
    clearState();
    setStatus('idle');
  }, [clearState]);

  // ========================================
  // RETURN
  // ========================================

  return {
    status,
    messages,
    progressPercentage,
    currentStep,
    nodeStates,
    toolStates,
    nodeResults,
    llmStates,
    agentStates,
    reset
  };
};