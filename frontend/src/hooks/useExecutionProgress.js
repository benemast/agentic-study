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

const isShowResultsNode = (message) => {
  const data = extractData(message);
  return (
    data.node_id?.startsWith('show-results') ||
    data.node_label === 'Show Results'
  );
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
  const [summaryData, setSummaryData] = useState(null);
  const [summaryAvailable, setSummaryAvailable] = useState(false);
  
  const { onExecutionIdReceived, onMessageAdded } = callbacks;

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
    
  if (onMessageAdded) {
    onMessageAdded(messageWithId);
  }
}, [onMessageAdded]);

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
    setSummaryData(null);
    setSummaryAvailable(false);
    startTimeRef.current = null;
    messageCounterRef.current = 0;
  }, []);

  // ========================================
  // EXECUTION LEVEL HANDLERS
  // ========================================

  const handleExecutionStart = useCallback((message) => {
    
    const data = extractData(message);
    const { execution_id } = data;
    
    // STEP 1: CAPTURE execution_id from WebSocket (PRIMARY SOURCE)
    // This must happen BEFORE the executionId check below!
    if (execution_id && !executionId && onExecutionIdReceived) {
      onExecutionIdReceived(execution_id);
    }
    
    // STEP 2: Filter out messages for other executions
    // Now that we've captured the ID, ignore messages that don't match
    if (executionId && message.execution_id !== executionId) {
      return;
    }
    
    // STEP 3: Update state
    setStatus('running');
    clearState(); // Clear previous execution data
    startTimeRef.current = Date.now();
    
    // STEP 4: Add message to timeline
    addMessage({
      type: 'execution',
      subtype: message.subtype || 'start',
      status: data.status || 'start',
      content: 'Execution started',
      step: data.step,
      total_steps: data.total_steps,
      data: data
    });
    
    // Smart notification with toast fallback
    notificationService.notifyExecutionStarted(
      executionId, 
      condition,
      (title, body) => toast.success(body || title)
    );
  }, [executionId, condition, clearState, addMessage, onExecutionIdReceived, startTimeRef]);
  /**
   * Handle execution_progress
   */
  const handleExecutionProgress = useCallback((message) => {
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    
    if (data.progress !== undefined) {
      setProgressPercentage(data.progress);
    }
    
    // Always add message (useExecutionStreaming will handle display)
    addMessage({
      type: 'execution',
      subtype: 'progress',
      status: data.status || 'running',
      content: data.message || '',
      progress: data.progress,
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle execution_end
   */
  const handleExecutionEnd = useCallback((message) => {
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
      status: 'completed',
      steps_completed: data.steps_completed,
      execution_time_ms: data.execution_time_ms,
      duration,
      data: data
    });
    
    // Smart notification with toast fallback
    notificationService.notifyExecutionCompleted(
      executionId, 
      condition, 
      duration,
      (title, body) => toast.success(body || title)
    );
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
      status: data.status || 'error',
      content: data.error || 'Execution failed',
      error_type: data.error_type,
      data: data
    });
    
    // Smart notification with toast fallback
    notificationService.notifyExecutionFailed(
      executionId, 
      condition, 
      data.error,
      (title, body) => toast.error(body || title)
    );
  }, [executionId, condition, addMessage]);

  // ========================================
  // NODE LEVEL HANDLERS (Workflow Builder)
  // ========================================

  /**
   * Handle node_start
   */
  const handleNodeStart = useCallback((message) => {
    
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
      status: message.status || data.status || 'start',
      content: `${node_label}: started`,
      step: step_number,
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle node_progress
   */
  const handleNodeProgress = useCallback((message) => {
    
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
    
    // Always add message (useExecutionStreaming will handle display)
    addMessage({
      type: 'node',
      subtype: 'progress',
      nodeId: node_id,
      nodeLabel: node_label,
      status: message.status || data.status || 'running',
      content: data.message || '',
      step: step_number,
      progress,
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle node_end
   */ 
  const handleNodeEnd = useCallback((message) => {
    
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
    
    // Check if this is a Show Results node completion with results
    if (finalStatus === 'completed' && isShowResultsNode(message)) {
      
      // Backend path: data.results.data.sections
      const sections = results?.data?.sections;
      const metadata = results?.data?.metadata;
      
      if (sections) {
        setSummaryData({
          sections: sections,
          metadata: metadata || {
            total_records: 0,
            processed_at: new Date().toISOString()
          }
        });
        setSummaryAvailable(true);
        
        // Optional: trigger callback if provided
        if (callbacks.onSummaryAvailable) {
          callbacks.onSummaryAvailable({
            sections: sections,
            metadata: metadata,
            nodeId: node_id,
            executionId
          });
        }
      } else {
        console.warn('Show Results completed but no sections data found');
        console.warn('Expected at: data.results.data.sections');
        console.warn('Got results:', results);
      }
    }

    addMessage({
      type: 'node',
      subtype: 'end',
      nodeId: node_id,
      nodeLabel: node_label,
      status: message.status || data.status || 'completed',
      content: `${node_label}: completed`,
      step: step_number,
      data: data
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
      return updatedResults;
    });
    
    addMessage({
      type: 'node',
      subtype: 'error',
      nodeId: node_id,
      nodeLabel: node_label,
      status: message.status || data.status || 'error',
      content: `${node_label}: ${error}`,
      error,
      error_type,
      step: step_number,
      data: data
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
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_id, tool_name, status, execution_id: exec_id, timestamp, ...templateFields } = data;
    
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
      tool_id: tool_id,
      toolName: tool_name,
      tool_name: tool_name,
      status: status || 'start',
      data: templateFields,  // Only pass fields needed for templates
      content: `${tool_name}: started`,
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle tool_progress
   */
  const handleToolProgress = useCallback((message) => {
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_id, tool_name, progress, status, execution_id: exec_id, timestamp, message: msg, content, ...templateFields } = data;
    
    setToolStates(prev => ({
      ...prev,
      [tool_name]: {
        ...prev[tool_name],
        progress,
        status: 'running'
      }
    }));
    
    // Always add message (useExecutionStreaming will handle display)
    addMessage({
      type: 'tool',
      subtype: 'progress',
      tool_id: tool_id,
      toolName: tool_name,
      tool_name: tool_name,
      status: status || 'running',
      data: templateFields,  // Only pass fields needed for templates
      content: msg || content || '',  // Empty string if no content
      progress:progress,
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle tool_end
   */
  const handleToolEnd = useCallback((message) => {
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_id, tool_name, execution_time_ms, output_length, node_id, error, status, 
            execution_id: exec_id, timestamp, success, results, ...templateFields } = data;
    
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
      tool_id: tool_id, 
      toolName: tool_name,
      tool_name: tool_name,
      status: status || 'completed',
      data: templateFields,  // Only pass fields needed for templates
      content: `${tool_name}: ${error ? 'failed' : 'completed'}`,
      execution_time_ms:execution_time_ms,
      output_length:output_length,
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle tool_error
   */
  const handleToolError = useCallback((message) => {
    console.error('Tool error:', message);
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = extractData(message);
    const { tool_id, tool_name, error, status, execution_id: exec_id, timestamp, ...templateFields } = data;
    
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
      tool_id: tool_id,
      toolName: tool_name,
      tool_name: tool_name,
      status: status || 'error',
      data: templateFields,  // Only pass fields needed for templates
      content: error,
      error: error,
      data: data
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
      step: step_number,
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle llm_new_token / agent_thinking / sentiment_analysis_progress / insight_thinking / tool_progress
   * These are all token streaming events with different names
   */
  const handleLlmToken = useCallback((message) => {
    
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
      step: step_number,
      data: data
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
      error:error,
      data: data
    });
    
    toast.error(`LLM error: ${tool_name}`);
  }, [executionId, addMessage]);

  // ========================================
  // AGENT LEVEL HANDLERS (AI Assistant)
  // ========================================

  /**
   * Handle agent_action
   */
  const handleAgentProgress = useCallback((message) => {
    
    if (executionId && message.execution_id !== executionId) return;
    
    const data = message.data;
    const status = message.status;
    
    const actionKey = `"progress"_${Date.now()}`;
    
    setAgentStates(prev => ({
      ...prev,
      [actionKey]: {
        type: '"progress"',
        data,
        status,
        timestamp: Date.now()
      }
    }));

    setCurrentStep(null);

    addMessage({
      type: 'agent',
      subtype: 'progress',
      status: status || 'running',
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle agent_finish
   */
  const handleAgentEnd = useCallback((message) => {
    if (executionId && message.execution_id !== executionId) return;
    
    const data = message.data
    
    setAgentStates(prev => ({
      ...prev,
      finish: {
        type: 'end',
        data,
        timestamp: Date.now()
      }
    }));
    
    setCurrentStep(null);
    
    addMessage({
      type: 'agent',
      subtype: 'end',
      status: status || 'completed',
      data: data
    });
  }, [executionId, addMessage]);

  /**
   * Handle agent_chat (conversational AI responses)
   */
  const handleAgentChat = useCallback((message) => {
    if (executionId && message.execution_id !== executionId) return;
    
    const data = message.data


    setAgentStates(prev => ({
      ...prev,
      chat: {
        type: 'chat',
        data,
        timestamp: Date.now()
      }
    }));
    
    setCurrentStep(null);
  
    addMessage({
      type: 'agent',
      subtype: 'chat',
      status: message.status || 'complete',
      data: data
    });
  }, [executionId, addMessage]);

  // ========================================
  // BATCH UPDATES
  // ========================================

  /**
   * Handle batch_update - supports both old and new unified format
   */
  const handleBatchUpdate = useCallback((message) => {
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
    handleAgentProgress,
    handleAgentEnd
  ]);

  // ========================================
  // UNIFIED MESSAGE HANDLERS
  // ========================================
  
  /**
   * Handle all execution messages
   */
  const handleExecutionMessage = useCallback((message) => {
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
    switch (message.subtype) {
      case 'chat':
        handleAgentChat(message);
        break;
      case 'start':
        //handleAgentProgress(message);
        break;
      case 'progress':
        handleAgentProgress(message);
        break;
      case 'end':
        handleAgentEnd(message);
        break;
      default:
        console.warn('Unknown agent subtype:', message.subtype, message);
    }
  }, [handleAgentChat, handleAgentProgress, handleAgentEnd]);

  // ========================================
  // SUBSCRIBE TO WEBSOCKET EVENTS (UNIFIED)
  // ========================================

  useEffect(() => {
    // Subscribe with sessionId (connection identifier)
    if (!sessionId) return;
    
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
  // RESET FUNCTION
  // ========================================

  /**
   * Reset function - manually clear all state
   */
  const reset = useCallback(() => {
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
    summaryData,
    summaryAvailable,
    reset
  };
};