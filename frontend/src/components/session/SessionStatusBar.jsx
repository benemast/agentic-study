// frontend/src/components/session/SessionStatusBar.jsx
/**
 * Status bar showing session health and connection status
 */
import React, { useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession';

const SessionStatusBar = () => {
  const { connectionStatus, error, source, clearError } = useSession();
  const [showStatus, setShowStatus] = useState(false);

  // Auto-hide success messages
  useEffect(() => {
    if (source === 'url' || source === 'restored') {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [source]);

  // Show status for errors or connection issues
  useEffect(() => {
    if (error || connectionStatus !== 'online') {
      setShowStatus(true);
    }
  }, [error, connectionStatus]);

  if (!showStatus) return null;

  // Determine status bar style
  const getStatusBarStyle = () => {
    if (error || connectionStatus === 'error') {
      return 'bg-red-50 border-red-200 text-red-700';
    }
    if (connectionStatus === 'offline') {
      return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    }
    if (source === 'url' || source === 'restored') {
      return 'bg-green-50 border-green-200 text-green-700';
    }
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

  // Status message
  const getStatusMessage = () => {
    if (error) {
      return (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">Error: </span>
            {error.message}
            <span className="text-xs ml-2">({error.context})</span>
          </div>
          <button
            onClick={clearError}
            className="text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      );
    }
    
    if (connectionStatus === 'offline') {
      return '⚠️ You are offline. Data will sync when connection is restored.';
    }
    
    if (connectionStatus === 'error') {
      return '❌ Connection error. Retrying...';
    }
    
    if (source === 'url') {
      return '✅ Session restored from URL';
    }
    
    if (source === 'restored') {
      return '✅ Session restored from previous visit';
    }
    
    return null;
  };

  return (
    <div className={`border-b px-4 py-2 text-sm ${getStatusBarStyle()}`}>
      <div className="max-w-7xl mx-auto">
        {getStatusMessage()}
      </div>
    </div>
  );
};

export default SessionStatusBar;