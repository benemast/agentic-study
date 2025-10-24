// frontend/src/components/assistant/AIChat.jsx
import { captureException } from '../../config/sentry';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User, Lock, Edit2, Check, X, Zap, MessageSquare } from 'lucide-react';

import StreamingMessage from './StreamingMessage';
import ExecutionProgress from '../ExecutionProgress';

// Hooks
import { useSession } from '../../hooks/useSession';
import { useChat } from '../../hooks/useChat';
import { useWebSocketContext } from '../../providers/WebSocketProvider'; // ✅ NEW
import { useTracking } from '../../hooks/useTracking';
import { useWorkflowExecution } from '../../hooks/useWorkflowExecution';

// Services
import { wsClient } from '../../services/websocket'; // ✅ For event subscriptions

// Config
import { chatAPI } from '../../config/api';
import { AI_CONFIG, ERROR_MESSAGES } from '../../config/constants';

const AIChat = () => {
  // ========================================
  // HOOK USAGE
  // ========================================
  
  // Session identity
  const { sessionId } = useSession();
  
  // Chat messages (abstracted - no store access)
  const {
    messages: chatMessages,
    isStreaming: wsIsStreaming,
    streamingContent: wsStreamingContent,
    addMessage,
    updateMessage,
    clearChat,
    loadHistory,
    hasMessages,
    isLoadingHistory,
  } = useChat();
  
  // WebSocket connection (from provider - no direct store access)
  const { isConnected: isWebSocketConnected } = useWebSocketContext();
  
  // Tracking
  const { 
    trackMessageSent, 
    trackMessageReceived, 
    trackMessagesCleared,
    trackError 
  } = useTracking();
  
  // Workflow execution (for agent tasks)
  const { executeAgentTask, status: executionStatus } = useWorkflowExecution(sessionId, 'ai_assistant');

  // ========================================
  // LOCAL STATE
  // ========================================
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  
  // Local streaming state (for REST fallback)
  const [localIsStreaming, setLocalIsStreaming] = useState(false);
  const [localStreamingContent, setLocalStreamingContent] = useState('');
  
  // Refs
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamingMessageIndexRef = useRef(null);

  // ========================================
  // COMPUTED STATE
  // ========================================
  const isStreaming = wsIsStreaming || localIsStreaming;
  const streamingContent = wsStreamingContent || localStreamingContent;

  // ========================================
  // WEBSOCKET EVENT HANDLERS
  // ========================================
  
  useEffect(() => {
    // Only subscribe if WebSocket is connected
    if (!isWebSocketConnected) return;
    
    console.log('🔌 AIChat: Setting up WebSocket event listeners');

    // Listen for streaming chunks
    // Note: websocketStore already handles these globally and updates state
    // We just need to track analytics here
    const unsubStream = wsClient.on('chat_stream', (data) => {
      // Store already updated streamingContent via global subscription
      // Just track if needed
      if (data.full_content) {
        console.log('📨 Streaming:', data.full_content.length, 'chars');
      }
    });

    // Listen for completion
    const unsubComplete = wsClient.on('chat_complete', (data) => {
      console.log('✅ Chat complete received');
      
      // Track message received
      if (data.content) {
        const responseTime = data.metadata?.response_time_ms || 0;
        trackMessageReceived(data.content.length, responseTime);
      }

      // Reset local state
      setIsLoading(false);
      setLocalIsStreaming(false);
      streamingMessageIndexRef.current = null;
      
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    });

    // Listen for errors
    const unsubError = wsClient.on('chat_error', (data) => {
      console.error('❌ Chat error:', data.error);
      setError(data.error || ERROR_MESSAGES.API_ERROR);
      setIsLoading(false);
      setLocalIsStreaming(false);
      trackError('chat_websocket_error', data.error);
    });

    // Cleanup subscriptions on unmount or disconnect
    return () => {
      console.log('🔌 AIChat: Cleaning up WebSocket event listeners');
      unsubStream();
      unsubComplete();
      unsubError();
    };
  }, [isWebSocketConnected, trackMessageReceived, trackError]);

  // ========================================
  // LIFECYCLE
  // ========================================
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingContent]);

  // Load chat history on mount
    useEffect(() => {
    // Wait for session and WebSocket
    if (!sessionId) {
      console.log('📜 History: Waiting for session...');
      return;
    }
    
    if (!isWebSocketConnected) {
      console.log('📜 History: Waiting for WebSocket connection...');
      return;
    }
    
    // Check if we should load history
    const shouldLoadHistory = (
      !isLoadingHistory &&           // Not already loading
      chatMessages.length === 0      // No messages yet
    );
    
    console.log('📜 History check:', {
      sessionId,
      isWebSocketConnected,
      isLoadingHistory,
      messageCount: chatMessages.length,
      shouldLoadHistory
    });
    
    if (shouldLoadHistory) {
      console.log('📜 Loading chat history...');
      loadHistory()
        .then(() => console.log('✅ History loaded'))
        .catch(err => console.error('❌ Failed to load history:', err));
    }
    
  }, [sessionId, isWebSocketConnected, chatMessages.length, isLoadingHistory, loadHistory]);


  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ========================================
  // SEND MESSAGE
  // ========================================
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isStreaming || isLoading) return;
    if (!sessionId) {
      setError('Session not initialized');
      return;
    }

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Send via WebSocket if connected, otherwise REST
    if (isWebSocketConnected) {
      await sendMessageViaWebSocket(userMessage);
    } else {
      await sendMessageViaREST(userMessage);
    }
  };

  /**
   * Send message via WebSocket (preferred)
   */
  const sendMessageViaWebSocket = async (userMessage) => {
    addMessage(userMessage);
    setInput('');
    setError(null);

    trackMessageSent(userMessage.content.length);

    try {
      // Add placeholder for assistant response
      const placeholderMessage = {
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date().toISOString()
      };
      
      addMessage(placeholderMessage);
      streamingMessageIndexRef.current = chatMessages.length;

      // Get context for AI
      const contextMessages = chatMessages.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);
      
      // Send via wsClient
      await wsClient.sendChatMessage(userMessage.content, contextMessages);
      
      // WebSocket events will handle the response streaming
      
    } catch (err) {
      console.error('WebSocket send error:', err);
      
      captureException(err, {
        tags: { 
          error_type: 'chat_websocket_send_failed', 
          component: 'AIChat' 
        },
        contexts: {
          message_length: userMessage.content.length,
          history_count: chatMessages.length,
          session_id: sessionId,
        }
      });
      
      setError(err.message || ERROR_MESSAGES.API_ERROR);
      trackError('chat_send_error', err.message);
    }
  };

  /**
   * Send message via REST (fallback when WebSocket unavailable)
   */
  const sendMessageViaREST = async (userMessage) => {
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    setError(null);

    trackMessageSent(userMessage.content.length);

    // Add placeholder for streaming
    const assistantMessageIndex = chatMessages.length;
    const assistantMessage = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date().toISOString()
    };
    addMessage(assistantMessage);

    try {
      setLocalIsStreaming(true);
      setLocalStreamingContent('');
      streamingMessageIndexRef.current = assistantMessageIndex;

      const contextMessages = chatMessages.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);
      
      const response = await chatAPI.sendMessage(sessionId, {
        message: userMessage.content,
        context: contextMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const fullContent = response.response || response.content || '';
      
      // Update with final content
      updateMessage(assistantMessageIndex, {
        content: fullContent,
        isStreaming: false,
        timestamp: new Date().toISOString()
      });

      const responseTime = response.metadata?.response_time_ms || 0;
      trackMessageReceived(fullContent.length, responseTime);
      
      setIsLoading(false);
      setLocalIsStreaming(false);
      setLocalStreamingContent('');
      
      setTimeout(() => inputRef.current?.focus(), 100);

    } catch (err) {
      console.error('REST API error:', err);

      captureException(err, {
        tags: { 
          error_type: 'chat_rest_send_failed', 
          component: 'AIChat' 
        },
        contexts: {
          message_length: userMessage.content.length,
          history_count: chatMessages.length,
          session_id: sessionId,
        }
      });
      
      setError(err.message || ERROR_MESSAGES.API_ERROR);
      setIsLoading(false);
      setLocalIsStreaming(false);
      trackError('chat_rest_error', err.message);
    }
  };

  // ========================================
  // TASK EXECUTION
  // ========================================
  
  const executeTask = async (userMessage) => {
    addMessage(userMessage);
    setInput('');
    setError(null);

    trackMessageSent(userMessage.content.length);

    try {
      addMessage({
        role: 'system',
        content: '🤖 Agent is analyzing your request and planning the task execution...',
        timestamp: new Date().toISOString(),
        isSystemMessage: true
      });

      const contextMessages = chatMessages.slice(-5);
      
      await executeAgentTask(userMessage.content, {
        source: 'chat',
        context: contextMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to execute task:', error);
      captureException(error, {
        tags: {
          error_type: 'task_execution_failed',
          component: 'AIChat'
        },
        contexts: {
          message_length: userMessage.content.length,
          session_id: sessionId,
        }
      });
      
      setError(`Failed to execute task: ${error.message}`);
      trackError('task_execution_error', error.message);
    }
  };

  // ========================================
  // CLEAR HISTORY
  // ========================================

  const clearHistory = async () => {
    if (!sessionId || isStreaming) return;
    if (!confirm('Are you sure you want to clear the chat history?')) return;

    try {
      // Try WebSocket first
      if (isWebSocketConnected) {
        await wsClient.clearChat();
      } else {
        // Fallback to REST
        await chatAPI.clear(sessionId);
      }

      clearChat();
      trackMessagesCleared('chat_cleared');
      setError(null);
      setLocalStreamingContent('');
      streamingMessageIndexRef.current = null;
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError('Failed to clear history');
      trackError('chat_clear_failed', err.message);
    }
  };

  // ========================================
  // EDIT MESSAGE
  // ========================================

  const startEdit = (index) => {
    if (isStreaming || isLoading) return;
    setEditingIndex(index);
    setEditingContent(chatMessages[index].content);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingContent('');
  };

  const saveEdit = async () => {
    if (!editingContent.trim() || editingIndex === null) return;

    const editedMessage = chatMessages[editingIndex];

    if (editedMessage.role !== 'user') {
      setError('Only user messages can be edited');
      cancelEdit();
      return;
    }

    try {
      // Keep messages up to and including the edited one
      const messagesToKeep = chatMessages.slice(0, editingIndex + 1);
      messagesToKeep[editingIndex] = {
        ...messagesToKeep[editingIndex],
        content: editingContent.trim(),
        edited: true,
        editedAt: new Date().toISOString()
      };
      
      // Clear and re-add messages
      clearChat();
      messagesToKeep.forEach(msg => addMessage(msg));
      
      cancelEdit();

      // Regenerate response
      const editedUserMessage = { ...messagesToKeep[editingIndex], role: 'user' };
      
      if (isWebSocketConnected) {
        await sendMessageViaWebSocket(editedUserMessage);
      } else {
        await sendMessageViaREST(editedUserMessage);
      }

    } catch (err) {
      console.error('Failed to edit message:', err);
      setError('Failed to edit message');
      trackError('message_edit_failed', err.message);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-500">
              {isWebSocketConnected ? '🟢 Connected' : '🔴 Offline'}
            </p>
          </div>
        </div>

        <button
          onClick={clearHistory}
          disabled={!hasMessages || isStreaming}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear chat history"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {!hasMessages && !isLoading ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Welcome to AI Assistant
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Ask me anything! I can help analyze data, answer questions, and execute tasks for you.
            </p>
          </div>
        ) : (
          <>
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isSystemMessage
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}
                >
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editInputRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <Check className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="prose prose-sm max-w-none">
                        {message.isStreaming && !message.content ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )}
                      </div>
                      {message.role === 'user' && !isStreaming && (
                        <button
                          onClick={() => startEdit(index)}
                          className="mt-2 flex items-center gap-1 text-xs text-blue-100 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                      {message.edited && (
                        <p className="mt-1 text-xs opacity-70">(edited)</p>
                      )}
                    </>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming Message */}
            {isStreaming && streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-white text-gray-900 shadow-sm border border-gray-100">
                  <StreamingMessage content={streamingContent} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}

        {/* Execution Progress */}
        {executionStatus === 'running' && (
          <div className="mt-4">
            <ExecutionProgress />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isStreaming
                ? 'Please wait for response...'
                : 'Type your message...'
            }
            disabled={isStreaming || isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-blue-500/25"
          >
            {isLoading || isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {isWebSocketConnected ? '✓ Real-time mode' : '⚠ Offline mode (REST fallback)'}
        </p>
      </div>
    </div>
  );
};

export default AIChat;