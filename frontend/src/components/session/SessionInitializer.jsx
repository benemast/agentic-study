// frontend/src/components/session/SessionInitializer.jsx
/**
 * Handles session initialization and lifecycle management
 * Separated from SessionManager for better organization
 * - Initialize session on mount
 * - Detect lifecycle events (visibility, unload)
 * - Update lifecycle state → Other systems react
 * - Auto-save and sync management
 * - Activity tracking
 */
import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '../../hooks/useSession';
import { useSessionData } from '../../hooks/useSessionData';
import { useWebSocketContext } from '../../providers/WebSocketProvider';
import { SESSION_CONFIG } from '../../config/constants';
import { getSessionIdFromUrl } from '../../utils/sessionHelpers';
import connectionMonitor from '../../services/connectionMonitor';
import SessionStatusBar from './SessionStatusBar';

const SessionInitializer = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const initRef = useRef(false);
  
  // USE HOOKS
  const { sessionId, initialize, connectionStatus, updateActivity } = useSession();
  const { quickSave, syncSessionData, setAppVisible } = useSessionData();
  const { isConnected: isWebSocketConnected } = useWebSocketContext();

  // Store functions in refs to avoid re-running effects
  const quickSaveRef = useRef(quickSave);
  const syncSessionDataRef = useRef(syncSessionData);
  const updateLastActivityRef = useRef(updateActivity);
  
  // Keep refs updated
  useEffect(() => {
    quickSaveRef.current = quickSave;
    syncSessionDataRef.current = syncSessionData;
    updateLastActivityRef.current = updateActivity;
  });
  // ========================================
  // SESSION INITIALIZATION
  // ========================================
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const initSession = async () => {
      try {
        console.log('🚀 SessionInitializer: Starting session initialization...');
        await initialize();
        setIsInitialized(true);
        console.log('✅ SessionInitializer: Session initialized');
      } catch (error) {
        console.error('❌ SessionInitializer: Session initialization failed:', error);
        setInitError(error.message);
        setIsInitialized(true);
      }
    };

    initSession();
  }, [initialize]);

  // ========================================
  // CONNECTION MONITOR INITIALIZATION (AFTER SESSION + WEBSOCKET)
  // ========================================  
  useEffect(() => {
    // Wait for session AND WebSocket to be ready
    if (!isInitialized || !sessionId) {
      console.log('⏳ ConnectionMonitor: Waiting for session initialization...');
      return;
    }
    
    if (!isWebSocketConnected) {
      console.log('⏳ ConnectionMonitor: Waiting for WebSocket connection...');
      return;
    }
    
    // start when everything is ready
    console.log('🌐 ConnectionMonitor: Session and WebSocket ready, starting monitor...');
    connectionMonitor.start();
    
    return () => {
      console.log('🛑 ConnectionMonitor: Stopping...');
      connectionMonitor.stop();
    };
  }, [isInitialized, sessionId, isWebSocketConnected]); //listen for changes in session and WebSocket connections

  // ========================================
  // LIFECYCLE: Visibility Changes
  // Detect event → Update state → Systems react
  // ========================================
  useEffect(() => {
    // Don't set up lifecycle handlers until initialized
    if (!isInitialized) return;
    
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      console.log(`App ${isVisible ? 'visible' : 'hidden'}`);
      
      // Update application lifecycle state
      // websocketStore and other systems subscribe to this
      setAppVisible(isVisible);
      
      if (isVisible) {
        // App became visible - update activity and force connection check
        updateLastActivityRef.current?.();
        connectionMonitor.forceUpdate();
      } else {
        // App hidden - quick save session data
        console.log('💾 App hidden - quick saving');
        quickSaveRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isInitialized]);

  // ========================================
  // LIFECYCLE: Page Unload
  // ========================================
  useEffect(() => {
    // Don't set up unload handler until initialized
    if (!isInitialized) return;
    
    const handleBeforeUnload = () => {
      console.log('💾 Page unloading - final save');
      quickSaveRef.current?.();
      // Note: WebSocket cleanup happens automatically in websocketStore
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInitialized]);

  // ========================================
  // HEARTBEAT (Session activity tracking)
  // Note: This is different from WebSocket heartbeat
  // This tracks user activity for session timeout
  // ========================================
  useEffect(() => {
    // Don't start heartbeat until initialized
    if (!isInitialized || !sessionId) return;
    
    console.log('💓 Starting session heartbeat...');
    
    const heartbeatInterval = setInterval(() => {
      updateLastActivityRef.current?.();
      
      if (connectionStatus !== 'online') {
        console.log('💓 User active but offline - changes queued for sync');
      }
    }, SESSION_CONFIG.HEARTBEAT_INTERVAL);

    return () => {
      console.log('💓 Stopping session heartbeat');
      clearInterval(heartbeatInterval);
    };
  }, [isInitialized, sessionId, connectionStatus]);

  // ========================================
  // LOADING STATE
  // ========================================
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Initializing Study Session
            </h2>
            <p className="text-gray-600">
              {getSessionIdFromUrl() 
                ? 'Restoring your session...' 
                : 'Setting up your research session...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================
  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Session Initialization Error
            </h2>
            <p className="text-gray-600 mb-4">
              {initError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // SUCCESS - Render app with status bar
  // ========================================
  return (
    <>
      <SessionStatusBar />
      {children}
    </>
  );
};

export default SessionInitializer;