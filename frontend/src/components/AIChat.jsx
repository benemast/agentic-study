// frontend/src/components/AIChat.jsx
import * as Sentry from "@sentry/react";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User, Lock, Edit2, Check, X, Zap, MessageSquare } from 'lucide-react';

import ExecutionProgress from './ExecutionProgress';

import { useSession } from '../hooks/useSession';
import { useSessionData } from '../hooks/useSessionData';
import { useTracking } from '../hooks/useTracking';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useWebSocket } from '../hooks/useWebSocket';

import { chatAPI } from '../config/api';
import { AI_CONFIG, ERROR_MESSAGES, API_CONFIG } from '../config/constants';

const AIChat = () => {
  // ============================================================
  // HOOKS - Must be called unconditionally at top level
  // ============================================================
  
  const { sessionId } = useSession();
  const { trackMessageSent, trackMessageReceived, trackMessagesCleared, trackError } = useTracking();
  
  // Session data  
  const { 
    chatMessages, 
    setChatMessages, 
    addChatMessage, 
    updateChatMessage, 
    clearChatMessages,
    loadChatHistory,
    isStreaming: wsIsStreaming,
    streamingContent: wsStreamingContent
  } = useSessionData();

  // WebSocket hook
  const wsHook = useWebSocket({ autoConnect: true });
  const isWebSocketConnected = wsHook?.isConnected || false;

  // Execution hook for LangGraph orchestrator
  const {
    status: executionStatus,
    progress: executionProgress,
    progressPercentage,
    currentStep,
    result: executionResult,
    error: executionError,
    executeAgentTask,
    cancelExecution
  } = useWorkflowExecution(sessionId, 'ai_assistant');

  // ============================================================
  // LOCAL STATE
  // ============================================================
  
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' or 'task'
  
  // Streaming state - single source of truth
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const streamingMessageIndexRef = useRef(null);

  // Refs
  const messagesEndRef = useRef(null);
  const hasLoadedHistory = useRef(false);
  const isLoadingHistory = useRef(false);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  // ============================================================
  // WEBSOCKET EVENT HANDLERS
  // ============================================================
  
  useEffect(() => {
    if (!wsHook?.on) return;

    const unsubscribes = [];

    // Listen for streaming chunks
    unsubscribes.push(
      wsHook.on('chat_stream', (data) => {
        const content = data.content || '';
        const fullContent = data.full_content || localStreamingContent + content;
        
        setLocalStreamingContent(fullContent);
        
        // Update the streaming message if we have an index
        if (streamingMessageIndexRef.current !== null) {
          updateChatMessage(streamingMessageIndexRef.current, {
            content: fullContent,
            isStreaming: true
          });
        }
      })
    );
    
    // Listen for completion
    unsubscribes.push(
      wsHook.on('chat_complete', (data) => {
        const finalContent = data.content || localStreamingContent;
        
        // Update the final message
        if (streamingMessageIndexRef.current !== null) {
          updateChatMessage(streamingMessageIndexRef.current, {
            content: finalContent,
            isStreaming: false
          });
        }
        
        // Reset streaming state
        setLocalIsStreaming(false);
        setLocalStreamingContent('');
        streamingMessageIndexRef.current = null;
        setIsLoading(false);
        
        // Track message received
        trackMessageReceived(finalContent.length, 0);
        
        // Focus input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      })
    );
    
    // Listen for errors
    unsubscribes.push(
      wsHook.on('chat_error', (data) => {
        console.error('Chat WebSocket error:', data.error);
        setError(data.error || 'Chat error occurred');
        setLocalIsStreaming(false);
        setLocalStreamingContent('');
        setIsLoading(false);
        streamingMessageIndexRef.current = null;
        
        // Remove failed streaming message if exists
        if (streamingMessageIndexRef.current !== null) {
          const messages = [...chatMessages];
          if (messages[streamingMessageIndexRef.current]?.isStreaming) {
            messages.splice(streamingMessageIndexRef.current, 1);
            setChatMessages(messages);
          }
        }
      })
    );
    
    // Cleanup
    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [wsHook, localStreamingContent, chatMessages, updateChatMessage, setChatMessages, trackMessageReceived]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isLoading, streamingContent, executionProgress]);

  // Load chat history on mount
  useEffect(() => {
    if (sessionId && !hasLoadedHistory.current && !isLoadingHistory.current) {
      loadHistory();
    }
  }, [sessionId]);

  const loadHistory = async () => {
    if (!sessionId || hasLoadedHistory.current || isLoadingHistory.current) return;

    isLoadingHistory.current = true;
    hasLoadedHistory.current = true;

    try {
      console.log('Loading chat history...');
      await loadChatHistory();
      console.log('Chat history loaded:', chatMessages.length, 'messages');
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      isLoadingHistory.current = false;
    }
  };

  // Add execution result to chat when complete
  useEffect(() => {
    if (executionResult && executionStatus === 'completed') {
      const resultMessage = {
        role: 'assistant',
        content: formatExecutionResult(executionResult),
        timestamp: new Date().toISOString(),
        isExecutionResult: true
      };
      
      addChatMessage(resultMessage);
      trackMessageReceived(resultMessage.content.length, 0);
    }
  }, [executionResult, executionStatus, addChatMessage, trackMessageReceived]);

  // Handle execution errors
  useEffect(() => {
    if (executionError && executionStatus === 'failed') {
      setError(`Task execution failed: ${executionError}`);
      trackError('execution_failed', executionError);
    }
  }, [executionError, executionStatus, trackError]);

  const formatExecutionResult = (result) => {
    if (!result) return 'Task completed successfully.';
    
    if (typeof result === 'string') return result;
    
    if (result.insights) {
      return `**Task Complete!**\n\n${result.insights.join('\n\n')}`;
    }
    
    return '**Task Complete!**\n\n```json\n' + JSON.stringify(result, null, 2) + '\n```';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading || isStreaming) return;
    
    if (!sessionId) {
      setError(ERROR_MESSAGES.SESSION_EXPIRED);
      return;
    }

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Check if in task mode
    if (mode === 'task') {
      await executeTask(userMessage);
      return;
    }

    // Regular chat mode
    addChatMessage(userMessage);
    setInput('');
    setIsLoading(true);
    setError(null);

    trackMessageSent(userMessage.content.length);


    // Use messages from store
    const contextMessages = chatMessages.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);

    try {
      // Check if WebSocket is available and connected
      if (isWebSocketConnected && wsHook?.sendChat) {
        console.log('Sending message via WebSocket');
        
        // Add empty assistant message for streaming
        const assistantMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true
        };
        
        addChatMessage(assistantMessage);
        streamingMessageIndexRef.current = chatMessages.length + 1; // Account for user message + assistant
        
        setLocalIsStreaming(true);
        setLocalStreamingContent('');
        
        // Send via WebSocket
        await wsHook.sendChat(userMessage.content, [...contextMessages, userMessage]);
        
        // WebSocket handlers will handle the response
        
      } else {
        console.log('WebSocket not available, using REST API');
        
        // Fallback to REST API
        await sendViaREST(userMessage, contextMessages);
      }
      
    } catch (err) {
      console.error('Chat error:', err);
      
      Sentry.captureException(err, {
        tags: {
          error_type: 'chat_message_failed',
          component: 'AIChat',
          method: isWebSocketConnected ? 'websocket' : 'rest'
        },
        contexts: {
          chat: {
            message_length: userMessage.content.length,
            session_id: sessionId,
            model: AI_CONFIG.MODEL,
          }
        }
      });

      // Save user message to backend
      //await chatAPI.saveMessage(sessionId, userMessage);

      // Prepare request

      setError(err.message || ERROR_MESSAGES.API_ERROR);
      setIsLoading(false);
      setLocalIsStreaming(false);
      trackError('chat_error', err.message);
      
      // Remove failed streaming message if exists
      if (streamingMessageIndexRef.current !== null) {
        const messages = [...chatMessages];
        if (messages[streamingMessageIndexRef.current]?.isStreaming) {
          messages.splice(streamingMessageIndexRef.current, 1);
          setChatMessages(messages);
        }
        streamingMessageIndexRef.current = null;
      }
    }
  };
      
  // Separate REST API fallback function
  const sendViaREST = async (userMessage, contextMessages) => {
    try{
      const chatRequest = {
        session_id: sessionId,
        messages: [...contextMessages, userMessage],
        model: AI_CONFIG.MODEL,
        temperature: AI_CONFIG.TEMPERATURE,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        stream: true
      };

      const response = await chatAPI.send(chatRequest);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      const startTime = Date.now();
      
      // Add empty assistant message for streaming
      addChatMessage({
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      });
      
      const assistantIndex = chatMessages.length + 1;
      setLocalIsStreaming(true);

      // Stream response
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data.trim() === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              
              if (parsed.content) {
                fullContent += parsed.content;
                
                // Update streaming message
                updateChatMessage(assistantIndex, {
                  content: fullContent
                });
              }
            } catch (err) {
              console.error('Error processing response chunk:', err);
              continue;
            }
          }
        }
      }

      const responseTime = Date.now() - startTime;

      // Mark streaming as complete
      updateChatMessage(assistantIndex, {
        isStreaming: false
      });

      // Track assistant message
      trackMessageReceived(fullContent.length, responseTime);
      setIsLoading(false);
      setLocalIsStreaming(false);
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
        /*
        // Save complete message to backend
        if (fullContent) {
          await chatAPI.saveMessage(sessionId, {
            role: 'assistant',
            content: fullContent,
            timestamp: new Date().toISOString()
          });
        }
          */
    } catch (err) {
      console.error('Chat error:', err);
      
      Sentry.captureException(err, {
        tags: {
          error_type: 'chat_message_failed',
          component: 'AIChat'
        },
        contexts: {
          chat: {
            message_length: userMessage.content.length,
            session_id: sessionId,
            model: AI_CONFIG.MODEL,
          }
        }
      });
      
      setError(err.message || ERROR_MESSAGES.API_ERROR);
      setIsLoading(false);
      setLocalIsStreaming(false);
      trackError('chat_error', err.message);
      
      // Remove failed streaming message
      const messages = [...chatMessages];
      if (messages.length > assistantIndex && messages[assistantIndex]?.isStreaming) {
        messages.splice(assistantIndex, 1);
        setChatMessages(messages);
      }
    }
  };

  const executeTask = async (userMessage) => {
    addChatMessage(userMessage);
    setInput('');
    setError(null);

    trackMessageSent(userMessage.content.length);

    try {
      addChatMessage({
        role: 'system',
        content: '🤖 Agent is analyzing your request and planning the task execution...',
        timestamp: new Date().toISOString(),
        isSystemMessage: true
      });

      // Execute as agent task through LangGraph
      const contextMessages = chatMessages.slice(-5);
      
      await executeAgentTask(userMessage.content, {
        source: 'chat',
        context: contextMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        timestamp: new Date().toISOString()
      });

      // The result will be added to chat via the useEffect hook
      
    } catch (error) {
      console.error('Failed to execute task:', error);
      
      Sentry.captureException(error, {
        tags: {
          error_type: 'task_execution_failed',
          component: 'AIChat'
        },
        contexts: {
          task: {
            message_length: userMessage.content.length,
            session_id: sessionId,
          }
        }
      });
      
      setError(`Failed to execute task: ${error.message}`);
      trackError('task_execution_error', error.message);
    }
  };

  const clearHistory = async () => {
    if (!sessionId || isStreaming) return;

    if (!confirm('Are you sure you want to clear the chat history?')) return;

    try {
      // Clear via WebSocket if available
      if (isWebSocketConnected && wsHook?.clearChat) {
        await wsHook.clearChat();
      } else {
        // Fallback to REST
        await chatAPI.clear(sessionId);
      }

      clearChatMessages();
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

  const startEdit = (index) => {
    if (isStreaming || isLoading) return;
    setEditingIndex(index);
    setEditingContent(chatMessages[index].content);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
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
      // Update message
      updateChatMessage(editingIndex, {
        content: editingContent.trim(),
        edited: true,
        editedAt: new Date().toISOString()
      });

      // Remove all messages after the edited one
      const messagesToKeep = chatMessages.slice(0, editingIndex + 1);
      messagesToKeep[editingIndex] = {
        ...messagesToKeep[editingIndex],
        content: editingContent.trim(),
        edited: true,
        editedAt: new Date().toISOString()
      };
      
      setChatMessages(messagesToKeep);
      cancelEdit();

      // Regenerate response with the edited message
      setIsLoading(true);
      setError(null);

      const editedUserMessage = {
        ...messagesToKeep[editingIndex],
        role: 'user'
      };

      const contextMessages = messagesToKeep.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);

      // Send regeneration request
      if (isWebSocketConnected && wsHook?.sendChat) {
        // Add empty assistant message for streaming
        const assistantMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true
        };
        
        addChatMessage(assistantMessage);
        streamingMessageIndexRef.current = messagesToKeep.length;
        
        setLocalIsStreaming(true);
        setLocalStreamingContent('');
        
        // Send via WebSocket
        await wsHook.sendChat(editedUserMessage.content, contextMessages);
        
      } else {
        // Fallback to REST
        await sendViaREST(editedUserMessage, contextMessages.slice(0, -1));
      }

    } catch (err) {
      console.error('Edit and regenerate error:', err);
      setError(err.message || ERROR_MESSAGES.API_ERROR);
      setIsLoading(false);
      setLocalIsStreaming(false);
      trackError('edit_regenerate_error', err.message);
      
      // Clean up failed streaming message
      if (streamingMessageIndexRef.current !== null) {
        const messages = [...chatMessages];
        if (messages[streamingMessageIndexRef.current]?.isStreaming) {
          messages.splice(streamingMessageIndexRef.current, 1);
          setChatMessages(messages);
        }
        streamingMessageIndexRef.current = null;
      }
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'chat' ? 'task' : 'chat');
  };

  const isInputDisabled = isLoading || isStreaming || !sessionId || ['running', 'starting'].includes(executionStatus);
  const isExecuting = ['running', 'starting'].includes(executionStatus);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  AI Assistant {isWebSocketConnected && <span className="text-xs text-green-600">(Live)</span>}
                </h2>
                <p className="text-sm text-gray-500">
                  {isStreaming ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating response...</span>
                    </span>
                  ) : isExecuting ? (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Executing task...</span>
                    </span>
                  ) : (
                    `Mode: ${mode === 'chat' ? 'Chat' : 'Task Execution'}`
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mode Toggle */}
              <button
                onClick={toggleMode}
                disabled={isInputDisabled}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === 'task'
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={mode === 'chat' ? 'Switch to Task Execution Mode' : 'Switch to Chat Mode'}
              >
                {mode === 'task' ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Task Mode</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat Mode</span>
                  </>
                )}
              </button>

              <button
                onClick={clearHistory}
                disabled={isStreaming || chatMessages.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Mode Description */}
          <div className="mt-2 text-xs text-gray-600">
            {mode === 'chat' ? (
              `💬 Chat mode: Have a conversation with the AI assistant ${isWebSocketConnected ? '(Real-time via WebSocket)' : '(REST API)'}`
            ) : (
              '⚡ Task mode: AI agent will autonomously execute your request using workflows'
            )}
          </div>
          
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {chatMessages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">
                {mode === 'chat' 
                  ? 'Ask me about creating workflows, automation, or anything else!'
                  : 'Describe a task and I\'ll autonomously execute it for you!'
                }
              </p>
            </div>
          )}

          {chatMessages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 
                message.isSystemMessage ? 'justify-center' : 'justify-start'
              } group relative`}
            >
              {/* System messages */}
              {message.isSystemMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
                  {message.content}
                </div>
              )}

              {/* Regular messages */}
              {!message.isSystemMessage && (
                <>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    {editingIndex === idx ? (
                      // Edit mode
                      <div className="flex gap-2 items-start">
                        <textarea
                          ref={editInputRef}
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={3}
                          maxLength={AI_CONFIG.MAX_MESSAGE_LENGTH}
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={saveEdit}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Save and regenerate"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start gap-2">
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : message.isExecutionResult
                              ? 'bg-purple-50 text-gray-900 border-2 border-purple-200'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                            {message.isStreaming && (
                              <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1 align-middle" />
                            )}
                          </p>
                        </div>
                        
                        {message.role === 'user' && !isStreaming && !isLoading && !isExecuting && (
                          <button
                            onClick={() => startEdit(idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded flex-shrink-0"
                            title="Edit message"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Edited indicator */}
                    {message.edited && !message.isStreaming && (
                      <span className="text-xs text-gray-400 italic px-1">
                        (edited)
                      </span>
                    )}

                    {/* Execution result badge */}
                    {message.isExecutionResult && (
                      <span className="text-xs text-purple-600 font-medium px-1">
                        ⚡ Task Result
                      </span>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Show streaming content if WebSocket is not updating messages directly */}
          {isStreaming && streamingContent && streamingMessageIndexRef.current === null && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-2 max-w-[70%]">
                <p className="whitespace-pre-wrap break-words">
                  {streamingContent}
                  <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1 align-middle" />
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          {/* Status indicators */}
          {isStreaming && (
            <div className="mb-3 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Lock className="w-4 h-4" />
              <span>Chat locked while AI is responding...</span>
            </div>
          )}

          {isExecuting && (
            <div className="mb-3 flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
              <Zap className="w-4 h-4 animate-pulse" />
              <span>Agent is executing your task...</span>
              {currentStep && (
                <span className="text-xs">
                  (Step {currentStep.step}: {currentStep.action || currentStep.label})
                </span>
              )}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isInputDisabled}
              placeholder={
                isStreaming 
                  ? "Waiting for response to complete..." 
                  : isExecuting
                  ? "Task is being executed..."
                  : !sessionId 
                  ? "Loading session..." 
                  : mode === 'task'
                  ? "Describe the task you want to execute..."
                  : "Type your message..."
              }
              className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                isInputDisabled
                  ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              maxLength={AI_CONFIG.MAX_MESSAGE_LENGTH}
            />
            
            <button
              type="submit"
              disabled={isInputDisabled || !input.trim()}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isInputDisabled || !input.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : mode === 'task'
                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isLoading || isExecuting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{mode === 'task' ? 'Executing...' : 'Sending...'}</span>
                </>
              ) : (
                <>
                  {mode === 'task' ? <Zap className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  <span>{mode === 'task' ? 'Execute' : 'Send'}</span>
                </>
              )}
            </button>
          </form>

          {/* Character count */}
          {input.length > AI_CONFIG.MAX_MESSAGE_LENGTH * 0.8 && (
            <div className="mt-2 text-xs text-gray-500 text-right">
              {input.length} / {AI_CONFIG.MAX_MESSAGE_LENGTH} characters
            </div>
          )}
        </div>
      </div>

      {/* Execution Progress Sidebar */}
      {(isExecuting || executionStatus === 'completed' || executionStatus === 'failed') && (
        <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <ExecutionProgress
              status={executionStatus}
              progress={executionProgress}
              progressPercentage={progressPercentage}
              currentStep={currentStep}
              condition="ai_assistant"
              onCancel={cancelExecution}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;