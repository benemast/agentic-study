frontend/src/providers/WebSocketProvider.jsx

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSession } from '../hooks/useSession';

// Create context
const WebSocketContext = createContext(null);

// Provider component
export const WebSocketProvider = ({ children }) => {
  const { sessionId } = useSession();
  
  // ✅ WebSocket connection lives here - never unmounts
  const {
    isConnected,
    sendChat,
    clearChat: clearChatRemote,
    on: wsOn,
  } = useWebSocket({ autoConnect: true });
  
  // Store wsOn in ref for stable access
  const wsOnRef = useRef(wsOn);
  
  useEffect(() => {
    wsOnRef.current = wsOn;
  }, [wsOn]);
  
  // ✅ Setup global WebSocket event listeners ONCE
  useEffect(() => {
    if (!isConnected) return;
    
    console.log('🌐 Global WebSocket listeners initialized');
    
    // You can add global listeners here if needed
    // Or leave event subscription to individual components
    
    return () => {
      console.log('🌐 Global WebSocket listeners cleaned up');
    };
  }, [isConnected]);
  
  const value = {
    isConnected,
    sendChat,
    clearChatRemote,
    wsOn: wsOnRef.current, // Provide stable ref
    sessionId,
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