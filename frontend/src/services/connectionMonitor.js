// frontend/src/services/connectionMonitor.js

/**
 * Connection Monitor Service
 * 
 * Monitors connection health from multiple sources:
 * - Browser online/offline events (navigator.onLine)
 * - WebSocket connection status
 * - WebSocket heartbeat health
 * 
 * Updates sessionStore with unified connection status
 */
import { useSessionStore } from '../store/sessionStore';
import useWebSocketStore from '../store/websocketStore';

// Logging configuration
const LOG_CONFIG = {
  enabled: import.meta.env.DEV, // Only log in development
  verbose: true, // Set to true for detailed debugging
  logStatusChanges: true, // Log when status actually changes
  logHealthUpdates: false, // Only log health changes if verbose
};

class ConnectionMonitor {
  constructor() {
    this.isInitialized = false;
    this.browserOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.lastConnectionStatus = null;
    this.statusUpdateTimeout = null;
    
    // Track previous values to prevent redundant logs
    this.lastLoggedHealth = null;
    this.lastLoggedWsStatus = null;
    
    // Error tolerance settings
    this.errorThreshold = 3;
    this.currentFailureCount = 0;
    this.lastSuccessfulCheck = Date.now();
    
    // Store unsubscribe functions
    this.unsubscribers = [];
    
    // Bind methods
    this.handleBrowserOnline = this.handleBrowserOnline.bind(this);
    this.handleBrowserOffline = this.handleBrowserOffline.bind(this);
  }
  
  // ===========================================================================
  // LOGGING HELPERS
  // ===========================================================================
  
  log(message, force = false) {
    if (LOG_CONFIG.enabled && (LOG_CONFIG.verbose || force)) {
      console.log(message);
    }
  }
  
  logStatusChange(newStatus) {
    if (LOG_CONFIG.enabled && LOG_CONFIG.logStatusChanges) {
      const statusEmoji = {
        'online': '✅',
        'offline': '📶',
        'reconnecting': '🔄',
        'error': '❌'
      };
      console.log(`${statusEmoji[newStatus] || '❓'} Connection: ${newStatus.toUpperCase()}`);
    }
  }
  
  // ===========================================================================
  // INITIALIZATION & CLEANUP
  // ===========================================================================
  
  start() {
    if (this.isInitialized) {
      console.log('ConnectionMonitor: Already running, skipping start');
      return;
    }
    
    this.setupBrowserListeners();
    this.setupWebSocketListeners();
    this.updateConnectionStatus(true);
    
    this.isInitialized = true;
  }
  
  stop() {
    if (!this.isInitialized) {
      console.log('ConnectionMonitor: Not running, skipping stop');
      return;
    }
    
    this.log('Stopping ConnectionMonitor...');
    
    // Cleanup browser listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleBrowserOnline);
      window.removeEventListener('offline', this.handleBrowserOffline);
    }
    
    // Cleanup WebSocket subscriptions
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Clear pending timeout
    if (this.statusUpdateTimeout) {
      clearTimeout(this.statusUpdateTimeout);
      this.statusUpdateTimeout = null;
    }
    
    // Reset counters
    this.currentFailureCount = 0;
    this.lastSuccessfulCheck = Date.now();
    this.lastLoggedHealth = null;
    this.lastLoggedWsStatus = null;
    
    this.isInitialized = false;
  }
  
  // ===========================================================================
  // BROWSER LISTENERS
  // ===========================================================================
  
  setupBrowserListeners() {
    if (typeof window === 'undefined') {
      return;
    }
    
    window.addEventListener('online', this.handleBrowserOnline);
    window.addEventListener('offline', this.handleBrowserOffline);
    
    this.log('📡 Browser listeners attached');
  }
  
  handleBrowserOnline() {
    this.log('🌐 Browser ONLINE', true);
    this.browserOnlineStatus = true;
    this.currentFailureCount = 0;
    this.lastSuccessfulCheck = Date.now();
    this.updateConnectionStatus(true);
  }
  
  handleBrowserOffline() {
    this.log('🌐 Browser OFFLINE', true);
    this.browserOnlineStatus = false;
    this.updateConnectionStatus(true);
  }
  
  // ===========================================================================
  // WEBSOCKET LISTENERS
  // ===========================================================================
  
  setupWebSocketListeners() {
    // WebSocket status subscription
    const wsStatusUnsubscribe = useWebSocketStore.subscribe(
      (state) => state.connection.status,
      (status) => {
        // Only log if status actually changed
        if (status !== this.lastLoggedWsStatus) {
          this.log(`🔌 WebSocket: ${status}`);
          this.lastLoggedWsStatus = status;
        }
        
        // Reset failure count on successful connection
        if (status === 'connected') {
          this.currentFailureCount = 0;
          this.lastSuccessfulCheck = Date.now();
        }
        
        this.updateConnectionStatus();
      }
    );
    
    // WebSocket health subscription
    const wsHealthUnsubscribe = useWebSocketStore.subscribe(
      (state) => ({ 
        isHealthy: state.health.isHealthy,
        consecutiveFailures: state.health.consecutiveFailures,
        lastHeartbeat: state.health.lastHeartbeat
      }),
      (health) => {
        // Only log if health actually changed
        const healthKey = `${health.isHealthy}-${health.consecutiveFailures}`;
        const shouldLog = healthKey !== this.lastLoggedHealth;
        
        if (shouldLog && LOG_CONFIG.logHealthUpdates) {
          this.log(`💓 Health: ${health.isHealthy ? 'healthy' : 'unhealthy'} (failures: ${health.consecutiveFailures})`);
          this.lastLoggedHealth = healthKey;
        }
        
        // Track failure count
        if (!health.isHealthy) {
          this.currentFailureCount = health.consecutiveFailures;
        } else {
          this.currentFailureCount = 0;
          this.lastSuccessfulCheck = Date.now();
        }
        
        this.updateConnectionStatus();
      }
    );
    
    this.unsubscribers.push(wsStatusUnsubscribe, wsHealthUnsubscribe);
    this.log('🔌 WebSocket listeners attached');
  }
  
  // ===========================================================================
  // CONNECTION STATUS LOGIC
  // ===========================================================================
  
  computeConnectionStatus() {
    const wsStore = useWebSocketStore.getState();
    const wsStatus = wsStore.connection.status;
    const wsIsHealthy = wsStore.health.isHealthy;
    const wsConsecutiveFailures = wsStore.health.consecutiveFailures;
    const wsReconnectAttempts = wsStore.connection.reconnectAttempts;
    
    // Browser offline (definitive)
    if (!this.browserOnlineStatus) {
      return 'offline';
    }
    
    // WebSocket reconnecting
    if (wsStatus === 'reconnecting') {
      if (wsReconnectAttempts >= 5) {
        return 'error';
      }
      return 'reconnecting';
    }
    
    // WebSocket error
    if (wsStatus === 'error') {
      const timeSinceLastSuccess = Date.now() - this.lastSuccessfulCheck;
      const isPersistentError = timeSinceLastSuccess > 30000; // 30 seconds
      
      return isPersistentError ? 'error' : 'reconnecting';
    }
    
    // WebSocket connected but unhealthy
    if (wsStatus === 'connected') {
      if (!wsIsHealthy && wsConsecutiveFailures >= this.errorThreshold) {
        const timeSinceLastSuccess = Date.now() - this.lastSuccessfulCheck;
        
        if (timeSinceLastSuccess < 15000) { // Less than 15 seconds
          return 'reconnecting';
        }
        
        return 'error';
      }
      
      return 'online';
    }
    
    // WebSocket not connected
    if (wsStatus === 'disconnected' || wsStatus === 'connecting') {
      return 'offline';
    }
    
    // Fallback
    return 'online';
  }
  
  updateConnectionStatus(immediate = false) {
    const newStatus = this.computeConnectionStatus();
    
    const applyUpdate = () => {
      // Only update and log if status actually changed
      if (newStatus !== this.lastConnectionStatus) {
        this.lastConnectionStatus = newStatus;
        useSessionStore.setState({ connectionStatus: newStatus });
        this.logStatusChange(newStatus);
      }
    };
    
    if (immediate) {
      if (this.statusUpdateTimeout) {
        clearTimeout(this.statusUpdateTimeout);
        this.statusUpdateTimeout = null;
      }
      applyUpdate();
    } else {
      // Debounce updates
      if (this.statusUpdateTimeout) {
        clearTimeout(this.statusUpdateTimeout);
      }
      this.statusUpdateTimeout = setTimeout(applyUpdate, 500);
    }
  }
  
  // ===========================================================================
  // PUBLIC API
  // ===========================================================================
  
  getStatus() {
    return this.lastConnectionStatus;
  }
  
  forceUpdate() {
    this.log('🔍 Forcing status check...', true);
    this.updateConnectionStatus(true);
  }
  
  resetErrors() {
    this.log('Resetting errors...', true);
    this.currentFailureCount = 0;
    this.lastSuccessfulCheck = Date.now();
    this.updateConnectionStatus(true);
  }
  
  getDiagnostics() {
    const wsStore = useWebSocketStore.getState();
    
    return {
      currentStatus: this.lastConnectionStatus,
      browserOnline: this.browserOnlineStatus,
      websocketStatus: wsStore.connection.status,
      websocketHealthy: wsStore.health.isHealthy,
      consecutiveFailures: wsStore.health.consecutiveFailures,
      reconnectAttempts: wsStore.connection.reconnectAttempts,
      lastSuccessfulCheck: new Date(this.lastSuccessfulCheck).toLocaleString(),
      timeSinceSuccess: Math.round((Date.now() - this.lastSuccessfulCheck) / 1000) + 's',
      logging: LOG_CONFIG
    };
  }
  
  // Enable/disable verbose logging at runtime
  setVerbose(enabled) {
    LOG_CONFIG.verbose = enabled;
    console.log(`Verbose logging ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  setHealthLogging(enabled) {
    LOG_CONFIG.logHealthUpdates = enabled;
    console.log(`Health logging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// ===========================================================================
// SINGLETON INSTANCE
// ===========================================================================

const connectionMonitor = new ConnectionMonitor();

// Expose for debugging
if (typeof window !== 'undefined') {
  window.__connectionMonitor = connectionMonitor;
}

export default connectionMonitor;
export { ConnectionMonitor };

// =============================================================================
// DEBUGGING COMMANDS
// =============================================================================

/**
 * Browser console commands:
 * 
 * // View diagnostics
 * __connectionMonitor.getDiagnostics()
 * 
 * // Enable verbose logging
 * __connectionMonitor.setVerbose(true)
 * 
 * // Enable health update logging
 * __connectionMonitor.setHealthLogging(true)
 * 
 * // Force update
 * __connectionMonitor.forceUpdate()
 * 
 * // Reset errors
 * __connectionMonitor.resetErrors()
 * 
 * // Test offline
 * dispatchEvent(new Event('offline'))
 * 
 * // Test back online
 * dispatchEvent(new Event('online'))
 */