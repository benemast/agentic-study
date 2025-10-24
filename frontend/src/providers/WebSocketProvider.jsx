//frontend/src/providers/WebSocketProvider.jsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSession } from '../hooks/useSession';
import useWebSocketStore from '../store/websocketStore';

// Create context
const WebSocketContext = createContext(null);

// Provider component
export const WebSocketProvider = ({ children }) => {
  const { sessionId } = useSession();
  
  // Get state and actions from store
  const status = useWebSocketStore(state => state.connection.status);
  const currentSessionId = useWebSocketStore(state => state.connection.sessionId);
  const connect = useWebSocketStore(state => state.connect);
  const disconnect = useWebSocketStore(state => state.disconnect);
  
  const isConnected = status === 'connected';
  
  // Track connection attempts
  const connectionAttemptedRef = useRef(false);
  const lastAttemptedSessionIdRef = useRef(null);
  
  // Single effect with proper guards
  useEffect(() => {
    // Guard 1: No session ID yet
    if (!sessionId) {
      console.log('🌐 WebSocketProvider: Waiting for session ID...');
      return;
    }
    
    // Guard 2: Already connected to this session
    if (isConnected && currentSessionId === sessionId) {
      console.log('🌐 WebSocketProvider: Already connected to', sessionId);
      return;
    }
    
    // Guard 3: Already attempted connection for this session
    if (connectionAttemptedRef.current && lastAttemptedSessionIdRef.current === sessionId) {
      console.log('🌐 WebSocketProvider: Connection already attempted for', sessionId);
      return;
    }
    
    // Mark as attempted
    connectionAttemptedRef.current = true;
    lastAttemptedSessionIdRef.current = sessionId;
    
    console.log('🌐 WebSocketProvider: Initiating connection to', sessionId);
    
    // Connect
    connect(sessionId).catch(err => {
      console.error('🌐 WebSocketProvider: Connection failed:', err);
      // Reset flag on failure to allow retry
      connectionAttemptedRef.current = false;
    });

    // Cleanup with accurate logging
    return () => {
      const currentSessionId = sessionId;
      const lastSessionId = lastAttemptedSessionIdRef.current;
      
      // Check if this is an actual session change
      if (currentSessionId !== lastSessionId) {
        console.log('🌐 WebSocketProvider: Session changed from', lastSessionId, 'to', currentSessionId);
        // Reset for new session
        connectionAttemptedRef.current = false;
        // Optionally disconnect from old session
        this.disconnect();
      } else {
        // This is just a component remount (StrictMode or HMR)
        console.log('🌐 WebSocketProvider: Component cleanup (remount detected, connection persists)');
        // Don't reset flags - let the guard prevent duplicate connection
      }
    };
    
  }, [sessionId]); // Only sessionId dependency
  
  // Provide wsClient for event subscriptions
  // Components can subscribe to events directly
  const value = {
    isConnected,
    sessionId: currentSessionId,
    disconnect,
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};