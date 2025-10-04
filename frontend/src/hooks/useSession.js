// frontend/src/hooks/useSession.js
/**
 * Hook for accessing session data and methods
 * Simplified interface to the session store
 */
import { useSessionStore } from '../store/sessionStore';

export const useSession = () => {
  const store = useSessionStore();
  
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
    health: store.getSessionHealth(),
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