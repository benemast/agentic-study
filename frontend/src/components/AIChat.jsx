// frontend/src/components/AIChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User } from 'lucide-react';

import { useSession } from '../hooks/useSession';
import { useTracking } from '../hooks/useTracking';
import { chatAPI } from '../config/api';
import { AI_CONFIG, ERROR_MESSAGES } from '../config/constants';

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { sessionId } = useSession();
  const { trackMessageSent, trackMessageReceived, trackError } = useTracking();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat history on mount
  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
    }
  }, [sessionId]);

  const loadChatHistory = async () => {
    if (!sessionId) return;

    try {
      console.log('Loading chat history...');
      const data = await chatAPI.getHistory(sessionId);
      setMessages(data.messages || []);
      console.log('Chat history loaded:', data.messages?.length, 'messages');
    } catch (err) {
      console.error('Failed to load chat history:', err);
      // Don't show error to user for history load failure
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    if (!sessionId) {
      setError(ERROR_MESSAGES.SESSION_EXPIRED);
      return;
    }

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to UI immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Track user message
    trackMessageSent(userMessage.content.length);

    // Limit context to last N messages
    const contextMessages = updatedMessages.slice(-AI_CONFIG.MAX_CONTEXT_MESSAGES);

    try {
      // Save user message to backend
      await chatAPI.saveMessage(sessionId, userMessage);

      // Prepare request
      const chatRequest = {
        session_id: sessionId,
        messages: contextMessages,
        model: AI_CONFIG.MODEL,
        temperature: AI_CONFIG.TEMPERATURE,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        stream: true
      };

      // Manual fetch for streaming (API client doesn't support streaming yet)
      const response = await fetch(`${chatAPI.baseURL || ''}/api/ai-chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      const startTime = Date.now();

      // Add empty assistant message for streaming
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }]);

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
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIdx = newMessages.length - 1;
                  if (newMessages[lastIdx]?.role === 'assistant' && newMessages[lastIdx].isStreaming) {
                    newMessages[lastIdx] = {
                      ...newMessages[lastIdx],
                      content: fullContent
                    };
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }

      const responseTime = Date.now() - startTime;

      // Mark streaming as complete
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        if (newMessages[lastIdx]?.isStreaming) {
          delete newMessages[lastIdx].isStreaming;
        }
        return newMessages;
      });

      // Track assistant message
      trackMessageReceived(fullContent.length, {
        response_time_ms: responseTime,
        model: AI_CONFIG.MODEL
      });

      // Save complete message to backend
      if (fullContent) {
        await chatAPI.saveMessage(sessionId, {
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString()
        });
      }

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
      trackError('message_send_failed', err.message);
            
      // Remove failed assistant message
      setMessages(prev => prev.filter(msg => !(msg.role === 'assistant' && msg.isStreaming)));
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!sessionId) return;

    if (!confirm('Are you sure you want to clear the chat history?')) {
      return;
    }

    try {
      await chatAPI.clear(sessionId);
      setMessages([]);
      trackError('chat_cleared'); // Track as event
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError('Failed to clear chat history');
      trackError('chat_clear_failed', err.message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-gray-800">AI Assistant</h1>
          <span className="text-xs text-gray-500">({AI_CONFIG.MODEL})</span>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Clear chat history"
          disabled={messages.length === 0}
        >
          <Trash2 size={18} />
          <span className="text-sm">Clear</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-500">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Bot size={64} className="mb-4 text-blue-400" />
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">Ask me anything!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] rounded-lg p-4 shadow-md ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800'
                }`}
              >
                {/* Typing indicator */}
                {msg.role === 'assistant' && msg.isStreaming && !msg.content ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                )}
                
                {msg.timestamp && (
                  <div className={`text-xs mt-2 ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
              
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div className="bg-white rounded-lg p-4 shadow-md">
              <Loader2 className="animate-spin text-blue-600" size={20} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="bg-white border-t p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            maxLength={AI_CONFIG.MAX_MESSAGE_LENGTH}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
            <span>Send</span>
          </button>
        </div>
        <div className="text-xs text-gray-500 text-center mt-2">
          {input.length} / {AI_CONFIG.MAX_MESSAGE_LENGTH} characters
        </div>
      </form>
    </div>
  );
};

export default AIChat;