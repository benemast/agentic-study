// CONSISTENTLY WOKRING NO TRANSLATION

// frontend/src/hooks/useExecutionStreaming.js

import { useState, useRef, useCallback } from 'react';
import { useExecutionProgress } from './useExecutionProgress';
import { getExecutionStatusMessage } from '../config/executionStatusMessages';

/**
 * Minimal execution streaming hook
 * 
 * Processes messages from useExecutionProgress via callback (not useEffect polling).
 * Adds MESSAGE_DELAY ms delay between messages for smooth streaming effect.
 * 
 * @param {string} sessionId - Session ID
 * @param {string} executionId - Execution ID (can be null initially)
 * @param {string} condition - 'ai_assistant' or 'workflow_builder'
 * @param {Object} options - Optional callbacks
 * @returns {Object} Streaming state and formatted content
 */

export const useExecutionStreaming = (sessionId, executionId, condition = 'ai_assistant', options = {}) => {
  const { onExecutionIdReceived, onCleanupComplete } = options;
  const MESSAGE_DELAY = 120

  // State
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Refs
  const messageQueueRef = useRef([]);
  const processingRef = useRef(false);
  const executionEndedRef = useRef(false);

  /**
   * Format a single message into display text
   */
  const formatMessage = useCallback((message) => {
    const { type, subtype, status, tool_id, tool_name, data = {} } = message;
    
    // Skip execution messages (used for lifecycle only)
    if (type === 'execution') {
      return null;
    }
    
    // Agent messages
    if (type === 'agent') {      
      if (subtype === 'chat' && data.content) {
        // Pure chat response - return full content, will overwrite everything
        return { content: data.content, overwrite: true };
      }
      
      if (subtype === 'progress' && status === 'decision') {
        if (data.decision) {
          return { content: data.decision + '\n', overwrite: false };
        }
      }
      
      if (subtype === 'end' && data.summary) {
        // Agent summary (last message)
        return { content: data.summary, overwrite: false };
      }
      
      // Fallback to template
      const msg = getExecutionStatusMessage('agent', subtype, status, data);
      return msg ? { content: msg, overwrite: false } : null;
    }
    
    // Tool messages
    // Use tool_id (backend key) with fallback to tool_name for backwards compatibility
    const toolIdentifier = tool_id;
    if (type === 'tool' && toolIdentifier) {
      // Remove node ID suffix (e.g., "show-results-14" → "show-results")
      const toolId = toolIdentifier.replace(/-\d+$/, '');
      const msg = getExecutionStatusMessage('tool', subtype, status, data, toolId);
      return msg ? { content: msg, overwrite: false } : null;
    }
    
    // Node messages
    if (type === 'node') {
      const nodeIdentifier = message.nodeId || message.node_id;
      // Remove node ID suffix (e.g., "load-reviews-14" → "load-reviews")
      const nodeId = nodeIdentifier ? nodeIdentifier.replace(/-\d+$/, '') : null;
      const msg = getExecutionStatusMessage('node', subtype, status, data, nodeId);
      return msg ? { content: msg, overwrite: false } : null;
    }    
    return null;
  }, []);

  /**
   * Process message queue with MESSAGE_DELAY ms delays
   */
  const processQueue = useCallback(() => {    
    if (processingRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    const processNext = () => {
      if (messageQueueRef.current.length === 0) {
        processingRef.current = false;
        
        // Check if execution ended and queue is empty
        if (executionEndedRef.current) {
          setIsStreaming(false);
          onCleanupComplete?.();
        }
        return;
      }

      const { content, overwrite } = messageQueueRef.current.shift();
      
      if (overwrite) {
        // Overwrite all content (for pure chat responses)
        setStreamedContent(content);
      } else {
        // Append content
        setStreamedContent(prev => prev ? `${prev}\n${content}` : content);
      }

      // Process next message after delay
      setTimeout(processNext, MESSAGE_DELAY);
    };

    processNext();
  }, [onCleanupComplete]);

  /**
   * Handle new message from useExecutionProgress
   * Called directly by useExecutionProgress when message is added
   */
  const handleNewMessage = useCallback((message) => {
    
    // Handle execution lifecycle
    if (message.type === 'execution') {
      if (message.subtype === 'start') {
        setIsStreaming(true);
        executionEndedRef.current = false;
        setStreamedContent(''); // Clear content on new execution
      } else if (message.subtype === 'end') {
        executionEndedRef.current = true;
        // Don't set isStreaming false here - wait for queue to empty
      }
      return;
    }

    // === FILTER OUT NOISE ===    
    // Skip agent start messages (not informative)
    if (message.type === 'agent' && message.subtype === 'start') {
      return;
    }
    
    // Skip node progress
    if (message.type === 'node' && message.subtype === 'progress') {    
      return;    
    }

    // Manage tool skips
    if (message.type === 'tool') {
      if(message.subtype === 'start' || message.subtype === 'end'){
        return;

      }else if(message.subtype === 'progress' 
        && !(['missing_data_complete', 'spam_complete', 'duplicates_complete', 'LLM_handoff'].includes(message.status))
      ){
        return;
      }
    }


    // Format and queue displayable messages
    const formatted = formatMessage(message);
    
    if (formatted) {
      messageQueueRef.current.push(formatted);
      // Start processing queue
      processQueue();
    } 
  }, [formatMessage, processQueue]);

  // Get raw execution progress with message callback
  const executionProgress = useExecutionProgress(sessionId, executionId, condition, {
    onExecutionIdReceived: (id) => {
      onExecutionIdReceived?.(id);
    },
    onMessageAdded: handleNewMessage
  });

  return {
    streamedContent,
    isStreaming,
    isComplete: executionProgress.status === 'completed',
    isFailed: executionProgress.status === 'failed',
    executionId: executionId,
    executionStatus: executionProgress.status,
    // Pass through summary data from executionProgress
    summaryData: executionProgress.summaryData,
    summaryAvailable: executionProgress.summaryAvailable,
  };
};