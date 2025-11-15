// frontend/src/components/assistant/AIChat.jsx

import { captureException } from '../../config/sentry';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, Loader2, Bot, User, MessageSquare, FileText } from 'lucide-react';

import StreamingMessage from './StreamingMessage';
import { sanitizeMessageForLLM } from '../../utils/messageSanitizer';
import SummaryModal from '../study/SummaryModal';

// Hooks
import { useSession } from '../../hooks/useSession';
import { useSessionData } from '../../hooks/useSessionData';
import { useChat } from '../../hooks/useChat';
import { useWebSocketContext } from '../../providers/WebSocketProvider';
import { useTracking } from '../../hooks/useTracking';
import { useTranslation } from '../../hooks/useTranslation';
import { useExecutionStreaming } from '../../hooks/useExecutionStreaming';

// Services
import { orchestratorAPI, chatAPI } from '../../services/api';
import { AI_CONFIG, ERROR_MESSAGES } from '../../config/constants';

const AIChat = ({ summaryHook }) => {
  // ========================================
  // HOOKS
  // ========================================
  
  // Destructure summary hook from parent (for completion guard)
  const { 
    markAsViewed,
    handleExecutionComplete: notifyParentOfSummary,
    createSummary,
    summaryData: parentSummaryData,
    summaryAvailable: parentSummaryAvailable
  } = summaryHook || {};
  
  const { sessionId } = useSession();
  const { getStudyProgress} = useSessionData();
  const studyProgress = getStudyProgress();

  // Guard: Wait for session
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

  const { isConnected: isWebSocketConnected } = useWebSocketContext();
  const { 
    trackMessageSent, 
    trackMessageReceived, 
    trackMessagesCleared,
    trackError,
    trackClick,
    track 
  } = useTracking();
  const { t, currentLanguage } = useTranslation();
  
  const {
    messages: chatMessages,
    addMessage,
    updateMessage,
    clearChat,
    hasMessages,
  } = useChat();

  // ========================================
  // STATE
  // ========================================
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executionId, setExecutionId] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  // Refs
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamingMessageIndexRef = useRef(null);
  const streamedContentRef = useRef('');

  // ========================================
  // EXECUTION STREAMING
  // ========================================
  
  const handleExecutionCleanup = useCallback(async (isError = false, errorMessage = null, errorType = null) => {
    console.log('Execution cleanup:', { isError, errorMessage, errorType });
    console.log('Current streamedContent:', streamedContentRef.current);
    
    if (streamingMessageIndexRef.current !== null) {
      // Use current streamed content (which includes error if it was queued)
      const finalContent = streamedContentRef.current || (isError ? `Error: ${errorMessage}` : '');
      
      // Update message with final content
      updateMessage(streamingMessageIndexRef.current, {
        content: finalContent,
        isStreaming: false,
        isExecutionMessage: true,
        executionComplete: true,
        executionId: executionId,
        timestamp: new Date().toISOString()
      });
      
      // Persist to database
      try {
        await chatAPI.saveMessage(sessionId, {
          role: 'assistant',
          content: finalContent,
          condition: 'ai_assistant',
          execution_id: executionId,
          metadata: isError ? { 
            error: true, 
            error_message: errorMessage,
            error_type: errorType 
          } : {}
        });
        
        trackMessageReceived(finalContent.length, {
          content: finalContent,
          isStreaming: false,
          isExecutionMessage: true,
          executionComplete: true,
          executionId: executionId,
          error: isError
        });
      } catch (err) {
        console.error('Failed to persist message:', err);
        captureException(err, {
          tags: { error_type: 'message_persist_failed' },
          extra: { isError, errorMessage, executionId, sessionId }
        });
      }
      
      // Reset state
      streamingMessageIndexRef.current = null;
      streamedContentRef.current = '';
      setIsLoading(false);
      setExecutionId(null);
      
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [sessionId, executionId, updateMessage, trackMessageReceived]);

  // Execution streaming - handles all WebSocket processing
  const {
    streamedContent,
    isStreaming: isExecutionStreaming,
    executionId: streamingExecutionId,
    isComplete: streamingComplete,
    summaryData,
    summaryAvailable,
  } = useExecutionStreaming(sessionId, executionId, 'ai_assistant', {
    onExecutionIdReceived: (id) => {
      console.log('Received execution_id:', id);
      setExecutionId(id);
      
      if (streamingMessageIndexRef.current !== null) {
        updateMessage(streamingMessageIndexRef.current, {
          executionId: id,
        });
      }
    },
    onCleanupComplete: () => handleExecutionCleanup(false),  // Normal completion
    onExecutionError: (errorMsg, errorType) => handleExecutionCleanup(true, errorMsg, errorType)  // Error completion
  });
  
  // Use parent's summary data if available (loaded from DB), otherwise use own (from execution)
  const effectiveSummaryData = parentSummaryData || summaryData;
  const effectiveSummaryAvailable = parentSummaryAvailable || summaryAvailable;
  
  // Notify parent and auto-save to database when summary becomes available
  useEffect(() => {
    if (summaryAvailable && summaryData && notifyParentOfSummary) {
      // Notify parent for state sync
      notifyParentOfSummary(summaryData);
      
      // Auto-save to database
      if (createSummary) {
        createSummary(summaryData, executionId || `ai_execution_${Date.now()}`);
      }
    }
  }, [summaryAvailable, summaryData, notifyParentOfSummary, createSummary, executionId]);
  
  // Keep ref in sync with streamedContent
  useEffect(() => {
    streamedContentRef.current = streamedContent;
  }, [streamedContent]);

  // ========================================
  // AUTO-SCROLL
  // ========================================
  
  const scrollToBottom = useCallback(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }
}, []);

useEffect(() => {
  // Scroll when:
  // - messages change (user/assistant messages added)
  // - execution starts/stops
  // - streamed content updates during streaming
  scrollToBottom();
}, [chatMessages, isExecutionStreaming, streamedContent, scrollToBottom]);

  // ========================================
  // MESSAGE SENDING
  // ========================================
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isExecutionStreaming || !isWebSocketConnected) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    trackMessageSent(userMessage.length, {content: userMessage});

    try {
      setIsLoading(true);
      
      // Add placeholder for assistant response
      const assistantIndex = chatMessages.length + 1;
      streamingMessageIndexRef.current = assistantIndex;
      
      addMessage({
        role: 'assistant',
        content: '',
        isStreaming: true,
        isExecutionMessage: true,
        executionId: null,
        timestamp: new Date().toISOString()
      });

      // Get context for AI
      const contextMessages = chatMessages.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);

      // Prepare input data with ALL required fields
      const input_data = {
        session_id: sessionId,
        category: studyDataset,
        language: currentLanguage,
        context: contextMessages.map(m => ({
          role: m.role,
          content: sanitizeMessageForLLM(m.content)
        })),
        timestamp: new Date().toISOString()
      };

      // Send via agent_execute
      const result = await orchestratorAPI.executeAgent(
        sessionId,
        sanitizeMessageForLLM(userMessage),
        input_data
      );


    } catch (err) {
      console.error('Failed to send message:', err);
      
      const errorMessage = err.response?.data?.detail || err.message || ERROR_MESSAGES.SEND_FAILED;
      setError(errorMessage);
      
      // Update placeholder with error
      if (streamingMessageIndexRef.current !== null) {
        const errorContent = 'Error: Failed to process your request. Please try again.';

        updateMessage(streamingMessageIndexRef.current, {
          content: errorContent,
          isStreaming: false,
          isExecutionMessage: false,
          timestamp: new Date().toISOString()
        });
        streamingMessageIndexRef.current = null;
      }
    
      // Persist error message to database
      try {
        await chatAPI.addMessage(sessionId, {
          role: 'assistant',
          content: errorContent,
          condition: 'ai_assistant',
          metadata: { 
            error: true, 
            error_message: errorMessage 
          }
        });
      } catch (persistErr) {
        console.error('Failed to persist error:', persistErr);
      }
      
      streamingMessageIndexRef.current = null;
      streamedContentRef.current = '';
      setIsLoading(false);
      setExecutionId(null);
      
      trackError('MESSAGE_SEND_FAILED', {
        content: userMessage,
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
  // KEYBOARD HANDLER
  // ========================================
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // ========================================
  // CLEAR CHAT
  // ========================================
  
  const handleClearChat = () => {
    const confirmMessage = t('chat.clearConfirm') || 'Are you sure you want to clear the chat?';
    if (window.confirm(confirmMessage)) {
      clearChat();
      trackMessagesCleared(0);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  const isProcessing = isLoading || isExecutionStreaming;
  
  return (
    <div data-tour="chat-messages-container" className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('chat.aiAssistant')}
        </h2>
        <button
          data-tour="chat-messages-clear-btn"
          onClick={handleClearChat}
          disabled={!hasMessages}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {t('chat.clearChat')}
        </button>
      </div>

      {/* Messages */}
      <div 
        data-tour="chat-messages" 
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              {message.isStreaming && message.isExecutionMessage ? (
                <StreamingMessage
                  content={streamedContent}
                  isStreaming={isExecutionStreaming}
                />
              ) : (
                <>
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  
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
                </>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {/* Summary Document Container */}
        {effectiveSummaryAvailable && streamingComplete && chatMessages.length > 0 && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div
              onClick={() => {
                setShowSummaryModal(true);
                if (markAsViewed) {
                  markAsViewed();
                }
              }}
              className="max-w-[70%] rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm cursor-pointer transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {t('chat.summaryAvailable.title')}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('chat.summaryAvailable.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div data-tour="chat-input" className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-expand - minimum 2 rows
                e.target.style.height = 'auto';
                const minHeight = 70; // ~2 rows with padding
                const maxHeight = 144; // ~5 rows with padding
                const newHeight = Math.max(minHeight, Math.min(e.target.scrollHeight, maxHeight));
                e.target.style.height = newHeight + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isProcessing 
                  ? t('chat.working')
                  : isWebSocketConnected
                  ? t('chat.placeholder')
                  : t('chat.disconnected')
              }
              disabled={isProcessing || !isWebSocketConnected}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-all overflow-hidden leading-relaxed"
              style={{ 
                height: '70px',
                minHeight: '70px',
                maxHeight: '144px',
                resize: 'none'
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || !isWebSocketConnected}
            className="h-[52px] px-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 flex-shrink-0 relative"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('chat.processing')}</span>
                {/* Pulsing ring indicator */}
                <span className="absolute inset-0 rounded-xl border-2 border-blue-300 dark:border-blue-400 animate-pulse" />
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{t('chat.send')}</span>
              </>
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span>{t('chat.poweredBy')}</span>
        </div>
      </form>
      
      {/* Summary Modal */}
      {showSummaryModal && effectiveSummaryData && (
        <SummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          onOpen={() => {
            if (markAsViewed) {
              markAsViewed();
            }
            track('summary_modal_opened', {})
          }}
          summaryData={effectiveSummaryData}
          taskNumber={studyProgress?.task1Completed ? 2 : 1}
        />
      )}
    </div>
  );
};

export default AIChat;