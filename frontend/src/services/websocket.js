// frontend/src/services/websocket.js
import { API_CONFIG, SESSION_CONFIG } from '../config/constants';

/**
 * Enhanced WebSocket Client with custom event system
 * 
 * Features:
 * - React-friendly event subscriptions (returns unsubscribe functions)
 * - Request-response pattern with promises
 * - Message caching for offline support
 * - Batch request support
 * - Auto-reconnection with exponential backoff
 * - Message queuing
 * - Rate limiting
 * - Multi-tab synchronization
 */
class WebSocketClient {
  constructor() {
    // Connection state
    this.ws = null;
    this.sessionId = null;
    this.connectionId = null;
    this.isConnected = false;
    this.connectionPromise = null;
    
    // Reconnection
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;
    
    // Event handling
    this.eventHandlers = new Map();
    
    // Request tracking
    this.pendingRequests = new Map();
    this.requestCounter = 0;
    this.requestTimeout = 10000; // 10 seconds default
    
    // Message queue
    this.messageQueue = [];
    this.maxQueueSize = 100;
    
    // Batch support
    this.batchQueue = [];
    this.batchTimer = null;
    this.batchDelay = 50; // 50ms batching window
    this.maxBatchSize = 10;
    
    // Rate limiting
    this.rateLimitWindow = 60000; // 1 minute
    this.maxRequestsPerWindow = 100;
    this.requestTimestamps = [];
    
    // Caching
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Heartbeat
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.lastPongTime = Date.now();
    this.pingInterval = 30000; // 30 seconds
    
    // Metrics
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      errorsCount: 0,
      reconnectsCount: 0
    };
    
    // Initialize
    this.setupEventHandlers();
  }

  // ============================================================
  // CUSTOM EVENT SYSTEM (React-friendly)
  // ============================================================
  
  /**
   * Subscribe to event
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function (React-friendly!)
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType).push(handler);
    
    // Return unsubscribe function (React useEffect cleanup pattern)
    return () => this.off(eventType, handler);
  }
  
  /**
   * Unsubscribe from event
   * @param {string} eventType - Event type to unsubscribe from
   * @param {Function} handler - Event handler function to remove
   */
  off(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) return;
    
    const handlers = this.eventHandlers.get(eventType);
    const index = handlers.indexOf(handler);
    
    if (index > -1) {
      handlers.splice(index, 1);
    }
    
    // Clean up empty arrays
    if (handlers.length === 0) {
      this.eventHandlers.delete(eventType);
    }
  }
  
  /**
   * Subscribe to event (fires once then unsubscribes)
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(eventType, handler) {
    const wrappedHandler = (data) => {
      handler(data);
      this.off(eventType, wrappedHandler);
    };
    
    return this.on(eventType, wrappedHandler);
  }
  
  /**
   * Emit event to all registered handlers
   * @param {string} eventType - Event type to emit
   * @param {*} data - Data to pass to handlers
   */
  emit(eventType, data) {
    if (!this.eventHandlers.has(eventType)) return;
    
    const handlers = this.eventHandlers.get(eventType);
    
    // Create a copy to avoid issues if handlers modify the array
    const handlersCopy = [...handlers];
    
    handlersCopy.forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event handler for "${eventType}":`, err);
        this.metrics.errorsCount++;
      }
    });
  }
  
  /**
   * Remove all listeners for an event type
   * @param {string} eventType - Event type to clear (optional, clears all if not provided)
   */
  removeAllListeners(eventType) {
    if (eventType) {
      this.eventHandlers.delete(eventType);
    } else {
      this.eventHandlers.clear();
    }
  }
  
  /**
   * Get count of listeners for an event type
   * @param {string} eventType - Event type to count
   * @returns {number} Number of listeners
   */
  listenerCount(eventType) {
    return this.eventHandlers.get(eventType)?.length || 0;
  }

  // ============================================================
  // LIFECYCLE SETUP
  // ============================================================
  
  /**
   * Setup internal event handlers
   */
  setupEventHandlers() {
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
      
      // Handle visibility changes
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stopHeartbeat();
          } else if (this.isConnected) {
            this.startHeartbeat();
          }
        });
      }
      
      // Multi-tab synchronization via localStorage
      window.addEventListener('storage', (e) => {
        if (e.key === 'ws_broadcast') {
          try {
            const data = JSON.parse(e.newValue || '{}');
            if (data.sessionId === this.sessionId && data.connectionId !== this.connectionId) {
              this.emit('external_update', data);
            }
          } catch (err) {
            console.error('Failed to parse storage event:', err);
          }
        }
      });
    }
  }

  // ============================================================
  // CONNECTION MANAGEMENT
  // ============================================================
  
  /**
   * Connect to WebSocket server
   */
  async connect(sessionId, options = {}) {
    if (this.isConnected && this.sessionId === sessionId) {
      console.log('Already connected to session:', sessionId);
      return Promise.resolve();
    }
    
    // If already connecting, return existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.sessionId = sessionId;
    this.connectionId = `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wsUrl = API_CONFIG.BASE_URL.replace('http', 'ws') + `/ws/${sessionId}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Process queued messages
          this.processQueue();
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Emit connection event
          this.emit('connected', { sessionId, connectionId: this.connectionId });
          
          this.connectionPromise = null;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
            this.metrics.messagesReceived++;
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
            this.metrics.errorsCount++;
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.metrics.errorsCount++;
          this.emit('error', error);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          
          // Clear pending requests
          this.pendingRequests.forEach(({ reject }) => {
            reject(new Error('Connection closed'));
          });
          this.pendingRequests.clear();
          
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Auto-reconnect if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
          
          this.connectionPromise = null;
          if (event.code !== 1000) {
            reject(new Error(`WebSocket closed: ${event.reason}`));
          }
        };
        
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        this.connectionPromise = null;
        reject(err);
      }
    });
    
    return this.connectionPromise;
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    console.log('Disconnecting WebSocket...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.isConnected = false;
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.sessionId = null;
  }

  // ============================================================
  // MESSAGE HANDLING
  // ============================================================
  
  /**
   * Handle incoming message
   */
  handleMessage(message) {
    const { type, request_id } = message;
    
    // Clear heartbeat timeout when receiving ANY message
    // This prevents timeout during active communication
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    // Handle heartbeat response
    if (type === 'heartbeat' ||type === 'heartbeat_ack' || type === 'pong') {
      this.metrics.lastPongAt = Date.now();
      return;
    }

    // Handle request-response pattern
    if (type === 'response' && request_id) {
      const pending = this.pendingRequests.get(request_id);
      if (pending) {
        if (message.status === 'success') {
          pending.resolve(message.data);
        } else {
          pending.reject(new Error(message.error || 'Request failed'));
        }
        this.pendingRequests.delete(request_id);
        return;
      }
    }
    
    // Handle batch responses
    if (type === 'batch_response' && message.batch_id) {
      const pending = this.pendingRequests.get(message.batch_id);
      if (pending) {
        pending.resolve(message.results);
        this.pendingRequests.delete(message.batch_id);
        return;
      }
    }
    
    // Handle broadcasts for multi-tab sync
    if (type === 'chat_message_updated' || type === 'chat_cleared' || type === 'session_synced') {
      this.broadcastToOtherTabs(message);
    }
    
    // Emit specific event type
    this.emit(type, message);
    
    // Also emit general message event
    this.emit('message', message);
  }

  /**
   * Send a message
   */
  async send(message, options = {}) {
    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please slow down.');
    }
    
    // Queue if not connected
    if (!this.isConnected) {
      if (options.queue !== false) {
        this.queueMessage(message);
        return;
      }
      throw new Error('WebSocket is not connected');
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      this.metrics.messagesSent++;
    } catch (err) {
      console.error('Failed to send message:', err);
      this.metrics.errorsCount++;
      
      if (options.queue !== false) {
        this.queueMessage(message);
      }
      throw err;
    }
  }

  /**
   * Make a request and wait for response
   */
  async request(type, data = {}, options = {}) {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const timeout = options.timeout || this.requestTimeout;
    
    // Check cache first
    const cacheKey = `${type}:${JSON.stringify(data)}`;
    if (options.cache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    return new Promise((resolve, reject) => {
      // Set timeout
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timer);
          
          // Cache result
          if (options.cache !== false) {
            this.setCache(cacheKey, result);
          }
          
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });
      
      // Send request
      this.send({
        type,
        request_id: requestId,
        ...data
      }).catch(reject);
    });
  }

  /**
   * Batch multiple requests
   */
  async batchRequest(requests, options = {}) {
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error('Invalid batch request');
    }
    
    const batchId = `batch_${++this.requestCounter}_${Date.now()}`;
    const timeout = options.timeout || this.requestTimeout * 2;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(batchId);
        reject(new Error('Batch request timeout'));
      }, timeout);
      
      this.pendingRequests.set(batchId, {
        resolve: (results) => {
          clearTimeout(timer);
          resolve(results);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });
      
      // Send batch request
      this.send({
        type: 'batch',
        batch_id: batchId,
        requests: requests.map(req => ({
          ...req,
          request_id: `${batchId}_${req.type}_${Date.now()}`
        }))
      }).catch(reject);
    });
  }

  /**
   * Queue a request for batching
   */
  queueForBatch(type, data = {}, options = {}) {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        type,
        data,
        options,
        resolve,
        reject
      });
      
      // Process batch after delay
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      
      this.batchTimer = setTimeout(() => {
        this.processBatchQueue();
      }, this.batchDelay);
      
      // Process immediately if batch is full
      if (this.batchQueue.length >= this.maxBatchSize) {
        clearTimeout(this.batchTimer);
        this.processBatchQueue();
      }
    });
  }

  /**
   * Process batch queue
   */
  async processBatchQueue() {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.splice(0, this.maxBatchSize);
    
    try {
      const results = await this.batchRequest(
        batch.map(item => ({
          type: item.type,
          ...item.data
        }))
      );
      
      // Resolve individual promises
      batch.forEach((item, index) => {
        if (results[index]) {
          if (results[index].status === 'success') {
            item.resolve(results[index].data);
          } else {
            item.reject(new Error(results[index].error));
          }
        }
      });
    } catch (err) {
      // Reject all promises in batch
      batch.forEach(item => item.reject(err));
    }
  }

  // ============================================================
  // CACHE MANAGEMENT
  // ============================================================
  
  /**
   * Get from cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  // ============================================================
  // QUEUE MANAGEMENT
  // ============================================================
  
  /**
   * Queue message
   */
  queueMessage(message) {
    this.messageQueue.push({
      ...message,
      queued_at: Date.now()
    });
    
    // Limit queue size
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue.shift();
    }
  }

  /**
   * Process message queue
   */
  async processQueue() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        await this.send(message, { queue: false });
      } catch (err) {
        console.error('Failed to send queued message:', err);
        // Re-queue on failure
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================
  
  /**
   * Check rate limit
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Remove timestamps outside window
    this.requestTimestamps = this.requestTimestamps.filter(
      t => now - t < this.rateLimitWindow
    );
    
    // Check if under limit
    if (this.requestTimestamps.length >= this.maxRequestsPerWindow) {
      return false;
    }
    
    this.requestTimestamps.push(now);
    return true;
  }

  // ============================================================
  // RECONNECTION
  // ============================================================
  
  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    this.metrics.reconnectsCount++;
    
    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 1.5,
      this.maxReconnectDelay
    );
    
    console.log(`Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.sessionId) {
        this.connect(this.sessionId);
      }
    }, this.reconnectDelay);
  }

  // ============================================================
  // HEARTBEAT
  // ============================================================
  
  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'heartbeat' }).catch(console.error);
        
        //  Clear any existing timeout first
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
          this.heartbeatTimeout = null;
        }
                
        // Check for pong timeout
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout after {SESSION_CONFIG.HEARTBEAT_TIMEOUT / 1000 }s, reconnecting...');
          if (this.ws) {
            this.ws.close(4000, 'Heartbeat timeout');
          }
        }, SESSION_CONFIG.HEARTBEAT_TIMEOUT);
      }
    }, SESSION_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // ============================================================
  // MULTI-TAB SYNCHRONIZATION
  // ============================================================
  
  /**
   * Broadcast to other tabs
   */
  broadcastToOtherTabs(data) {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem('ws_broadcast', JSON.stringify({
        ...data,
        sessionId: this.sessionId,
        connectionId: this.connectionId,
        timestamp: Date.now()
      }));
      
      // Clean up after broadcast
      setTimeout(() => {
        localStorage.removeItem('ws_broadcast');
      }, 100);
    } catch (err) {
      console.error('Failed to broadcast to other tabs:', err);
    }
  }

  // ============================================================
  // METRICS
  // ============================================================
  
  /**
   * Get client metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      queuedMessages: this.messageQueue.length,
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.cache.size,
      reconnectAttempts: this.reconnectAttempts,
      activeListeners: Array.from(this.eventHandlers.entries()).map(([event, handlers]) => ({
        event,
        count: handlers.length
      }))
    };
  }

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================
  
  // Session operations
  async updateSession(data) {
    return this.request('session_update', { data });
  }
  
  async getSession() {
    return this.request('session_get');
  }
  
  async endSession(data = {}) {
    return this.request('session_end', { data });
  }
  
  // Chat operations
  async getChatHistory(limit = 50, offset = 0) {
    return this.request('chat_history', { limit, offset }, { cache: true });
  }
  
  async sendChatMessage(content, context = []) {
    return this.send({
      type: 'chat',
      content,
      messages: context,
      timestamp: new Date().toISOString()
    });
  }
  
  async updateChatMessage(messageId, content) {
    return this.request('chat_update', { message_id: messageId, content });
  }
  
  async clearChat() {
    this.clearCache(); // Clear cached history
    return this.request('chat_clear');
  }
  
  // Tracking operations
  async trackEvent(eventType, eventData = {}) {
    // Use batching for non-critical events
    if (eventData.priority !== 'high') {
      return this.queueForBatch('track', {
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString()
      });
    }
    
    return this.send({
      type: 'track',
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString()
    });
  }
  
  async trackBatch(events) {
    return this.request('track_batch', { events });
  }
  
  async getInteractions(limit = 100, offset = 0, eventType = null) {
    return this.request('get_interactions', { limit, offset, event_type: eventType });
  }
  
  // Workflow operations
  async executeWorkflow(workflow, inputData = {}, condition = 'workflow_builder') {
    return this.send({
      type: 'workflow_execute',
      workflow,
      input_data: inputData,
      condition,
      timestamp: new Date().toISOString()
    });
  }
  
  async cancelExecution(executionId) {
    return this.request('execution_cancel', { execution_id: executionId });
  }
}

// Create and export singleton instance
const wsClient = new WebSocketClient();

export { wsClient, WebSocketClient };
export default wsClient;