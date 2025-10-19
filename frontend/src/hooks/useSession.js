// frontend/src/hooks/useSession.js
/**
 * Hook for session identity, lifecycle, and health monitoring
 * Combines sessionStore + websocketStore for unified health view
 */
import { useSessionStore } from '../store/sessionStore';
import useWebSocketStore from '../store/websocketStore';

export const useSession = () => {
  // ============================================================
  // SESSION STORE
  // ============================================================
  const sessionId = useSessionStore(state => state.sessionId);
  const participantId = useSessionStore(state => state.participantId);
  const isActive = useSessionStore(state => state.isSessionActive);
  const source = useSessionStore(state => state.sessionSource);
  const startTime = useSessionStore(state => state.sessionStartTime);
  const lastActivity = useSessionStore(state => state.lastActivity);
  const connectionStatus = useSessionStore(state => state.connectionStatus);
  const sessionError = useSessionStore(state => state.sessionError);
  const getSessionHealth = useSessionStore(state => state.getSessionHealth);
  
  // Sync status
  const syncStatus = useSessionStore(state => state.syncStatus);
  const lastSyncAt = useSessionStore(state => state.lastSyncAt);
  const pendingChanges = useSessionStore(state => state.pendingChanges);
  
  // Methods
  const initialize = useSessionStore(state => state.initializeSession);
  const end = useSessionStore(state => state.endSession);
  const updateActivity = useSessionStore(state => state.updateLastActivity);
  const clearError = useSessionStore(state => state.clearSessionError);
  const getShareableUrl = useSessionStore(state => state.getShareableUrl);
  
  // ============================================================
  // WEBSOCKET STORE (for connection health)
  // ============================================================
  const wsStatus = useWebSocketStore(state => state.connection.status);
  const wsError = useWebSocketStore(state => state.connection.error);
  const wsLatency = useWebSocketStore(state => state.health.latency);
  const wsIsHealthy = useWebSocketStore(state => state.health.isHealthy);
  const wsReconnectAttempts = useWebSocketStore(state => state.connection.reconnectAttempts);
  const wsLastConnectedAt = useWebSocketStore(state => state.connection.lastConnectedAt);
  const wsMessageQueueSize = useWebSocketStore(state => state.messageQueue.length);
  const wsTrackingQueueSize = useWebSocketStore(state => state.trackingQueue.length);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  // Overall health combines session + websocket
  const isFullyHealthy = 
    connectionStatus === 'online' && 
    !sessionError && 
    wsStatus === 'connected' &&
    wsIsHealthy;
  
  // Unified health object
  const sessionHealth = getSessionHealth();
  const health = {
    // Session health
    isActive,
    connectionStatus: connectionStatus,
    hasError: !!(sessionError || wsError),
    error: sessionError || (wsError ? { message: wsError, context: 'websocket' } : null),
    
    // WebSocket health
    ws: {
      status: wsStatus,
      isConnected: wsStatus === 'connected',
      isReconnecting: wsStatus === 'reconnecting',
      latency: wsLatency,
      isHealthy: wsIsHealthy,
      reconnectAttempts: wsReconnectAttempts,
      lastConnectedAt: wsLastConnectedAt,
      messageQueueSize: wsMessageQueueSize,
      trackingQueueSize: wsTrackingQueueSize,
      hasQueuedMessages: wsMessageQueueSize > 0 || wsTrackingQueueSize > 0,
    },
    
    // Combined status
    isFullyHealthy,
    
    // From session health
    ...sessionHealth,
  };
  
  // ============================================================
  // RETURN INTERFACE
  // ============================================================
  
  return {
    // Identity
    sessionId,
    participantId,
    isActive,
    source,
    
    // Timing
    startTime,
    lastActivity,
    
    // Status (unified view)
    connectionStatus: connectionStatus,
    error: sessionError || (wsError ? { message: wsError, context: 'websocket' } : null),
    isHealthy: isFullyHealthy,
    
    // Detailed health info
    health,
    
    // WebSocket specific (for components that need it)
    ws: {
      isConnected: wsStatus === 'connected',
      status: wsStatus,
      latency: wsLatency,
      error: wsError,
    },
    
    // Sync status
    syncStatus,
    isSynced: syncStatus === 'synced',
    lastSyncAt,
    hasPendingChanges: (pendingChanges?.length || 0) > 0,
    
    // Utilities
    shareUrl: getShareableUrl(),
    
    // Methods
    initialize,
    end,
    updateActivity,
    clearError,
  };
};

export default useSession;