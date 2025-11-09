// frontend/src/components/assistant/AIChat.jsx

import { captureException } from '../../config/sentry';
import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User, Edit2, Check, X, Zap, MessageSquare, FileText } from 'lucide-react';

import StreamingMessage from './StreamingMessage';
// Hooks
import { useSession } from '../../hooks/useSession';
import { useSessionData } from '../../hooks/useSessionData';
import { useChat } from '../../hooks/useChat';
import { useWebSocketContext } from '../../providers/WebSocketProvider';
import { useTracking } from '../../hooks/useTracking';
import { useTranslation } from '../../hooks/useTranslation';
import { useExecutionStreaming } from '../../hooks/useExecutionStreaming';

// Services
import { wsClient } from '../../services/websocket';
import { chatAPI, orchestratorAPI } from '../../services/api';
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
    addMessage,
    updateMessage,
    clearChat,
    loadHistory,
    hasMessages,
    isLoadingHistory,
  } = useChat();
  
  const {
    getStudyProgress
  } = useSessionData();
  
  const studyProgress = getStudyProgress();
  
  // Guard: Wait for session to fully initialize before accessing config
  // This prevents crashes when component renders before session data loads
  if (!studyProgress?.config) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }
  
  const currentTaskKey = studyProgress.task1Completed ? 'task2' : 'task1';
  const studyDataset = studyProgress.config[currentTaskKey].dataset;

  // WebSocket connection (from provider - no direct store access)
  const { isConnected: isWebSocketConnected } = useWebSocketContext();
  
  // Tracking
  const { 
    trackMessageSent, 
    trackMessageReceived, 
    trackMessagesCleared,
    trackError 
  } = useTracking();
  
  // Translation
  const { t, currentLanguage } = useTranslation();

  // ========================================
  // LOCAL STATE
  // ========================================
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsExecutionId, setResultsExecutionId] = useState(null);
  const [executionId, setExecutionId] = useState(null);
  
  // Refs
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamingMessageIndexRef = useRef(null);

  // Execution streaming (transforms execution progress into chat content)
  const {
    streamedContent: executionStreamedContent,
    isStreaming: isExecutionStreaming,
    smoothProgress,
    finalReportUrl,
    isComplete: streamingComplete,
    isFailed: isExecutionFailed,
    toolStates,
  } = useExecutionStreaming(sessionId, executionId, 'ai_assistant', {
    // Capture execution_id from WebSocket (primary source)
    onExecutionIdReceived: (id) => {
      console.log('🆔 AIChat received execution_id from WebSocket:', id);
      setExecutionId(id);
    }
  });

  // ========================================
  // COMPUTED STATE
  // ========================================
  const isStreaming = isExecutionStreaming || isLoading;

  /**
   * Update streaming message content as it arrives
   */
  const updateMessageRef = useRef(updateMessage);
  updateMessageRef.current = updateMessage;
  
  // Track if streaming has completed to prevent unnecessary effect runs
  const streamingCompletedRef = useRef(false);
  
  useEffect(() => {
    // Don't update if streaming is complete
    if (streamingComplete) {
      streamingCompletedRef.current = true;
      return;
    }
    
    // Don't run if we've already marked as complete
    if (streamingCompletedRef.current) {
      return;
    }
    
    if (isExecutionStreaming && streamingMessageIndexRef.current !== null && executionStreamedContent) {
      // Update message with current streamed content
      updateMessageRef.current(streamingMessageIndexRef.current, {
        content: executionStreamedContent,
        isStreaming: true,
        isExecutionMessage: true,
        progressPercentage: smoothProgress,
        timestamp: new Date().toISOString()
      });
    }
  }, [executionStreamedContent, isExecutionStreaming, smoothProgress, streamingComplete]);
  
  /**
   * Handle execution completion
   */
  const updateMessageCompletionRef = useRef(updateMessage);
  updateMessageCompletionRef.current = updateMessage;
  
  // Track if we've already finalized completion
  const completionFinalizedRef = useRef(false);

  useEffect(() => {
    // Only finalize once
    if (completionFinalizedRef.current) {
      return;
    }
    
    if (streamingComplete && streamingMessageIndexRef.current !== null) {
      console.log('✅ Execution complete, finalizing message');
      
      // Mark as finalized to prevent re-runs
      completionFinalizedRef.current = true;
      
      // Update message with final content
      updateMessageCompletionRef.current(streamingMessageIndexRef.current, {
        content: executionStreamedContent,
        isStreaming: false,
        isExecutionMessage: true,
        executionComplete: true,
        executionId: executionId,
        reportUrl: finalReportUrl,
        timestamp: new Date().toISOString()
      });
      
      // Calculate total character count from array
      const totalChars = Array.isArray(executionStreamedContent) 
        ? executionStreamedContent.join('').length 
        : executionStreamedContent?.length || 0;
      trackMessageReceived(totalChars, null);
      
      // Reset state
      streamingMessageIndexRef.current = null;
      setIsLoading(false);
      
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [streamingComplete, executionStreamedContent, executionId, finalReportUrl, trackMessageReceived]);

  /**
   * Handle execution failures
   */
  const updateMessageFailureRef = useRef(updateMessage);
  updateMessageFailureRef.current = updateMessage;
  
  // Track if we've already handled failure
  const failureHandledRef = useRef(false);

  useEffect(() => {
    // Only handle failure once
    if (failureHandledRef.current) {
      return;
    }
    
    if (isExecutionFailed && streamingMessageIndexRef.current !== null) {
      console.error('❌ Execution failed');
      
      // Mark as handled
      failureHandledRef.current = true;
      
      // Update message with error
      updateMessageFailureRef.current(streamingMessageIndexRef.current, {
        content: executionStreamedContent + '\n\n⚠️ **Execution Failed**\nAn error occurred during analysis. Please try again.',
        isStreaming: false,
        isExecutionMessage: true,
        executionFailed: true,
        timestamp: new Date().toISOString()
      });
      
      // Reset state
      streamingMessageIndexRef.current = null;
      setIsLoading(false);
      setError('Execution failed. Please try again.');
    }
  }, [isExecutionFailed, executionStreamedContent]);

  // ========================================
  // AUTO-SCROLL
  // ========================================
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isStreaming]);

  // ========================================
  // LOAD HISTORY ON MOUNT
  // ========================================
  
  useEffect(() => {
    if (sessionId && !hasMessages && !isLoadingHistory) {
      console.log('📚 Loading chat history...');
      loadHistory();
    }
  }, [sessionId, hasMessages, isLoadingHistory, loadHistory]);

  // ========================================
  // MESSAGE SENDING
  // ========================================
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !isWebSocketConnected) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message immediately
    const userIndex = chatMessages.length;
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    trackMessageSent(userMessage.length, 'user_query');

    try {
      setIsLoading(true);
      
      // Reset streaming state for new execution
      streamingCompletedRef.current = false;
      completionFinalizedRef.current = false;
      failureHandledRef.current = false;
      
      // Add placeholder for assistant response
      const assistantIndex = userIndex + 1;
      streamingMessageIndexRef.current = assistantIndex;
      
      addMessage({
        role: 'assistant',
        content: '',
        isStreaming: true,
        isExecutionMessage: true,
        timestamp: new Date().toISOString()
      });

      // Get context for AI
      const contextMessages = chatMessages.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);

      // Prepare input data with all required fields
      const input_data = {
        session_id: sessionId,
        category: studyDataset,
        language: currentLanguage,
        context: contextMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        timestamp: new Date().toISOString()
      };

      // Send via agent_execute - Direct API call
      const result = await orchestratorAPI.executeAgent(
        sessionId,
        userMessage,
        input_data
      );

      // Capture execution ID from response
      if (result && result.execution_id) {
        setExecutionId(result.execution_id);
        console.log('✅ Agent task started:', result.execution_id);
      }

      console.log('✅ Agent execution request sent:', result);

    } catch (err) {
      console.error('❌ Failed to send message:', err);
      
      const errorMessage = err.response?.data?.detail || err.message || ERROR_MESSAGES.SEND_FAILED;
      setError(errorMessage);
      
      // Update the placeholder message with error
      if (streamingMessageIndexRef.current !== null) {
        updateMessage(streamingMessageIndexRef.current, {
          content: '⚠️ **Error**\n\nFailed to process your request. Please try again.',
          isStreaming: false,
          isExecutionMessage: false,
          timestamp: new Date().toISOString()
        });
        streamingMessageIndexRef.current = null;
      }
      
      setIsLoading(false);
      
      trackError('MESSAGE_SEND_FAILED', {
        error: err.message,
        status: err.response?.status
      });

      captureException(err, {
        tags: {
          error_type: 'message_send_failed',
          condition: 'ai_assistant'
        },
        extra: {
          messageLength: userMessage.length,
          sessionId
        }
      });
    }
  };

  // ========================================
  // MESSAGE EDITING
  // ========================================
  
  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingContent(chatMessages[index].content);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = async () => {
    if (!editingContent.trim()) {
      cancelEdit();
      return;
    }

    const updatedMessage = {
      ...chatMessages[editingIndex],
      content: editingContent,
      edited: true
    };

    updateMessage(editingIndex, updatedMessage);
    
    // Save to backend
    try {
      await chatAPI.saveMessages(sessionId, [{
        role: updatedMessage.role,
        content: updatedMessage.content,
        timestamp: updatedMessage.timestamp
      }]);
    } catch (err) {
      console.error('Failed to save edited message:', err);
      captureException(err, {
        tags: {
          error_type: 'message_edit_failed',
          condition: 'ai_assistant'
        }
      });
    }

    trackMessageSent(editingContent.length, 'edited_message');
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingContent('');
  };

  // ========================================
  // CHAT ACTIONS
  // ========================================
  
  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear the chat history?')) return;
    
    try {
      await clearChat();
      trackMessagesCleared(chatMessages.length);
    } catch (err) {
      console.error('Failed to clear chat:', err);
      setError('Failed to clear chat history');
      
      captureException(err, {
        tags: {
          error_type: 'clear_chat_failed',
          condition: 'ai_assistant'
        }
      });
    }
  };

  // ========================================
  // KEYBOARD HANDLING
  // ========================================
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // ========================================
  // REPORT HANDLING
  // ========================================
  
  const handleReportClick = (executionId) => {
    setResultsExecutionId(executionId);
    setShowResultsModal(true);
  };

  // ========================================
  // RENDER
  // ========================================
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg transition-colors">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-lg shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">AI Assistant</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Autonomous analysis powered by AI</p>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            disabled={!hasMessages || isStreaming}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear chat history"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
          <span className="font-semibold">Error:</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasMessages && !isLoadingHistory && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-2xl shadow-lg mb-4">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Welcome to AI Assistant
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              I can help you analyze customer reviews, generate insights, and answer questions about your data. What would you like to explore?
            </p>
          </div>
        )}

        {isLoadingHistory && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading conversation...</span>
          </div>
        )}

        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role !== 'user' && !message.isSystemMessage && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white shadow-md'
                  : message.isSystemMessage
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 italic'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm'
              }`}
            >
              {editingIndex === index ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={editInputRef}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm"
                    >
                      <Check className="w-4 h-4" /> Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              ) : message.isStreaming ? (
              <>
                {/* DEBUG LOG */}
                {console.log('🔍 DEBUG StreamingMessage:', {
                  isExecutionMessage: message.isExecutionMessage,
                  executionStreamedContent: executionStreamedContent,
                  executionStreamedContentType: Array.isArray(executionStreamedContent) ? 'array' : typeof executionStreamedContent,
                  executionStreamedContentLength: executionStreamedContent?.length,
                  messageContent: message.content
                })}
                <StreamingMessage 
                  content={message.isExecutionMessage ? executionStreamedContent : message.content} 
                  isStreaming={true}
                />
              </>
            ) : (
                <>
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  
                  {/* Report Link (if execution complete) */}
                  {message.reportUrl && message.executionId && (
                    <button
                      onClick={() => handleReportClick(message.executionId)}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors w-full justify-center"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">View Full Report</span>
                    </button>
                  )}
                  
                  {message.role === 'user' && !isStreaming && (
                    <button
                      onClick={() => startEdit(index)}
                      className="mt-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:underline"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  )}
                </>
              )}
              
              {message.timestamp && (
                <div className={`text-xs mt-1 ${
                  message.role === 'user' 
                    ? 'text-blue-200 dark:text-blue-300' 
                    : 'text-gray-500 dark:text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming 
                ? "AI is working..." 
                : isWebSocketConnected
                ? "Ask me anything about your data... (Shift+Enter for new line)"
                : "Waiting for connection..."
            }
            disabled={isStreaming || isLoading || !isWebSocketConnected}
            rows={3}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-all resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || isLoading || !isWebSocketConnected}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl self-end"
          >
            {isStreaming || isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span>Powered by AI Assistant with autonomous task execution • Press Enter to send, Shift+Enter for new line</span>
        </div>
      </form>

      {/* Results Modal */}
      {showResultsModal && resultsExecutionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Execution Results</h3>
              <button 
                onClick={() => setShowResultsModal(false)} 
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              <p>Execution ID: {resultsExecutionId}</p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                TODO: Integrate with your existing results display component
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;