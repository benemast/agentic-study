// frontend/src/hooks/useSession.js
/**
 * Hook for accessing session data and methods
 * Simplified interface to the session store
 */
import { useSessionStore } from '../store/sessionStore';
import useWebSocketStore from '../store/websocketStore';

export const useSession = () => {
  const store = useSessionStore();
  const wsStore = useWebSocketStore((state) => ({
    wsConnected: state.connection.status === 'connected',
    wsLatency: state.health.latency
  }));
  
  return {
    // Session identity
    sessionId: store.sessionId,
    participantId: store.participantId,
    isActive: store.isSessionActive,
    source: store.sessionSource,
    
    // Timing
    startTime: store.sessionStartTime,
    lastActivity: store.lastActivity,
    
    // Health
    connectionStatus: store.connectionStatus,
    error: store.sessionError,
    health: {
      ...store.getSessionHealth(),
      wsConnected: wsStore.wsConnected,
      wsLatency: wsStore.wsLatency
    },
    isHealthy: store.connectionStatus === 'online' && !store.sessionError && wsStore.wsConnected,
    
    // Sync status
    syncStatus: store.syncStatus,
    isSynced: store.syncStatus === 'synced',
    isHealthy: store.connectionStatus === 'online' && !store.sessionError,
    
    // Utilities
    shareUrl: store.getShareableUrl(),
    
    // Methods
    initialize: store.initializeSession,
    end: store.endSession,
    updateActivity: store.updateLastActivity,
    clearError: store.clearSessionError,
  };
};

export default useSession;