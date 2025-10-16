// frontend/src/hooks/useWebSocket.js
/**
 * Direct WebSocket hook for components that need real-time features
 */
import { useEffect, useRef } from 'react';
import useWebSocketStore from '../store/websocketStore';
import { useSession } from './useSession';

export const useWebSocket = (options = {}) => {
  const { autoConnect = true } = options;
  const { sessionId } = useSession();
  
  // Track connection attempts to prevent loops
  const connectionAttemptedRef = useRef(false);
  const lastSessionIdRef = useRef(null);
  
  const wsStore = useWebSocketStore(state => ({
    isConnected: state.connection.status === 'connected',
    connectionStatus: state.connection.status,
    latency: state.health.latency,
    currentSessionId: state.connection.sessionId,
    connect: state.connect,
    disconnect: state.disconnect,
    queueMessage: state.queueMessage
  }));
  
  // Auto-connect when session is available
  useEffect(() => {
    // Skip if autoConnect is disabled
    if (!autoConnect) return;
    
    // Skip if no sessionId
    if (!sessionId) return;
    
    // Skip if already connected to this session
    if (wsStore.isConnected && wsStore.currentSessionId === sessionId) {
      return;
    }
    
    // Skip if we already attempted connection for this session
    if (connectionAttemptedRef.current && lastSessionIdRef.current === sessionId) {
      return;
    }
    
    // Mark as attempted
    connectionAttemptedRef.current = true;
    lastSessionIdRef.current = sessionId;
    
    // Attempt connection
    wsStore.connect(sessionId).catch(error => {
      console.error('WebSocket connection failed:', error);
      // Reset flag on error to allow retry
      connectionAttemptedRef.current = false;
    });
    
  }, [sessionId, autoConnect, wsStore.isConnected, wsStore.currentSessionId]);
  
  // Reset connection flag when session changes
  useEffect(() => {
    if (sessionId !== lastSessionIdRef.current) {
      connectionAttemptedRef.current = false;
    }
  }, [sessionId]);

  return wsStore;
};

export default useWebSocket;