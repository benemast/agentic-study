// frontend/src/hooks/useExecutionStreaming.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { useExecutionProgress } from './useExecutionProgress';
import { notificationService } from '../services/notificationService';
import { getExecutionStatusMessage } from '../config/executionStatusMessages';

/**
 * Hook for streaming execution progress into conversational chat interface
 * 
 * Accumulates status messages as an array of lines. Typing animation is handled
 * by the StreamingMessage component using react-type-animation.
 * 
 * @param {string} sessionId - Session ID
 * @param {string} executionId - Execution ID (can be null initially)
 * @param {string} condition - 'ai_assistant' only
 * @param {Object} options - Optional callbacks
 * @param {Function} options.onExecutionIdReceived - Callback when execution_id is received
 * @returns {Object} Streaming state and formatted content
 */
export const useExecutionStreaming = (sessionId, executionId, condition = 'ai_assistant', options = {}) => {
  const { onExecutionIdReceived } = options;
  
  // Get raw execution progress with callback forwarding
  const executionProgress = useExecutionProgress(sessionId, executionId, condition, {
    onExecutionIdReceived: (id) => {
      console.log('🆔 useExecutionStreaming received execution_id from WebSocket:', id);
      onExecutionIdReceived?.(id);
    }
  });
  
  // Streaming state
  const [streamedContent, setStreamedContent] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [finalReportUrl, setFinalReportUrl] = useState(null);
  const [isChatResponse, setIsChatResponse] = useState(false);
  
  // Content management
  const currentNodeRef = useRef(null);
  const currentToolRef = useRef(null);
  const processedMessageCountRef = useRef(0);
  
  /**
   * Add a new status line
   */
  const addStatusLine = useCallback((message) => {
    console.log('➕ Adding status line:', message);
    setStreamedContent(prev => [...prev, message]);
  }, []);
  
  /**
   * Update the last status line (replace it)
   */
  const updateLastStatusLine = useCallback((message) => {
    console.log('🔄 Updating last status line:', message);
    setStreamedContent(prev => {
      if (prev.length === 0) return [message];
      const updated = [...prev];
      updated[updated.length - 1] = message;
      return updated;
    });
  }, []);
  
  /**
   * Overwrite all content (for chat responses)
   */
  const overwriteContent = useCallback((message) => {
    console.log('✏️ Overwriting content with chat response');
    setStreamedContent([message]);
  }, []);
  
  /**
   * Handle execution messages
   */
  const handleExecutionMessage = useCallback((message) => {
    console.log('🎬 Execution message:', message.subtype, message);
    
    switch (message.subtype) {
      case 'start':
        setIsStreaming(true);
        console.log('Execution started, waiting for agent...');
        break;
        
      case 'end':
        setIsStreaming(false);
        addStatusLine('✅ Analysis complete!');
        
        // Send desktop notification
        notificationService.notifyExecutionCompleted(
          executionId,
          condition,
          message.execution_time_ms
        );
        break;
    }
  }, [executionId, condition, addStatusLine]);
  
  /**
   * Handle node messages
   */
  const handleNodeMessage = useCallback((message) => {
    console.log('📦 Node message:', message.subtype, message);
    
    const { subtype, data } = message;
    
    // Extract node info (support all naming conventions)
    const node_id = message.nodeId || message.node_id || message['node-id'] ||
                    data?.nodeId || data?.node_id || data?.['node-id'];
    
    const node_label = message.nodeLabel || message.node_label || message['node-label'] ||
                      data?.nodeLabel || data?.node_label || data?.['node-label'];
    
    const node_type = message.nodeType || message.node_type || message['node-type'] ||
                     data?.nodeType || data?.node_type || data?.['node-type'];
    
    const status = message.status || data?.status;
    const state = message.state || data?.state;
    const messageStatus = status || state || null;
    const messageType = node_type || node_id;
    
    // Extract template data
    const templateData = data ? { ...data } : {};
    ['node_id', 'nodeId', 'node-id', 'node_label', 'nodeLabel', 'node-label',
     'node_type', 'nodeType', 'node-type', 'status', 'state', 'execution_id',
     'executionId', 'execution-id', 'timestamp', 'step_number', 'stepNumber',
     'step-number'].forEach(key => delete templateData[key]);
    
    console.log(`  🔍 Node: ${node_id} (${node_label}), Status: ${messageStatus || 'none'}`);
    
    switch (subtype) {
      case 'start':
        if (messageType) {
          currentNodeRef.current = messageType;
          const statusMessage = getExecutionStatusMessage(messageType, 'start', messageStatus, templateData)
            || `⚙️ ${node_label || 'Processing'} started...`;
          addStatusLine(statusMessage);
        }
        break;
        
      case 'progress':
        if (currentNodeRef.current === messageType) {
          const statusMessage = getExecutionStatusMessage(messageType, 'progress', messageStatus, templateData)
            || `⚙️ ${node_label || 'Processing'}...`;
          updateLastStatusLine(statusMessage);
        }
        break;
        
      case 'end':
        if (currentNodeRef.current === messageType) {
          const statusMessage = getExecutionStatusMessage(messageType, 'end', messageStatus, templateData)
            || `✓ ${node_label || 'Step'} completed`;
          updateLastStatusLine(statusMessage);
          currentNodeRef.current = null;
        }
        break;
        
      case 'error':
        if (currentNodeRef.current === messageType) {
          const errorMessage = data?.error || message.error || 'Unknown error';
          const statusMessage = getExecutionStatusMessage(messageType, 'error', messageStatus, templateData) 
            || `❌ ${node_label || 'Step'} failed: ${errorMessage}`;
          addStatusLine(statusMessage);
          currentNodeRef.current = null;
        }
        break;
    }
  }, [addStatusLine, updateLastStatusLine]);
  
  /**
   * Handle tool messages
   */
  const handleToolMessage = useCallback((message) => {
    console.log('🔧 Tool message:', message.subtype, message);
    
    const { subtype, data } = message;
    
    // Extract tool name (support all naming conventions)
    const tool_name = message.toolName || message.tool_name || message['tool-name'] ||
                      data?.toolName || data?.tool_name || data?.['tool-name'];
    
    if (!tool_name) {
      console.warn('Tool message missing tool name:', message);
      return;
    }
    
    const status = message.status || data?.status;
    const state = message.state || data?.state;
    const messageStatus = status || state || null;
    const messageContent = message.content || message.message || data?.content || data?.message;
    
    // Extract template data
    const templateData = data ? { ...data } : {};
    ['tool_name', 'toolName', 'tool-name', 'status', 'state', 'execution_id',
     'executionId', 'execution-id', 'timestamp', 'message', 'content', 'progress',
     'success', 'results'].forEach(key => delete templateData[key]);
    
    // Normalize tool name
    const toolType = tool_name.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    
    console.log(`  🔍 Tool: ${tool_name} → ${toolType}, Status: ${messageStatus || 'none'}`);
    
    switch (subtype) {
      case 'start':
        currentToolRef.current = toolType;
        const startMessage = getExecutionStatusMessage(toolType, 'start', messageStatus, templateData)
          || messageContent
          || `🔧 ${tool_name} starting...`;
        addStatusLine(startMessage);
        break;
        
      case 'progress':
        if (currentToolRef.current === toolType) {
          const progressMessage = messageContent || 
            getExecutionStatusMessage(toolType, 'progress', messageStatus, templateData) ||
            `⚙️ ${tool_name} running...`;
          updateLastStatusLine(progressMessage);
        }
        break;
        
      case 'end':
        if (currentToolRef.current === toolType) {
          const endMessage = messageContent ||
            getExecutionStatusMessage(toolType, 'end', messageStatus, templateData) ||
            `✓ ${tool_name} completed`;
          updateLastStatusLine(endMessage);
          currentToolRef.current = null;
        }
        break;
        
      case 'error':
        if (currentToolRef.current === toolType) {
          const error = data?.error || message.error || 'Unknown error';
          const errorMessage = getExecutionStatusMessage(toolType, 'error', messageStatus, templateData)
            || `❌ ${tool_name} failed: ${error}`;
          addStatusLine(errorMessage);
          currentToolRef.current = null;
        }
        break;
    }
  }, [addStatusLine, updateLastStatusLine]);
  
  /**
   * Handle agent messages (minimal - just log)
   */
  const handleAgentMessage = useCallback((message) => {
    console.log('🤖 Agent message:', message.subtype, message);
  }, []);
  
  /**
   * Handle LLM messages (minimal - just log)
   */
  const handleLlmMessage = useCallback((message) => {
    console.log('🧠 LLM message:', message.subtype, message);
  }, []);
  
  /**
   * Handle response messages (chat responses)
   */
  const handleResponseMessage = useCallback((message) => {
    console.log('💬 Response message:', message);
    
    if (message.content) {
      overwriteContent(message.content);
      setIsChatResponse(true);
      setIsStreaming(false);
    }
  }, [overwriteContent]);
  
  /**
   * Process new messages from execution progress
   */
  useEffect(() => {
    if (!executionProgress.messages) return;
    
    // Get all NEW messages since last check
    const newMessages = executionProgress.messages.slice(processedMessageCountRef.current);
    
    if (newMessages.length === 0) return;
    
    console.log(`🔥 Processing ${newMessages.length} new messages`);
    
    // Process each message immediately (no queue needed!)
    newMessages.forEach(message => {
      switch (message.type) {
        case 'execution':
          handleExecutionMessage(message);
          break;
        case 'agent':
          handleAgentMessage(message);
          break;
        case 'node':
          handleNodeMessage(message);
          break;
        case 'tool':
          handleToolMessage(message);
          break;
        case 'llm':
          handleLlmMessage(message);
          break;
        case 'response':
          handleResponseMessage(message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    });
    
    // Update processed count
    processedMessageCountRef.current = executionProgress.messages.length;
  }, [
    executionProgress.messages,
    handleExecutionMessage,
    handleAgentMessage,
    handleNodeMessage,
    handleToolMessage,
    handleLlmMessage,
    handleResponseMessage
  ]);
  
  /**
   * Reset on new execution
   */
  useEffect(() => {
    if (executionId) {
      setStreamedContent([]);
      setIsStreaming(false);
      setIsChatResponse(false);
      setFinalReportUrl(null);
      currentNodeRef.current = null;
      currentToolRef.current = null;
      processedMessageCountRef.current = 0;
      console.log('🔄 Reset for new execution:', executionId);
    }
  }, [executionId]);
  
  return {
    streamedContent: streamedContent,
    isStreaming,
    isComplete: executionProgress.status === 'completed',
    isFailed: executionProgress.status === 'failed',
    finalReportUrl,
    isChatResponse,
    executionStatus: executionProgress.status
    };
};