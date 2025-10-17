// frontend/src/hooks/useChat.js
/**
 * Hook for chat functionality
 * Combines websocketStore (real-time) + sessionStore (persistence)
 */
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
  
  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  // Use WebSocket messages if available and populated, else session messages
  const messages = (wsMessages && wsMessages.length > 0) 
    ? wsMessages 
    : (sessionMessages || []);
  
  // ============================================================
  // UNIFIED METHODS (handle both stores)
  // ============================================================
  
  /**
   * Add a message to both stores for persistence + real-time
   */
  const addMessage = (message) => {
    // Always add to WebSocket store (if available)
    if (addMessageWS) {
      addMessageWS(message);
    }
    
    // ONLY add to session store if WebSocket messages are empty
    // This prevents duplication when both stores are active
    if (!wsMessages || wsMessages.length === 0) {
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
      // CRITICAL FIX: Only update in the active store
      // If using WebSocket messages, update there
      if (wsMessages && wsMessages.length > 0) {
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
      if (updateMessageWS) {
        updateMessageWS(indexOrId, updates);
      }
      
      // ONLY sync to session if not using WebSocket messages
      if (!wsMessages || wsMessages.length === 0) {
        const index = messages.findIndex(m => m.id === indexOrId);
        if (index !== -1) {
          updateMessageSession(index, updates);
        }
      } else {
        console.log('[useChat] Skipped Session store sync (using WebSocket)');
      }
    }
  };
  
  /**
   * Clear chat in both stores
   */
  const clearChat = () => {
    if (clearChatWS) clearChatWS();
    clearChatSession();
  };
  
  /**
   * Set chat history in both stores
   */
  const setChatHistory = (messages, hasMore = false) => {
    if (setChatHistoryWS) setChatHistoryWS(messages, hasMore);
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
    isLoadingHistory,
    
    // Unified actions (updates both stores)
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