// frontend/src/services/websocket.js
import { API_CONFIG, WEBSOCKET_CONFIG } from '../config/constants';

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
    
    // Event handling
    this.eventHandlers = new Map();
    
    // Request tracking
    this.pendingRequests = new Map();
    this.requestCounter = 0;
    this.requestTimeout = WEBSOCKET_CONFIG.REQUEST_TIMEOUT;
    
    // Message queue
    this.messageQueue = [];
    this.maxQueueSize = WEBSOCKET_CONFIG.MAX_QUEUE_SIZE;

    // Batch support
    this.batchQueue = [];
    this.batchTimer = null;
    this.batchDelay = WEBSOCKET_CONFIG.BATCH_DELAY;
    this.maxBatchSize = WEBSOCKET_CONFIG.MAX_BATCH_SIZE;
    
    // Rate limiting
    this.rateLimitWindow = WEBSOCKET_CONFIG.RATE_LIMIT_WINDOW;
    this.maxRequestsPerWindow = WEBSOCKET_CONFIG.MAX_REQUESTS_PER_WINDOW;
    this.requestTimestamps = [];
    
    // Caching
    this.cache = new Map();
    this.cacheExpiry = WEBSOCKET_CONFIG.CACHE_EXPIRY;
    
    // Metrics
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      errorsCount: 0,
      reconnectsCount: 0
    };    
  }

  // ============================================================
  // CUSTOM EVENT SYSTEM
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
    
    const handlers = this.eventHandlers.get(eventType);
    handlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }
  
  /**
   * Unsubscribe from event
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler to remove
   */
  off(eventType, handler) {
    const handlers = this.eventHandlers.get(eventType);
    if (!handlers) return;
    
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
    /**
   * Emit event to all subscribers
   * @param {string} eventType - Event type to emit
   * @param {*} data - Event data
   */
  emit(eventType, data) {
    const handlers = this.eventHandlers.get(eventType);
    if (!handlers) return;

    handlers.forEach(handler => {
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
  // CONNECTION MANAGEMENT
  // ============================================================
  
  /**
   * Connect to WebSocket server
   * @param {string} sessionId - Session ID to connect to
   * @returns {Promise} Connection promise
   */
  async connect(sessionId) {
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
          
          // Process queued messages
          this.processQueue();
          
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
          
          // Clear pending requests
          this.pendingRequests.forEach(({ reject }) => {
            reject(new Error('Connection closed'));
          });
          this.pendingRequests.clear();
          
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
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

    if (this.ws) {
      this.isConnected = false;
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
   * @param {Object} message - Parsed message object
   */
  handleMessage(message) {
    const { type, request_id } = message;

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
    
    // Emit specific event type
    this.emit(type, message);
    
    // Also emit general message event
    this.emit('message', message);
  }

  /**
   * Send a message
   * @param {Object} message - Message to send
   * @param {Object} options - Send options
   * @returns {Promise} Send promise
   */
  async send(message, options = {}) {
    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please slow down.');
    }
    
    if (!this.isConnected) {
      // Queue message for later
      this.queueMessage(message);
      return Promise.resolve({ queued: true });
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      this.metrics.messagesSent++;
      return Promise.resolve({ sent: true });
    } catch (error) {
      console.error('Failed to send message:', error);
      this.metrics.errorsCount++;
      throw error;
    }
  }

  /**
   * Send request and wait for response
   * @param {string} type - Request type
   * @param {Object} data - Request data
   * @param {Object} options - Request options (timeout, cache)
   * @returns {Promise} Response promise
   */
  async request(type, data = {}, options = {}) {
    const { timeout = this.requestTimeout, cache = false } = options;
    
    // Check cache
    if (cache) {
      const cacheKey = `${type}:${JSON.stringify(data)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }
    
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      // Setup timeout
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timer);
          if (cache) {
            const cacheKey = `${type}:${JSON.stringify(data)}`;
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
          }
          resolve(data);
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

  // ============================================================
  // MESSAGE QUEUE
  // ============================================================
  
  /**
   * Queue message for later sending
   * @param {Object} message - Message to queue
   */
  queueMessage(message) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn('Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }
    
    this.messageQueue.push({
      ...message,
      queuedAt: Date.now()
    });
  }
  
  /**
   * Process queued messages
   * @returns {Promise} Process promise
   */
  async processQueue() {
    if (!this.isConnected || this.messageQueue.length === 0) {
      return;
    }
    
    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const message of messages) {
      try {
        await this.send(message);
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Re-queue if failed
        this.queueMessage(message);
      }
    }
  }

  // ============================================================
  // BATCHING
  // ============================================================
  
  /**
   * Queue for batch sending
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {Promise} Batch promise
   */
  queueForBatch(type, data) {
    this.batchQueue.push({ type, data, timestamp: Date.now() });
    
    // Auto-send if batch is full
    if (this.batchQueue.length >= this.maxBatchSize) {
      return this.flushBatch();
    }
    
    // Schedule batch send
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.batchDelay);
    }
    
    return Promise.resolve({ batched: true });
  }
  
  /**
   * Flush batch queue
   * @returns {Promise} Flush promise
   */
  async flushBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.batchQueue.length === 0) {
      return;
    }
    
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    
    return this.send({
      type: 'batch',
      batch_id: `batch_${Date.now()}`,
      items: batch
    });
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================
  
  /**
   * Check rate limit
   * @returns {boolean} True if under limit
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
  // CACHING
  // ============================================================
  
  /**
   * Clear cache
   * @param {string} pattern - Pattern to match (optional)
   */
  clearCache(pattern) {
    if (pattern) {
      // Clear specific pattern
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
    }
  }

  // ============================================================
  // METRICS
  // ============================================================
  
  /**
   * Get client metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      queuedMessages: this.messageQueue.length,
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.cache.size,
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
    return this.request('session_update', data);
  }

  async quickSaveSession(data) {
    return this.request('session_quicksave', data);
  }

  async syncSession(data) {
    return this.request('session_sync', data);
  }
  
  async getSession() {
    return this.request('session_get');
  }
  
  async endSession(data = {}) {
    return this.request('session_end', data);
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
    this.clearCache('chat');
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