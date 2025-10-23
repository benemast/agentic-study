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
import { useSessionStore } from '../../store/sessionStore';
import { SESSION_CONFIG } from '../../config/constants';
import { getSessionIdFromUrl } from '../../utils/sessionHelpers';
import connectionMonitor from '../../services/connectionMonitor';

import SessionStatusBar from './SessionStatusBar';

const SessionInitializer = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const initRef = useRef(false);
  
  const { initialize, connectionStatus } = useSession();
  
  // Store functions in refs to avoid re-running effects
  const quickSaveRef = useRef(useSessionStore.getState().quickSave);
  const syncSessionDataRef = useRef(useSessionStore.getState().syncSessionData);
  const updateLastActivityRef = useRef(useSessionStore.getState().updateLastActivity);
  
  // Keep refs updated
  useEffect(() => {
    quickSaveRef.current = useSessionStore.getState().quickSave;
    syncSessionDataRef.current = useSessionStore.getState().syncSessionData;
    updateLastActivityRef.current = useSessionStore.getState().updateLastActivity;
  });

  // ========================================
  // CONNECTION MONITOR INITIALIZATION
  // ========================================
  useEffect(() => {
    connectionMonitor.start();
    return () => connectionMonitor.stop();
  }, []);

  // ========================================
  // SESSION INITIALIZATION
  // ========================================
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const initSession = async () => {
      try {
        await initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Session initialization failed:', error);
        setInitError(error.message);
        setIsInitialized(true);
      }
    };

    initSession();
  }, [initialize]);

  // ========================================
  // LIFECYCLE: Visibility Changes
  // Detect event → Update state → Systems react
  // ========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      console.log(`App ${isVisible ? 'visible' : 'hidden'}`);
      
      // Update application lifecycle state
      // websocketStore and other systems subscribe to this
      useSessionStore.getState().setAppVisible(isVisible);
      
      if (isVisible) {
        // App became visible - update activity and force connection check
        updateLastActivityRef.current();
        connectionMonitor.forceUpdate();
      } else {
        // App hidden - save session data
        console.log('💾 App hidden - quick saving');
        quickSaveRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ========================================
  // LIFECYCLE: Page Unload
  // ========================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('💾 Page unloading - final save');
      quickSaveRef.current();
      // Note: WebSocket cleanup happens automatically in websocketStore
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ========================================
  // HEARTBEAT (Session activity tracking)
  // Note: This is different from WebSocket heartbeat
  // This tracks user activity for session timeout
  // ========================================
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      updateLastActivityRef.current();
      
      // Optional: Log connection context for debugging
      if (connectionStatus !== 'online') {
        console.log('💓 User active but offline - changes queued for sync');
      }
    }, SESSION_CONFIG.HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeatInterval);
  }, [connectionStatus]);

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
              {getSessionIdFromUrl() ? 'Restoring your session...' : 'Setting up your research session...'}
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