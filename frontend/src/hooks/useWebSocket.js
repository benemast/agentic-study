// frontend/src/hooks/useWebSocket.js
/**
 * Hook for WebSocket connection control
 * Provides connection management and event subscription
 */
import { useEffect, useRef, useCallback } from 'react';
import useWebSocketStore from '../store/websocketStore';
import { useSession } from './useSession';
import { wsClient } from '../services/websocket';

export const useWebSocket = (options = {}) => {
  const { autoConnect = true } = options;
  const { sessionId } = useSession();
  
  // Track connection attempts to prevent loops
  const connectionAttemptedRef = useRef(false);
  const lastSessionIdRef = useRef(null);
  const handlersRef = useRef(new Map());
  
  // ============================================================
  // WEBSOCKET STORE STATE
  // ============================================================
  const status = useWebSocketStore(state => state.connection.status);
  const isConnected = status === 'connected';
  const currentSessionId = useWebSocketStore(state => state.connection.sessionId);
  const latency = useWebSocketStore(state => state.health.latency);
  const error = useWebSocketStore(state => state.connection.error);
  const reconnectAttempts = useWebSocketStore(state => state.connection.reconnectAttempts);
  
  // ============================================================
  // WEBSOCKET STORE ACTIONS
  // ============================================================
  const connectStore = useWebSocketStore(state => state.connect);
  const disconnectStore = useWebSocketStore(state => state.disconnect);
  const queueMessage = useWebSocketStore(state => state.queueMessage);
  
  // ============================================================
  // CONNECTION MANAGEMENT
  // ============================================================
  
  const connect = useCallback(async (sessionIdOverride) => {
    const idToUse = sessionIdOverride || sessionId;
    
    if (!idToUse) {
      console.warn('Cannot connect: no session ID');
      return false;
    }

    try {
      connectionAttemptedRef.current = true;
      lastSessionIdRef.current = idToUse;
      
      const result = await connectStore(idToUse);
      return result;
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      connectionAttemptedRef.current = false;
      return false;
    }
  }, [sessionId, connectStore]);
  
  const disconnect = useCallback(() => {
    disconnectStore();
    connectionAttemptedRef.current = false;
    lastSessionIdRef.current = null;
  }, [disconnectStore]);
  
  // ============================================================
  // AUTO-CONNECT
  // ============================================================
  
  useEffect(() => {
    // Skip if autoConnect is disabled
    if (!autoConnect) return;
    
    // Skip if no sessionId
    if (!sessionId) return;
    
    // Skip if already connected to this session
    if (isConnected && currentSessionId === sessionId) {
      return;
    }
    
    // Skip if we already attempted connection for this session
    if (connectionAttemptedRef.current && lastSessionIdRef.current === sessionId) {
      return;
    }
    
    // Attempt connection
    connect(sessionId);
    
  }, [sessionId, autoConnect, isConnected, currentSessionId, connect]);
  
  // Reset connection flag when session changes
  useEffect(() => {
    if (sessionId !== lastSessionIdRef.current) {
      connectionAttemptedRef.current = false;
    }
  }, [sessionId]);
  
  // ============================================================
  // EVENT SUBSCRIPTION
  // ============================================================
  
  /**
   * Subscribe to WebSocket event
   */
  const on = useCallback((eventType, handler) => {
    if (!wsClient) {
      console.warn(`wsClient not available for event: ${eventType}`);
      return () => {};
    }

    try {
      const unsubscribe = wsClient.on(eventType, handler);
      
      // Store for batch cleanup if needed
      handlersRef.current.set(eventType, unsubscribe);
      
      console.log(`Successfully subscribed to event: ${eventType}`);
      return unsubscribe;
      
    } catch (error) {
      console.error(`Error subscribing to event ${eventType}:`, error);
      return () => {};
    }
  }, []);
  
  /**
   * Unsubscribe from WebSocket event
   */
  const off = useCallback((eventType) => {
    const unsubscribe = handlersRef.current.get(eventType);
    if (unsubscribe && typeof unsubscribe === 'function') {
      try {
        unsubscribe();
      } catch (error) {
        console.error(`Error unsubscribing from event ${eventType}:`, error);
      }
      handlersRef.current.delete(eventType);
    }
  }, []);
  
  /**
   * Send message via WebSocket
   */
  const send = useCallback((message) => {
    if (!wsClient || typeof wsClient.send !== 'function') {
      console.warn('wsClient.send not available');
      return false;
    }
    return wsClient.send(message);
  }, []);
  
  // Cleanup handlers on unmount
  useEffect(() => {
    return () => {
      handlersRef.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          try {
            unsubscribe();
          } catch (error) {
            console.error('Error cleaning up handler:', error);
          }
        }
      });
      handlersRef.current.clear();
    };
  }, []);
  
  // ============================================================
  // CONVENIENCE METHODS (from wsClient)
  // ============================================================
  
  const sendChat = useCallback((content, context = []) => {
    if (!wsClient || typeof wsClient.sendChatMessage !== 'function') {
      console.warn('wsClient.sendChatMessage not available');
      return Promise.reject(new Error('WebSocket not available'));
    }
    return wsClient.sendChatMessage(content, context);
  }, []);
  
  const getChatHistory = useCallback((limit = 50, offset = 0) => {
    if (!wsClient || typeof wsClient.getChatHistory !== 'function') {
      console.warn('wsClient.getChatHistory not available');
      return Promise.reject(new Error('WebSocket not available'));
    }
    return wsClient.getChatHistory(limit, offset);
  }, []);
  
  const clearChatRemote = useCallback(() => {
    if (!wsClient || typeof wsClient.clearChat !== 'function') {
      console.warn('wsClient.clearChat not available');
      return Promise.reject(new Error('WebSocket not available'));
    }
    return wsClient.clearChat();
  }, []);
  
  const trackEvent = useCallback((eventType, eventData = {}) => {
    if (!wsClient || typeof wsClient.trackEvent !== 'function') {
      console.warn('wsClient.trackEvent not available');
      return Promise.reject(new Error('WebSocket not available'));
    }
    return wsClient.trackEvent(eventType, eventData);
  }, []);
  
  // ============================================================
  // RETURN INTERFACE
  // ============================================================
  
  return {
    // Connection state
    isConnected,
    status,
    latency,
    error,
    reconnectAttempts,
    
    // Connection control
    connect,
    disconnect,
    
    // Event handling
    on,
    off,
    send,
    
    // Queue
    queueMessage,
    
    // Convenience methods
    sendChat,
    getChatHistory,
    clearChat: clearChatRemote,
    trackEvent,
    
    // Computed
    isReconnecting: status === 'reconnecting',
    hasError: status === 'error',
  };
};

export default useWebSocket;