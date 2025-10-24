// frontend/src/components/session/SessionStatusBar.jsx
/**
 * Status bar showing session health and connection status
 * Displays: session restoration, connection issues, sync status, errors
 */
import React, { useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession';

const SessionStatusBar = () => {
  const { connectionStatus, error, source, clearError, syncStatus, ws } = useSession();
  const [showStatus, setShowStatus] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Auto-hide success messages
  useEffect(() => {
    if (source === 'url' || source === 'restored') {
      setShowStatus(true);
      setShouldRender(true);
      const timer = setTimeout(() => setShowStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [source]);

  // Show status for errors or connection issues
  useEffect(() => {
    if (error || connectionStatus !== 'online' || syncStatus === 'pending') {
      setShowStatus(true);
      setShouldRender(true);
    } else if (connectionStatus === 'online' && !error && syncStatus !== 'pending') {
      // Auto-hide when everything is back to normal
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, connectionStatus, syncStatus]);

  // Handle unmounting after animation completes
  useEffect(() => {
    if (!showStatus && shouldRender) {
      const timer = setTimeout(() => setShouldRender(false), 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [showStatus, shouldRender]);

  // Status icon helper
  const getStatusIcon = () => {
    if (error || connectionStatus === 'error') return '❌';
    if (connectionStatus === 'reconnecting') return '🔄';
    if (connectionStatus === 'offline') return '⚠️';
    if (syncStatus === 'pending') return '⏳';
    if (source === 'url' || source === 'restored') return '✅';
    return 'ℹ️';
  };

  // Status message with all possible states
  const getStatusMessage = () => {
    // Priority 1: Error messages
    if (error) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon()}</span>
            <div>
              <span className="font-medium">Error: </span>
              {error.message}
              {error.context && (
                <span className="text-xs ml-2">({error.context})</span>
              )}
            </div>
          </div>
          <button
            onClick={clearError}
            className="text-sm underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      );
    }
    
    // Priority 2: Connection states
    if (connectionStatus === 'reconnecting') {
      const attempt = ws?.reconnectAttempts || 1;
      return (
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>
            Reconnecting... (attempt {attempt})
          </span>
        </div>
      );
    }
    
    if (connectionStatus === 'error') {
      return (
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>Connection error. Retrying...</span>
        </div>
      );
    }
    
    if (connectionStatus === 'offline') {
      return (
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>You are offline. Data will sync when connection is restored.</span>
        </div>
      );
    }
    
    // Priority 3: Sync status
    if (syncStatus === 'pending') {
      return (
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>Syncing changes...</span>
        </div>
      );
    }
    
    // Priority 4: Success messages (session restoration)
    if (source === 'url') {
      return (
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>Session restored from URL</span>
        </div>
      );
    }
    
    if (source === 'restored') {
      return (
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon()}</span>
          <span>Session restored from previous visit</span>
        </div>
      );
    }
    
    return null;
  };

  // Determine status bar style based on priority
  const getStatusBarStyle = () => {
    // Priority 1: Errors (red)
    if (error || connectionStatus === 'error') {
      return 'bg-red-50 border-red-200 text-red-700';
    }
    
    // Priority 2: Reconnecting (blue)
    if (connectionStatus === 'reconnecting') {
      return 'bg-blue-50 border-blue-200 text-blue-700';
    }
    
    // Priority 3: Offline (yellow)
    if (connectionStatus === 'offline') {
      return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    }
    
    // Priority 4: Syncing (blue)
    if (syncStatus === 'pending') {
      return 'bg-blue-50 border-blue-200 text-blue-700';
    }
    
    // Priority 5: Success messages (green)
    if (source === 'url' || source === 'restored') {
      return 'bg-green-50 border-green-200 text-green-700';
    }
    
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

  // Get message and early return if none
  const message = getStatusMessage();
  if (!message || !shouldRender) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 border-b px-4 py-2 text-sm ${getStatusBarStyle()} shadow-md
        transition-all duration-300 ease-in-out
        ${showStatus ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
    >
      <div className="max-w-7xl mx-auto">
        {message}
        {/* Optional: Show latency when online */}
        {connectionStatus === 'online' && ws?.latency && (
          <span className="ml-2 text-xs opacity-75">
            ({ws.latency}ms)
          </span>
        )}
      </div>
    </div>
  );
};

export default SessionStatusBar;