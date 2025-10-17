// frontend/src/components/session/SessionInitializer.jsx
/**
 * Handles session initialization and lifecycle management
 * Separated from SessionManager for better organization
 */
import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '../../hooks/useSession';
import { useSessionStore } from '../../store/sessionStore';
import { SESSION_CONFIG } from '../../config/constants';
import { getSessionIdFromUrl } from '../../utils/sessionHelpers';

import SessionStatusBar from './SessionStatusBar';

const SessionInitializer = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const initRef = useRef(false);
  
  const { initialize } = useSession();
  
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

  // Initialize session once on mount
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

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      quickSaveRef.current();
    };

    const handleUnload = () => {
      quickSaveRef.current();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  // Periodic sync
  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncSessionDataRef.current();
    }, SESSION_CONFIG.AUTO_SAVE_INTERVAL);

    return () => clearInterval(syncInterval);
  }, []);

  // Heartbeat to update activity
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      updateLastActivityRef.current();
    }, SESSION_CONFIG.HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeatInterval);
  }, []);

  // Page visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible again');
        updateLastActivityRef.current();
      } else {
        console.log('Page hidden, quick saving...');
        quickSaveRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Online/offline handling
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online');
      updateLastActivityRef.current();
      useSessionStore.setState({ connectionStatus: 'online' });
    };

    const handleOffline = () => {
      console.log('Gone offline');
      quickSaveRef.current();
      useSessionStore.setState({ connectionStatus: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Loading state
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

  // Error state
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

  // Success - render app with status bar
  return (
    <>
      <SessionStatusBar />
      {children}
    </>
  );
};

export default SessionInitializer;