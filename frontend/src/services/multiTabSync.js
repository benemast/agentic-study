// frontend/src/services/multiTabSync.js

/**
 * Multi-Tab Synchronization Service
 * 
 * Synchronizes state across browser tabs using:
 * - BroadcastChannel API (modern browsers)
 * - localStorage events (fallback for older browsers)
 * 
 * Features:
 * - Automatic fallback to localStorage
 * - Ignores messages from self
 * - React-friendly unsubscribe pattern
 * - Lightweight and efficient
 * 
 * Usage:
 *   import multiTabSync from './services/multiTabSync';
 *   
 *   // Broadcast to other tabs
 *   multiTabSync.broadcast('chat_message', { text: 'Hello' });
 *   
 *   // Subscribe to messages from other tabs
 *   const unsubscribe = multiTabSync.subscribe((event) => {
 *     console.log('Other tab:', event);
 *   });
 *   
 *   // Cleanup
 *   unsubscribe();
 */

class MultiTabSync {
  constructor() {
    this.connectionId = this.generateConnectionId();
    this.subscribers = [];
    this.method = null;
    this.channel = null;
    
    this.initialize();
  }
  
  /**
   * Initialize the sync method
   */
  initialize() {
    // Try BroadcastChannel first (modern browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      this.useBroadcastChannel();
    } 
    // Fallback to localStorage
    else if (typeof localStorage !== 'undefined' && typeof window !== 'undefined') {
      this.useLocalStorage();
    } 
    // No support
    else {
      console.warn('Multi-tab sync not supported in this environment');
      this.method = 'none';
    }
  }
  
  /**
   * Generate unique connection ID for this tab
   */
  generateConnectionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Setup BroadcastChannel (preferred method)
   */
  useBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel('app_sync');
      this.method = 'BroadcastChannel';
      
      this.channel.onmessage = (event) => {
        // Ignore messages from self
        if (event.data.connectionId === this.connectionId) {
          return;
        }
        
        this.notifySubscribers(event.data);
      };
      
      this.channel.onerror = (error) => {
        console.error('BroadcastChannel error:', error);
      };
      
    } catch (error) {
      console.error('Failed to setup BroadcastChannel:', error);
      // Try localStorage fallback
      this.useLocalStorage();
    }
  }
  
  /**
   * Setup localStorage fallback (older browsers)
   */
  useLocalStorage() {
    this.method = 'localStorage';
    
    const handleStorageEvent = (event) => {
      // Only listen to our key
      if (event.key !== 'app_sync') return;
      
      // Ignore if no new value (deletion)
      if (!event.newValue) return;
      
      try {
        const data = JSON.parse(event.newValue);
        
        // Ignore messages from self
        if (data.connectionId === this.connectionId) {
          return;
        }
        
        this.notifySubscribers(data);
      } catch (err) {
        console.error('Failed to parse storage event:', err);
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    // Store handler for cleanup
    this.storageHandler = handleStorageEvent;
    
  }
  
  /**
   * Broadcast message to other tabs
   * @param {string} type - Message type
   * @param {*} data - Message data
   */
  broadcast(type, data) {
    if (this.method === 'none') {
      return; // No sync available
    }
    
    const message = {
      type,
      data,
      connectionId: this.connectionId,
      timestamp: Date.now()
    };
    
    if (this.method === 'BroadcastChannel') {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        console.error('Failed to broadcast via BroadcastChannel:', error);
      }
    } 
    else if (this.method === 'localStorage') {
      try {
        localStorage.setItem('app_sync', JSON.stringify(message));
        
        // Clean up after broadcast (localStorage events persist)
        setTimeout(() => {
          try {
            const current = localStorage.getItem('app_sync');
            const currentData = current ? JSON.parse(current) : null;
            
            // Only remove if it's our message
            if (currentData && currentData.connectionId === this.connectionId) {
              localStorage.removeItem('app_sync');
            }
          } catch (err) {
            // Ignore cleanup errors
          }
        }, 100);
      } catch (err) {
        console.error('Failed to broadcast via localStorage:', err);
      }
    }
  }
  
  /**
   * Subscribe to messages from other tabs
   * @param {Function} callback - Callback function(event)
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.subscribers.push(callback);
    
    // Return unsubscribe function (React-friendly!)
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all subscribers of new message
   * @param {Object} data - Message data
   */
  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error('Error in multi-tab sync subscriber:', err);
      }
    });
  }
  
  /**
   * Get connection ID for this tab
   * @returns {string} Connection ID
   */
  getConnectionId() {
    return this.connectionId;
  }
  
  /**
   * Get sync method being used
   * @returns {string} 'BroadcastChannel' | 'localStorage' | 'none'
   */
  getMethod() {
    return this.method;
  }
  
  /**
   * Check if multi-tab sync is supported
   * @returns {boolean} True if supported
   */
  isSupported() {
    return this.method !== 'none';
  }
  
  /**
   * Get number of active subscribers
   * @returns {number} Subscriber count
   */
  getSubscriberCount() {
    return this.subscribers.length;
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    
    // Close BroadcastChannel
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    
    // Remove localStorage listener
    if (this.storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    
    // Clear subscribers
    this.subscribers = [];
  }
}

// ============================================================
// CREATE SINGLETON INSTANCE
// ============================================================

const multiTabSync = new MultiTabSync();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    multiTabSync.cleanup();
  });
}

// ============================================================
// EXPORT
// ============================================================

export { multiTabSync, MultiTabSync };
export default multiTabSync;