// frontend/src/hooks/useSessionData.js
/**
 * Hook for accessing and updating session data
 * Single source of truth - abstracts both sessionStore and websocketStore
 */
import { useSessionStore } from '../store/sessionStore';
import useWebSocketStore from '../store/websocketStore';

// Default session data structure
const DEFAULT_SESSION_DATA = {
  workflowsCreated: 0,
  workflowsExecuted: 0,
  totalTimeSpent: 0,
  currentView: 'dashboard',
  currentWorkflow: { nodes: [], edges: [] },
  interactions: [],
  chatMessages: []
};

export const useSessionData = () => {
  // ============================================================
  // SESSION STORE
  // ============================================================
  const sessionData = useSessionStore(state => state.sessionData) || DEFAULT_SESSION_DATA;
  const updateWorkflow = useSessionStore(state => state.updateWorkflow);
  const incrementWorkflowsCreated = useSessionStore(state => state.incrementWorkflowsCreated);
  const incrementWorkflowsExecuted = useSessionStore(state => state.incrementWorkflowsExecuted);
  const setCurrentView = useSessionStore(state => state.setCurrentView);

  // ============================================================
  // WEBSOCKET STORE (for real-time chat)
  // ============================================================
  
  // Chat messages - prefer WebSocket store if available
  const wsMessages = useWebSocketStore(state => state.chat.messages);
  const sessionMessages = useSessionStore(state => state.sessionData.chatMessages);
  
  // Use WebSocket messages if available and populated, otherwise session messages
  const chatMessages = (wsMessages && wsMessages.length > 0) ? wsMessages : sessionMessages || [];
  
  // Chat state (real-time)
  const isStreaming = useWebSocketStore(state => state.chat.isStreaming);
  const streamingContent = useWebSocketStore(state => state.chat.streamingContent);
  const unreadCount = useWebSocketStore(state => state.chat.unreadCount);
  
  // Chat actions from WebSocket store
  const addChatMessage = useWebSocketStore(state => state.addChatMessage);
  const updateChatMessage = useWebSocketStore(state => state.updateChatMessage);
  const clearChat = useWebSocketStore(state => state.clearChat);
  const setChatHistory = useWebSocketStore(state => state.setChatHistory);
  const markChatAsRead = useWebSocketStore(state => state.markChatAsRead);

  // Load chat history - try WebSocket first, fallback to session
  const loadChatHistory = useSessionStore(state => state.loadChatHistory);
  
  // ============================================================
  // RETURN INTERFACE
  // ============================================================
  
  return {
    // Session data
    sessionData,
    currentView: sessionData?.currentView || 'dashboard',
    currentWorkflow: sessionData?.currentWorkflow || { nodes: [], edges: [] },
    workflowsCreated: sessionData?.workflowsCreated || 0,
    workflowsExecuted: sessionData?.workflowsExecuted || 0,
    totalTimeSpent: sessionData?.totalTimeSpent || 0,
    interactions: sessionData?.interactions || [],
    
    // Workflow methods
    updateWorkflow,
    incrementWorkflowsCreated,
    incrementWorkflowsExecuted,
    setCurrentView,
    
    // Computed values
    hasWorkflow: (sessionData?.currentWorkflow?.nodes?.length || 0) > 0,
    interactionCount: (sessionData?.interactions?.length || 0),
   
    // ============================================================
    // CHAT INTERFACE (abstracted from WebSocket store)
    // ============================================================
    
    // Chat state
    chatMessages,
    isStreaming,
    streamingContent,
    unreadCount,
    
    // Chat actions
    addChatMessage,
    updateChatMessage,
    clearChatMessages: clearChat,
    setChatMessages: setChatHistory,
    loadChatHistory,
    markChatAsRead,
  };
};

export default useSessionData;