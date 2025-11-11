// frontend/src/store/websocketStore.js
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import wsClient from '../services/websocket';
import { WEBSOCKET_CONFIG } from '../config/constants';

/**
 * WebSocket Store - Centralized WebSocket state management
 * 
 * Features:
 * - Connection state tracking
 * - Message queue management
 * - Chat history with persistence
 * - Metrics and health monitoring
 * - Multi-tab synchronization
 */

// ============================================================
// INITIAL STATE
// ============================================================
const initialState = {
  // Connection
  connection: {
    status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
    sessionId: null,
    connectionId: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    error: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
  },
  
  // Health monitoring
  health: {
    latency: null,
    lastHeartbeat: null,
    lastPongReceived: null, 
    isHealthy: true,
    consecutiveFailures: 0,
    missedPongs: 0,
  },
  
  // Health check intervals
  heartbeatInterval: null,
  healthCheckInterval: null,
  healthCheckInitialTimeout: null,

  // Message queue
  messageQueue: [],
  maxQueueSize: 100,
  
  // Tracking queue
  trackingQueue: [],
  batchSize: 10,
  
  // Chat state
  chat: {
    messages: [],
    isStreaming: false,
    streamingContent: '',
    typingUsers: new Set(),
    lastMessageAt: null,
    unreadCount: 0,
    hasMore: false,
    isLoadingHistory: false,
  },
  
  // Notifications
  notifications: [],
  
  // Metrics
  metrics: {
    messagesSent: 0,
    messagesReceived: 0,
    errorsCount: 0,
    reconnectsCount: 0,
    avgLatency: null,
  },
};

// ============================================================
// CREATE STORE
// ============================================================

const useWebSocketStore = create(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,
        
          // ========================================
          // CONNECTION ACTIONS
          // ========================================
          
          connect: async (sessionId) => {
            set((state) => {
              state.connection.status = 'connecting';
              state.connection.sessionId = sessionId;
              state.connection.error = null;
            });
            
            try {
              await wsClient.connect(sessionId);
              
              set((state) => {
                state.connection.status = 'connected';
                state.connection.lastConnectedAt = Date.now();
                state.connection.reconnectAttempts = 0;
                state.connection.connectionId = wsClient.connectionId;
              });
              
              // Process queued messages
              get().processQueue();
              
              // Start health monitoring
              get().startHealthCheck();
              
              return true;
            } catch (error) {
              set((state) => {
                state.connection.status = 'error';
                state.connection.error = error.message;
                state.connection.lastDisconnectedAt = Date.now();
              });
              
              // Schedule reconnect
              get().scheduleReconnect();
              
              return false;
            }
          },
          
          disconnect: () => {
            wsClient.disconnect();
            
            set((state) => {
              state.connection.status = 'disconnected';
              state.connection.lastDisconnectedAt = Date.now();
              state.connection.connectionId = null;
            });
            
            get().stopHealthCheck();
          },
          
          // ========================================
          // RECONNECTION LOGIC
          // ========================================
          
          reconnect: async () => {
            const { sessionId, reconnectAttempts, maxReconnectAttempts } = get().connection;
            
            // Check if max attempts reached
            if (reconnectAttempts >= maxReconnectAttempts) {
              console.error('Max reconnection attempts reached');
              set((state) => {
                state.connection.status = 'error';
                state.connection.error = 'Max reconnection attempts reached';
              });
              return false;
            }
            
            // Update status to reconnecting            
            set((state) => {
              state.connection.status = 'reconnecting';
              state.connection.reconnectAttempts += 1;
            });
            
            // Attempt to reconnect            
            return get().connect(sessionId);
          },
          
          scheduleReconnect: () => {
            const { reconnectAttempts } = get().connection;
            
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            
            console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);
            
            setTimeout(() => {
              const currentStatus = get().connection.status;
              
              // Only reconnect if not already connected
              if (currentStatus !== 'connected') {
                get().reconnect();
              }
            }, delay);
          },
          
          // ========================================
          // HEARTBEAT / HEALTH MONITORING
          // ========================================
          
          startHealthCheck: () => {
            // Clear any existing interval/timeout
            get().stopHealthCheck();
            
            const sendHeartbeat = () => {
              const currentStatus = get().connection.status;
              
              if (currentStatus !== 'connected') {
                console.warn('⏸️ Skipping heartbeat - not connected');
                return;
              }
              
              const start = Date.now();
              
              try {
                // Send heartbeat to backend - Fire-and-forget - don't wait for response
                wsClient.send({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString()
                });
                
                // Track when we sent it                
                set((state) => {
                  state.health.lastHeartbeat = start;
                });
                
                //console.info('💓 Heartbeat sent');

              } catch (error) {
                console.error('Failed to send heartbeat:', error);
                
                set((state) => {
                  state.health.consecutiveFailures += 1;
                  state.health.isHealthy = false;
                });
              }
            };

            const checkHealth = () => {
              const { lastHeartbeat, lastPongReceived, missedPongs } = get().health;

              // Skip if no heartbeats sent yet
              if (!lastHeartbeat) {
                console.log('⏸No heartbeats sent yet');
                return;
              }

              // Skip if no pongs received yet (first heartbeat)
              if (!lastPongReceived) {
                console.log(' Waiting for first pong...');
                return;
              }

              // Calculate time since last pong
              const timeSinceLastPong = Date.now() - lastPongReceived;
              const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;

              // Debug logging
              /*
              console.info('🔍 Health check:', {
                timeSinceLastPong: Math.round(timeSinceLastPong / 1000) + 's',
                timeSinceLastHeartbeat: Math.round(timeSinceLastHeartbeat / 1000) + 's',
                missedPongs
              });
              */

              // Dead if no pong for 90 seconds (3 missed heartbeats)
              if (timeSinceLastPong > WEBSOCKET_CONFIG.CONNECTION_TIMEOUT) {
                console.error('☠️ Connection dead - no pong for', Math.round(timeSinceLastPong / 1000), 'seconds');
                
                set((state) => {
                  state.health.isHealthy = false;
                  state.health.consecutiveFailures += 1;
                });
                
                // Trigger reconnect
                get().scheduleReconnect();
              }
              // Warning if pong is late (>45 seconds)
              else if (timeSinceLastPong > (WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL * 1.5)) {
                console.warn('Pong delayed -', Math.round(timeSinceLastPong / 1000), 'seconds since last pong');
                
                set((state) => {
                  state.health.missedPongs += 1;
                });
              }
              // Healthy
              else {
                //console.info('Connection healthy');
                
                set((state) => {
                  state.health.isHealthy = true;
                  state.health.consecutiveFailures = 0;
                  state.health.missedPongs = 0;
                });
              }
            };
            
            // Give connection time to stabilize (5 seconds)
            console.log('⏱Starting health checks (first check in ', Math.round(WEBSOCKET_CONFIG.HEALTH_CHECK_INITIAL_TIMEOUT / 1000), 's)');
            
            const initialDelay = setTimeout(() => {
              console.log('Starting heartbeat monitoring');
              
              // Send first heartbeat
              sendHeartbeat();
              
              // Then send heartbeat every 30 seconds
              const heartbeatInterval = setInterval(sendHeartbeat, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
              
              // Check connection health every 10 seconds (independent of heartbeat)
              const healthCheckInterval = setInterval(checkHealth, WEBSOCKET_CONFIG.HEALTH_CHECK_INTERVAL);
              
              set((state) => {
                state.healthCheckInterval = healthCheckInterval;
                state.heartbeatInterval = heartbeatInterval;
              });
            }, WEBSOCKET_CONFIG.HEALTH_CHECK_INITIAL_TIMEOUT);
            
            // Store timeout for cleanup
            set((state) => {
              state.healthCheckInitialTimeout = initialDelay;
            });
          },
          
          stopHealthCheck: () => {
            // Clear health check interval
            const healthInterval = get().healthCheckInterval;
            if (healthInterval) {
              clearInterval(healthInterval);
              set((state) => {
                state.healthCheckInterval = null;
              });
            }

            // Clear heartbeat interval
            const heartbeatInterval = get().heartbeatInterval;
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              set((state) => {
                state.heartbeatInterval = null;
              });
            }

            // Also clear initial timeout
            const timeout = get().healthCheckInitialTimeout;
            if (timeout) {
              clearTimeout(timeout);
              set((state) => {
                state.healthCheckInitialTimeout = null;
              });
            }
            
            console.log('⏸Health checks stopped');
          },
          
          // ========================================
          // MESSAGE QUEUE
          // ========================================
          
          queueMessage: (message) => {
            set((state) => {
              state.messageQueue.push({
                ...message,
                queuedAt: Date.now(),
                retryCount: 0,
              });
              
              // Limit queue size
              if (state.messageQueue.length > state.maxQueueSize) {
                state.messageQueue.shift();
              }
              
              state.metrics.messagesQueued = state.messageQueue.length;
            });
            
            // Try to send if connected
            if (get().connection.status === 'connected') {
              get().processQueue();
            }
          },
          
          processQueue: async () => {
            const queue = get().messageQueue;
            if (queue.length === 0) return;
            
            console.log(`Processing ${queue.length} queued messages`);
            
            const processed = [];
            const failed = [];
            
            for (const message of queue) {
              try {
                await wsClient.send(message);
                processed.push(message);
                
                set((state) => {
                  state.metrics.messagesSent += 1;
                });
              } catch (error) {
                message.retryCount += 1;
                
                if (message.retryCount < 3) {
                  failed.push(message);
                } else {
                  console.error('Message failed after 3 retries:', message);
                }
              }
            }

            // Notify about processed messages
            if (processed.length > 0) {
              get().addNotification({
                type: 'success',
                message: `${processed.length} queued messages sent`,
              });
            }
            
            // Update queue with failed messages
            set((state) => {
              state.messageQueue = failed;
            });
          },
          
          // ============================================================
          // ACTIONS - CHAT
          // ============================================================
          
          addChatMessage: (message) => {
            set((state) => {
              state.chat.messages.push({
                ...message,
                id: message.id || Date.now(),
                timestamp: message.timestamp || Date.now(),
              });
              
              state.chat.lastMessageAt = Date.now();
              
              // Update unread count if message is from assistant
              if (message.role === 'assistant' && document.hidden) {
                state.chat.unreadCount += 1;
              }
            });
          },
          
          updateChatMessage: (messageId, updates) => {
            set((state) => {
              const index = state.chat.messages.findIndex(m => m.id === messageId);
              if (index !== -1) {
                state.chat.messages[index] = {
                  ...state.chat.messages[index],
                  ...updates,
                  edited: true,
                  editedAt: Date.now(),
                };
              }
            });
          },
          
          deleteChatMessage: (messageId) => {
            set((state) => {
              state.chat.messages = state.chat.messages.filter(m => m.id !== messageId);
            });
          },
          
          clearChat: () => {
            set((state) => {
              state.chat.messages = [];
              state.chat.lastMessageAt = null;
              state.chat.unreadCount = 0;
              state.chat.hasMore = false;
            });
          },
          
          setStreamingContent: (content, isComplete = false) => {
            set((state) => {
              if (isComplete) {
                // Find the streaming message
                const streamingMessageIndex = state.chat.messages.findIndex(
                  m => m.role === 'assistant' && m.isStreaming
                );
                
                if (streamingMessageIndex !== -1) {
                  // FINAL UPDATE: Update the actual message
                  state.chat.messages[streamingMessageIndex] = {
                    ...state.chat.messages[streamingMessageIndex],
                    content,
                    isStreaming: false,
                    timestamp: Date.now(),
                  };
                }
                
                state.chat.isStreaming = false;
                state.chat.streamingContent = '';
              } else {
                // DURING STREAMING: Only update streamingContent, NOT the message!
                state.chat.isStreaming = true;
                state.chat.streamingContent = content;                
              }
            });
          },
          
          setChatHistory: (messages, hasMore = false) => {
            set((state) => {
              state.chat.messages = messages;
              state.chat.hasMore = hasMore;
              state.chat.isLoadingHistory = false;
            });
          },
          
          markChatAsRead: () => {
            set((state) => {
              state.chat.unreadCount = 0;
            });
          },
          
          // ============================================================
          // ACTIONS - TRACKING
          // ============================================================
          
          queueTrackingEvent: (eventType, eventData) => {
            const event = {
              type: 'track',
              event_type: eventType,
              event_data: eventData,
              timestamp: new Date().toISOString(),
              queued_at: Date.now(),
            };
            
            set((state) => {
              state.trackingQueue.push(event);
            });
            
            // Process batch if full
            if (get().trackingQueue.length >= get().batchSize) {
              get().flushTrackingQueue();
            } else {
              // Schedule flush after delay
              setTimeout(() => {
                get().flushTrackingQueue();
              }, 1000);
            }
          },
          
          flushTrackingQueue: async () => {
            const events = get().trackingQueue;
            if (events.length === 0) return;
            
            set((state) => {
              state.trackingQueue = [];
            });
            
            try {
              if (get().connection.status === 'connected') {
                await wsClient.trackBatch(events);
              } else {
                // Re-queue if not connected
                set((state) => {
                  state.trackingQueue.unshift(...events);
                });
              }
            } catch (error) {
              console.error('Failed to flush tracking queue:', error);
              
              // Re-queue on error
              set((state) => {
                state.trackingQueue.unshift(...events);
              });
            }
          },
          
          // ============================================================
          // ACTIONS - NOTIFICATIONS
          // ============================================================
          
          addNotification: (notification) => {
            const id = Date.now();
            
            set((state) => {
              state.notifications.push({
                id,
                ...notification,
                timestamp: Date.now(),
              });
              
              // Limit to 10 notifications
              if (state.notifications.length > 10) {
                state.notifications.shift();
              }
            });
            
            // Auto-remove after 5 seconds
            if (notification.autoRemove !== false) {
              setTimeout(() => {
                get().removeNotification(id);
              }, notification.duration || 5000);
            }
            
            return id;
          },
          
          removeNotification: (id) => {
            set((state) => {
              state.notifications = state.notifications.filter(n => n.id !== id);
            });
          },
          
          clearNotifications: () => {
            set((state) => {
              state.notifications = [];
            });
          },
          
          // ============================================================
          // ACTIONS - UTILITIES
          // ============================================================
          
          updateMetrics: (metrics) => {
            set((state) => {
              Object.assign(state.metrics, metrics);
            });
          },
          
          resetState: () => {
            get().disconnect();
            get().stopHealthCheck();
            
            set((state) => {
              // Reset to initial state
              state.connection = {
                status: 'disconnected',
                sessionId: null,
                connectionId: null,
                lastConnectedAt: null,
                lastDisconnectedAt: null,
                error: null,
                reconnectAttempts: 0,
                maxReconnectAttempts: 10,
              };
              
              state.health = {
                latency: null,
                lastHeartbeat: null,
                isHealthy: true,
                consecutiveFailures: 0,
              };
              
              state.messageQueue = [];
              state.trackingQueue = [];
              state.notifications = [];
              
              state.chat = {
                messages: [],
                isStreaming: false,
                streamingContent: '',
                typingUsers: new Set(),
                lastMessageAt: null,
                unreadCount: 0,
                hasMore: false,
                isLoadingHistory: false,
              };
            });
          },
          
          // ============================================================
          // COMPUTED VALUES
          // ============================================================
          
          isConnected: () => get().connection.status === 'connected',
          isReconnecting: () => get().connection.status === 'reconnecting',
          hasConnectionError: () => get().connection.status === 'error',
          connectionUptime: () => {
            const { lastConnectedAt } = get().connection;
            return lastConnectedAt ? Date.now() - lastConnectedAt : 0;
          },
          queueSize: () => get().messageQueue.length + get().trackingQueue.length,
        })),
        {
          name: 'websocket-store',
          partialize: (state) => ({
            // Only persist certain parts
            chat: {
              messages: state.chat.messages.slice(-100), // Last 100 messages
            },
            metrics: state.metrics,
          }),
        }
      )
    ),
    {
      name: 'WebSocketStore',
    }
  )
);

// ============================================================
// WEBSOCKET EVENT SUBSCRIPTIONS
// ============================================================

// Subscribe to WebSocket events
wsClient.on('connected', () => {
  useWebSocketStore.setState((state) => {
    state.connection.status = 'connected';
    state.connection.lastConnectedAt = Date.now();
    state.connection.reconnectAttempts = 0;
  });
});

wsClient.on('disconnected', () => {
  useWebSocketStore.setState((state) => {
    state.connection.status = 'disconnected';
    state.connection.lastDisconnectedAt = Date.now();
  });
});

wsClient.on('error', (error) => {
  useWebSocketStore.setState((state) => {
    state.connection.error = error.message;
    state.metrics.errorsCount += 1;
  });
});

wsClient.on('message', () => {
  useWebSocketStore.setState((state) => {
    state.metrics.messagesReceived += 1;
  });
});

// Heartbeat pong response
wsClient.on('pong', (message) => {
  const now = Date.now();
  const lastHeartbeat = useWebSocketStore.getState().health.lastHeartbeat;
  
  // Calculate latency if we have lastHeartbeat
  const latency = lastHeartbeat ? now - lastHeartbeat : null;
  
  //console.info('💓 Pong received' + (latency ? ` (${latency}ms)` : ''));
  
  useWebSocketStore.setState((state) => {
    state.health.lastPongReceived = now;
    state.health.isHealthy = true;
    state.health.consecutiveFailures = 0;
    state.health.missedPongs = 0;
    
    if (latency !== null) {
      state.health.latency = latency;
      
      // Update average latency
      if (!state.metrics.avgLatency) {
        state.metrics.avgLatency = latency;
      } else {
        state.metrics.avgLatency = (state.metrics.avgLatency * 0.9) + (latency * 0.1);
      }
    }
  });
});

// Chat-specific events (keep your existing chat handlers)
wsClient.on('chat_stream', (data) => {
  useWebSocketStore.getState().setStreamingContent(data.full_content || data.content);
});

wsClient.on('chat_complete', (data) => {
  useWebSocketStore.getState().setStreamingContent(data.content, true);
});

wsClient.on('chat_message_updated', (data) => {
  useWebSocketStore.getState().updateChatMessage(data.message_id, {
    content: data.content,
    edited: true,
  });
});

wsClient.on('chat_cleared', () => {
  useWebSocketStore.getState().clearChat();
});

// ============================================================
// MIDDLEWARE - Multi-tab synchronization via BroadcastChannel
// ============================================================

if (typeof BroadcastChannel !== 'undefined') {
  const channel = new BroadcastChannel('websocket_store_sync');
  
  // Listen for updates from other tabs
  channel.onmessage = (event) => {
    if (event.data.type === 'state_update') {
      useWebSocketStore.setState(event.data.state);
    }
  };
  
  // Subscribe to store changes and broadcast to other tabs
  useWebSocketStore.subscribe(
    (state) => state.chat.messages,
    (messages) => {
      channel.postMessage({
        type: 'state_update',
        state: { chat: { messages } },
      });
    }
  );
}

// ============================================================
// VISIBILITY CHANGE SUBSCRIPTION
// React to app visibility changes from sessionStore
// ============================================================
setTimeout(async () => {
  try {
    // ✅ Use import() not require()
    const { useSessionStore } = await import('./sessionStore.js');
    
    useSessionStore.subscribe(
      (state) => state.appLifecycle?.isVisible,
      (isVisible) => {
        if (isVisible === undefined) return;
        
        const wsStore = useWebSocketStore.getState();
        
        if (!isVisible) {
          console.log('⏸App hidden - pausing health checks');
          wsStore.stopHealthCheck();
        } else {
          console.log('App visible - resuming health checks');
          if (wsStore.connection.status === 'connected') {
            wsStore.startHealthCheck();
          }
        }
      }
    );
    
    console.log('WebSocket visibility subscription initialized');
  } catch (err) {
    console.error('Failed to initialize WebSocket subscriptions:', err);
  }
}, 0);
// ============================================================
// SELECTORS - Optimized selectors for components
// ============================================================

export const websocketSelectors = {
  // Connection selectors
  isConnected: (state) => state.connection.status === 'connected',
  connectionStatus: (state) => state.connection.status,
  connectionError: (state) => state.connection.error,
  
  // Health selectors
  latency: (state) => state.health.latency,
  isHealthy: (state) => state.health.isHealthy,
  
  // Chat selectors
  chatMessages: (state) => state.chat.messages,
  isStreaming: (state) => state.chat.isStreaming,
  streamingContent: (state) => state.chat.streamingContent,
  unreadCount: (state) => state.chat.unreadCount,
  
  // Queue selectors
  queuedMessageCount: (state) => state.messageQueue.length,
  hasQueuedMessages: (state) => state.messageQueue.length > 0,
  
  // Notification selectors
  notifications: (state) => state.notifications,
  latestNotification: (state) => state.notifications[state.notifications.length - 1],
};

export default useWebSocketStore;