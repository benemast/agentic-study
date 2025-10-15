// frontend/src/components/AIChat.jsx
import * as Sentry from "@sentry/react";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User, Lock, Edit2, Check, X } from 'lucide-react';

import { useSession } from '../hooks/useSession';
import { useSessionData } from '../hooks/useSessionData';
import { useTracking } from '../hooks/useTracking';
import { chatAPI } from '../config/api';
import { AI_CONFIG, ERROR_MESSAGES, API_CONFIG } from '../config/constants';

const AIChat = () => {
  // Get messages from sessionStore via hook
  const { 
    chatMessages, 
    setChatMessages, 
    addChatMessage, 
    updateChatMessage, 
    clearChatMessages,
    loadChatHistory 
  } = useSessionData();

  // Local UI state only
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  const messagesEndRef = useRef(null);
  const hasLoadedHistory = useRef(false);
  const isLoadingHistory = useRef(false);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  
  const { sessionId } = useSession();
  const { trackMessageSent, trackMessageReceived, trackMessagesCleared, trackError } = useTracking();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isLoading]);

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
      await loadChatHistory(); // Uses the store method
      console.log('Chat history loaded:', chatMessages.length, 'messages');
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      isLoadingHistory.current = false;
    }
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

    const lengthBeforeAdding = chatMessages.length;
    console.log("lengthBeforeAdding: " + lengthBeforeAdding);
    console.log(chatMessages);

    addChatMessage(userMessage);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    trackMessageSent(userMessage.content.length);

    const userMessageIndex = chatMessages.length;
    console.log("userMessageIndex: " + userMessageIndex);
    console.log(chatMessages);

    // Use messages from store
    const contextMessages = chatMessages.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);

    try {
      // Save user message to backend
      //await chatAPI.saveMessage(sessionId, userMessage);

      // Prepare request
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
      const assistantIndex = lengthBeforeAdding + 1;

      console.log("Length before adding:", lengthBeforeAdding);
      console.log("User message index:", userMessageIndex);
      console.log("Assistant message index:", assistantIndex);
      console.log(chatMessages);

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
                
                console.log("chatMessages.length: " + chatMessages.length);
                //console.log("getChatMessages().length: " + getChatMessages().length);
                //console.log("getChatMessages(): " + getChatMessages());

                // Update streaming message
                updateChatMessage(assistantIndex, {
                  content: fullContent
                });
              }
            } catch (err) {
                console.error('Chat error processing response:', err);
              // Skip invalid JSON
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
      setIsStreaming(false);
      
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
      
      // ADD: Log chat errors with message length/context
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
      setIsStreaming(false);
      trackError('chat_error', err.message);
      
      // Remove failed streaming message
      const messages = [...chatMessages];
      // Assistant would be at the calculated index
      if (messages.length > assistantIndex && messages[assistantIndex]?.isStreaming) {
        messages.splice(assistantIndex, 1);
        setChatMessages(messages);
      }
    }
  };

  const clearHistory = async () => {
    if (!sessionId || isStreaming) return;

    if (!confirm('Are you sure you want to clear the chat history?')) return;

    try {
      await chatAPI.clear(sessionId);
      clearChatMessages();
      trackMessagesCleared('chat_cleared'); // Track as event
      setError(null);
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
      // Update in store
      updateChatMessage(editingIndex, {
        content: editingContent.trim(),
        edited: true,
        editedAt: new Date().toISOString()
      });

      // Remove all messages after the edited one
      const messagesToKeep = chatMessages.slice(0, editingIndex + 1);
      setChatMessages(messagesToKeep);
      
      cancelEdit();

      // Regenerate response
      setIsLoading(true);
      setIsStreaming(true);
      setError(null);

      const chatRequest = {
        session_id: sessionId,
        messages: messagesToKeep.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES),
        model: AI_CONFIG.MODEL,
        temperature: AI_CONFIG.TEMPERATURE,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        stream: true
      };

      const response = await chatAPI.sendStream(chatRequest);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      const startTime = Date.now();

      addChatMessage({
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      });

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
                
                const lastIndex = chatMessages.length;
                updateChatMessage(lastIndex, {
                  content: fullContent
                });
              }
            } catch (err) {
                console.error('Chat error processing response:', err);
              continue;
            }
          }
        }
      }

      const responseTime = Date.now() - startTime;

      const lastIndex = chatMessages.length - 1;
      updateChatMessage(lastIndex, {
        isStreaming: false
      });

      trackMessageReceived(fullContent.length, responseTime);
      setIsLoading(false);
      setIsStreaming(false);

    } catch (err) {
      console.error('Edit and regenerate error:', err);
      setError(err.message || ERROR_MESSAGES.API_ERROR);
      setIsLoading(false);
      setIsStreaming(false);
      trackError('edit_regenerate_error', err.message);
      
      const messages = [...chatMessages];
      if (messages[messages.length - 1]?.isStreaming) {
        messages.pop();
        setChatMessages(messages);
      }
    }
  };

  const isInputDisabled = isLoading || isStreaming || !sessionId;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-500">
              {isStreaming ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Generating response...</span>
                </span>
              ) : (
                'Ask me anything about workflows'
              )}
            </p>
          </div>
        </div>
        
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chatMessages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">Ask me about creating workflows, automation, or anything else!</p>
          </div>
        )}

        {chatMessages.map((message, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} group relative`}
          >
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
                  
                  {message.role === 'user' && !isStreaming && !isLoading && (
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
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        {/* Streaming indicator */}
        {isStreaming && (
          <div className="mb-3 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <Lock className="w-4 h-4" />
            <span>Chat locked while AI is responding...</span>
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
                : !sessionId 
                ? "Loading session..." 
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
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Send</span>
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
  );
};

export default AIChat;