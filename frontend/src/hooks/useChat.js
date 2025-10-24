// frontend/src/hooks/useChat.js
import useWebSocketStore from '../store/websocketStore';
import { useSessionStore } from '../store/sessionStore';

export const useChat = () => {
  // ============================================================
  // WEBSOCKET STORE (Real-time chat state)
  // ============================================================
  const wsMessages = useWebSocketStore(state => state.chat.messages);
  const isStreaming = useWebSocketStore(state => state.chat.isStreaming);
  const streamingContent = useWebSocketStore(state => state.chat.streamingContent);
  const unreadCount = useWebSocketStore(state => state.chat.unreadCount);
  const hasMore = useWebSocketStore(state => state.chat.hasMore);
  const isLoadingHistory = useWebSocketStore(state => state.chat.isLoadingHistory);
  
  // WebSocket chat actions
  const addMessageWS = useWebSocketStore(state => state.addChatMessage);
  const updateMessageWS = useWebSocketStore(state => state.updateChatMessage);
  const deleteMessageWS = useWebSocketStore(state => state.deleteChatMessage);
  const clearChatWS = useWebSocketStore(state => state.clearChat);
  const setChatHistoryWS = useWebSocketStore(state => state.setChatHistory);
  const markAsRead = useWebSocketStore(state => state.markChatAsRead);
  
  // ============================================================
  // SESSION STORE (Persistence fallback)
  // ============================================================
  const sessionMessages = useSessionStore(state => state.sessionData.chatMessages);
  
  // Session chat methods (for persistence & sync)
  const getChatMessages = useSessionStore(state => state.getChatMessages);
  const addMessageSession = useSessionStore(state => state.addChatMessage);
  const updateMessageSession = useSessionStore(state => state.updateChatMessage);
  const clearChatSession = useSessionStore(state => state.clearChatMessages);
  const setChatHistorySession = useSessionStore(state => state.setChatMessages);
  const loadChatHistory = useSessionStore(state => state.loadChatHistory);
  
  // Check if WebSocket store is active (has the functions available)
  const isWebSocketActive = !!addMessageWS && !!updateMessageWS;
  
  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  // Use WebSocket messages if available and populated, else session messages
  const messages = isWebSocketActive ? wsMessages : (sessionMessages || []);
  
  // ============================================================
  // UNIFIED METHODS (handle both stores)
  // ============================================================
  
  /**
   * Add a message to both stores for persistence + real-time
   */
  const addMessage = (message) => {
    if (isWebSocketActive) {
      // WebSocket is active - ONLY use WebSocket store
      addMessageWS(message);
    } else {
      // WebSocket not available - use Session store as fallback
      addMessageSession(message);
    }
  };
  
  /**
   * Update a message in both stores
   * Note: WebSocket uses message ID, session uses index
   */  

  const updateMessage = (indexOrId, updates) => {
    
    // If it's a number, treat as index
    if (typeof indexOrId === 'number') {
      if (isWebSocketActive) {
        // Update in WebSocket store
        const message = messages[indexOrId];
        if (message?.id && updateMessageWS) {
          updateMessageWS(message.id, updates);
        } else if (updateMessageWS) {
          // If no ID, try updating by index (some WebSocket stores support this)
          updateMessageWS(indexOrId, updates);
        }
      } else {
        // Using session messages, update there
        updateMessageSession(indexOrId, updates);
      }
    } else {
      // It's an ID (WebSocket store)
      if (isWebSocketActive && updateMessageWS) {
        updateMessageWS(indexOrId, updates);
      } else {
        // Fallback to session store by finding index
        const index = messages.findIndex(m => m.id === indexOrId);
        if (index !== -1) {
          updateMessageSession(index, updates);
        }
      }
    }
  };
  
  /**
   * Clear chat in both stores
   */
  const clearChat = () => {
    if (isWebSocketActive && clearChatWS) {
      clearChatWS();
    }
    // Always clear session store for consistency
    clearChatSession();
  };
  
  /**
   * Set chat history in both stores
   */
  const setChatHistory = (messages, hasMore = false) => {
    if (isWebSocketActive && setChatHistoryWS) {
      setChatHistoryWS(messages, hasMore);
    }
    // Always set in session for persistence
    setChatHistorySession(messages);
  };
  
  // ============================================================
  // RETURN INTERFACE
  // ============================================================
  
  return {
    // State
    messages,
    isStreaming,
    streamingContent,
    unreadCount,
    hasMore,
    isLoadingHistory: isLoadingHistory ?? false,
    
    // Unified actions (updates appropriate store)
    addMessage,
    updateMessage,
    clearChat,
    setChatHistory,
    
    // Load history (from backend)
    loadHistory: loadChatHistory,
    
    // Mark as read
    markAsRead,
    
    // Direct WebSocket actions (if needed)
    deleteMessage: deleteMessageWS,
    
    // Computed
    messageCount: messages.length,
    hasMessages: messages.length > 0,
    hasUnread: unreadCount > 0,
  };
};

export default useChat;