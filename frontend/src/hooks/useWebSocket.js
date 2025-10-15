// frontend/src/hooks/useWebSocket.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '../services/websocket';
import { useSession } from './useSession';

/**
 * React hook for WebSocket communication
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {Array} options.subscribeChannels - Channels to auto-subscribe
 * @returns {Object} WebSocket state and methods
 */
export const useWebSocket = (options = {}) => {
  const { autoConnect = true, subscribeChannels = [] } = options;
  const { sessionId } = useSession();
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  
  const handlersRef = useRef(new Map());

  // Connect on mount
  useEffect(() => {
    if (autoConnect && sessionId && !isConnected) {
      connect();
    }

    return () => {
      // Cleanup handlers on unmount
      handlersRef.current.forEach((unsubscribe) => {
        unsubscribe();
      });
      handlersRef.current.clear();
    };
  }, [sessionId, autoConnect]);

  // Subscribe to channels
  useEffect(() => {
    if (isConnected && subscribeChannels.length > 0) {
      subscribeChannels.forEach(channel => {
        wsClient.subscribe(channel);
      });

      return () => {
        subscribeChannels.forEach(channel => {
          wsClient.unsubscribe(channel);
        });
      };
    }
  }, [isConnected, subscribeChannels]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    if (!sessionId) {
      console.warn('Cannot connect: no session ID');
      return;
    }

    try {
      await wsClient.connect(sessionId);
      setIsConnected(true);
      setConnectionError(null);
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      setConnectionError(err.message);
      setIsConnected(false);
    }
  }, [sessionId]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    wsClient.disconnect();
    setIsConnected(false);
  }, []);

  /**
   * Send message
   */
  const send = useCallback((message) => {
    return wsClient.send(message);
  }, []);

  /**
   * Subscribe to message type
   */
  const on = useCallback((eventType, handler) => {
    const unsubscribe = wsClient.on(eventType, (data) => {
      setLastMessage({ type: eventType, data, timestamp: Date.now() });
      handler(data);
    });
    
    handlersRef.current.set(eventType, unsubscribe);
    
    return unsubscribe;
  }, []);

  /**
   * Unsubscribe from message type
   */
  const off = useCallback((eventType) => {
    const unsubscribe = handlersRef.current.get(eventType);
    if (unsubscribe) {
      unsubscribe();
      handlersRef.current.delete(eventType);
    }
  }, []);

  // Connection status handlers
  useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    const handleError = (err) => setConnectionError(err.message);

    wsClient.on('connected', handleConnected);
    wsClient.on('disconnected', handleDisconnected);
    wsClient.on('error', handleError);

    return () => {
      wsClient.off('connected', handleConnected);
      wsClient.off('disconnected', handleDisconnected);
      wsClient.off('error', handleError);
    };
  }, []);

  return {
    // State
    isConnected,
    connectionError,
    lastMessage,
    
    // Methods
    connect,
    disconnect,
    send,
    on,
    off,
    
    // Convenience methods
    sendChat: wsClient.sendChatMessage.bind(wsClient),
    syncSession: wsClient.syncSession.bind(wsClient),
    trackEvent: wsClient.trackEvent.bind(wsClient),
    executeWorkflow: wsClient.executeWorkflow.bind(wsClient),
    cancelExecution: wsClient.cancelExecution.bind(wsClient),
    subscribe: wsClient.subscribe.bind(wsClient),
    unsubscribe: wsClient.unsubscribe.bind(wsClient),
  };
};

export default useWebSocket;