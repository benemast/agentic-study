// frontend/src/services/websocket.js
import { API_CONFIG } from '../config/constants';

/**
 * WebSocket Client Manager
 * 
 * Handles:
 * - Connection lifecycle
 * - Automatic reconnection
 * - Message queuing
 * - Event subscriptions
 */
class WebSocketClient {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.subscriptions = new Set();
    
    // Heartbeat
    this.heartbeatInterval = null;
    this.lastPongTime = Date.now();
  }

  /**
   * Connect to WebSocket server
   */
  connect(sessionId) {
    if (this.isConnected && this.sessionId === sessionId) {
      console.log('Already connected');
      return Promise.resolve();
    }

    this.sessionId = sessionId;
    const wsUrl = API_CONFIG.BASE_URL.replace('http', 'ws') + `/ws/${sessionId}`;

    console.log('Connecting to WebSocket:', wsUrl);

    return new Promise((resolve, reject) => {
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
          this.emit('connected', { sessionId });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          
          // Emit disconnection event
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Attempt reconnection
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.isConnected = false;
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  reconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId).catch(err => {
          console.error('Reconnection failed:', err);
        });
      }
    }, delay);
  }

  /**
   * Send message (with queuing if disconnected)
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, queueing message');
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Process queued messages
   */
  processQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Handle incoming message
   */
  handleMessage(message) {
    const { type, ...data } = message;

    // Update last pong time for pings
    if (type === 'ping') {
      this.lastPongTime = Date.now();
      // Send pong back
      this.send({ type: 'pong', timestamp: new Date().toISOString() });
    }

    // Emit to registered handlers
    this.emit(type, data);
    
    // Also emit to general 'message' handler
    this.emit('message', message);
  }

  /**
   * Subscribe to event
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
    
    return () => this.off(eventType, handler);
  }

  /**
   * Unsubscribe from event
   */
  off(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to handlers
   */
  emit(eventType, data) {
    if (this.eventHandlers.has(eventType)) {
      this.eventHandlers.get(eventType).forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event handler for ${eventType}:`, err);
        }
      });
    }
  }

  /**
   * Subscribe to channel
   */
  subscribe(channel) {
    this.subscriptions.add(channel);
    this.send({
      type: 'subscribe',
      channel
    });
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    this.send({
      type: 'unsubscribe',
      channel
    });
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });

        // Check if we've received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > 60000) { // 1 minute
          console.warn('No pong received, reconnecting...');
          this.disconnect();
          this.reconnect();
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send chat message
   */
  sendChatMessage(content, contextMessages = []) {
    return this.send({
      type: 'chat',
      content,
      messages: contextMessages,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Sync session data
   */
  syncSession(data) {
    return this.send({
      type: 'session_sync',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track event
   */
  trackEvent(eventType, data) {
    return this.send({
      type: 'track',
      event_type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Execute workflow
   */
  executeWorkflow(workflow, inputData, condition = 'workflow_builder') {
    return this.send({
      type: 'workflow_execute',
      workflow,
      input_data: inputData,
      condition,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId) {
    return this.send({
      type: 'execution_cancel',
      execution_id: executionId,
      timestamp: new Date().toISOString()
    });
  }
}

// Global WebSocket client instance
export const wsClient = new WebSocketClient();

export default wsClient;