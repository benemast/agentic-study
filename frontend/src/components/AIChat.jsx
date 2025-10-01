// frontend/src/components/AIChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User } from 'lucide-react';
import { useSessionStore } from './SessionManager';

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const sessionStore = useSessionStore();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const LLM_MODEL = import.meta.env.LLM_MODEL;
  const MAX_TOKENS = import.meta.env.DEFAULT_MAX_TOKENS;
  const TEMPERATURE = import.meta.env.TEMPERATURE;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat history on mount AND when sessionId changes
  useEffect(() => {
    if (sessionStore.sessionId) {
      console.log('Loading chat history for session:', sessionStore.sessionId);
      loadChatHistory();
    }
  }, [sessionStore.sessionId]);

  const loadChatHistory = async () => {
    if (!sessionStore.sessionId) {
      console.log('No sessionId, skipping history load');
      return;
    }

    try {
      console.log('Fetching chat history...');
      const response = await fetch(
        `${API_URL}/api/ai-chat/history/${sessionStore.sessionId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history loaded:', data);
        setMessages(data.messages || []);
      } else {
        console.error('Failed to load history:', response.status);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    if (!sessionStore.sessionId) {
      setError('No active session. Please start a session first.');
      return;
    }

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to UI
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    // OPTIMIZATION: Use the CURRENT messages state (which includes loaded history)
    // Only send last 10 messages for context (includes history + new message)
    const contextMessages = updatedMessages.slice(-10);

    try {
      // Save user message to backend immediately
      await fetch(`${API_URL}/api/ai-chat/save-message?session_id=${sessionStore.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      });

      const response = await fetch(`${API_URL}/api/ai-chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionStore.sessionId,
          messages: contextMessages, // Send limited context [...messages, userMessage],
          model: LLM_MODEL,
          temperature: TEMPERATURE,
          max_tokens: MAX_TOKENS, // OPTIMIZATION: Reduced from 1000 for 2x faster responses
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      const startTime = Date.now();

      // Add assistant message to state for streaming
      const assistantMessageIndex = messages.length + 1;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '', // Empty content will show typing indicator
        timestamp: new Date().toISOString(),
        isStreaming: true
      }]);

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
                
                // Update the SAME assistant message with streaming content
                setMessages(prev => {
                  const newMessages = [...prev];
                  // Find the last assistant message and update it
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (newMessages[i].role === 'assistant' && newMessages[i].isStreaming) {
                      newMessages[i] = {
                        ...newMessages[i],
                        content: fullContent,
                        isStreaming: true
                      };
                      break;
                    }
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
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant' && newMessages[i].isStreaming) {
            delete newMessages[i].isStreaming;
            break;
          }
        }
        return newMessages;
      });

      // OPTIMIZATION: Save complete message to backend only once (not during streaming)
      if (fullContent) {
        await fetch(`${API_URL}/api/ai-chat/save-message?session_id=${sessionStore.sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'assistant',
            content: fullContent,
            timestamp: new Date().toISOString(),
            metadata: {
              response_time_ms: responseTime,
              model: LLM_MODEL
            }
          }),
        });
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
      
      // Remove the failed assistant message
      setMessages(prev => prev.filter(msg => !(msg.role === 'assistant' && msg.isStreaming)));
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!sessionStore.sessionId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/ai-chat/history/${sessionStore.sessionId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError('Failed to clear chat history');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-gray-800">AI Assistant</h1>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Clear chat history"
        >
          <Trash2 size={18} />
          <span className="text-sm">Clear</span>
        </button>
      </div>

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
                {/* Show typing indicator if assistant message is empty and streaming */}
                {msg.role === 'assistant' && msg.isStreaming && !msg.content ? (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.timestamp && !msg.isStreaming && (
                      <p className={`text-xs mt-2 ${
                        msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
              )}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;