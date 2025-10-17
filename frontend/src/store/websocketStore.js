// frontend/src/store/websocketStore.js
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import wsClient from '../services/websocket';

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
const useWebSocketStore = create(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // ============================================================
          // CONNECTION STATE
          // ============================================================
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
          
          // ============================================================
          // HEALTH & METRICS
          // ============================================================
          health: {
            latency: null,
            lastHeartbeat: null,
            isHealthy: true,
            consecutiveFailures: 0,
          },
          
          metrics: {
            messagesSent: 0,
            messagesReceived: 0,
            messagesQueued: 0,
            errorsCount: 0,
            bytesTransferred: 0,
            avgLatency: null,
            uptime: null,
          },
          
          // ============================================================
          // MESSAGE QUEUE (for offline support)
          // ============================================================
          messageQueue: [],
          maxQueueSize: 100,
          
          // ============================================================
          // CHAT STATE
          // ============================================================
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
          
          // ============================================================
          // TRACKING QUEUE
          // ============================================================
          trackingQueue: [],
          batchSize: 10,
          
          // ============================================================
          // NOTIFICATIONS
          // ============================================================
          notifications: [],
          
          // ============================================================
          // ACTIONS - CONNECTION
          // ============================================================
          
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
          
          reconnect: async () => {
            const { sessionId, reconnectAttempts, maxReconnectAttempts } = get().connection;
            
            if (reconnectAttempts >= maxReconnectAttempts) {
              set((state) => {
                state.connection.status = 'error';
                state.connection.error = 'Max reconnection attempts reached';
              });
              return false;
            }
            
            set((state) => {
              state.connection.status = 'reconnecting';
              state.connection.reconnectAttempts += 1;
            });
            
            return get().connect(sessionId);
          },
          
          scheduleReconnect: () => {
            const { reconnectAttempts } = get().connection;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            
            setTimeout(() => {
              if (get().connection.status !== 'connected') {
                get().reconnect();
              }
            }, delay);
          },
          
          // ============================================================
          // ACTIONS - HEALTH MONITORING
          // ============================================================
          
          healthCheckInterval: null,
          
          startHealthCheck: () => {
            // Clear any existing interval
            get().stopHealthCheck();
            
            const checkHealth = async () => {
              const start = Date.now();
              
              try {
                await wsClient.request('heartbeat', {}, { timeout: 5000 });
                
                const latency = Date.now() - start;
                
                set((state) => {
                  state.health.latency = latency;
                  state.health.lastHeartbeat = Date.now();
                  state.health.isHealthy = true;
                  state.health.consecutiveFailures = 0;
                  
                  // Update average latency
                  if (!state.metrics.avgLatency) {
                    state.metrics.avgLatency = latency;
                  } else {
                    state.metrics.avgLatency = (state.metrics.avgLatency * 0.9) + (latency * 0.1);
                  }
                });
              } catch (error) {
                set((state) => {
                  state.health.consecutiveFailures += 1;
                  state.health.isHealthy = false;
                  
                  if (state.health.consecutiveFailures >= 3) {
                    state.connection.status = 'error';
                    state.connection.error = 'Connection unhealthy';
                  }
                });
                
                // Trigger reconnect if too many failures
                if (get().health.consecutiveFailures >= 5) {
                  get().reconnect();
                }
              }
            };
            
            // Check immediately
            checkHealth();
            
            // Then check every 30 seconds
            const interval = setInterval(checkHealth, 30000);
            
            set((state) => {
              state.healthCheckInterval = interval;
            });
          },
          
          stopHealthCheck: () => {
            const interval = get().healthCheckInterval;
            if (interval) {
              clearInterval(interval);
              set((state) => {
                state.healthCheckInterval = null;
              });
            }
          },
          
          // ============================================================
          // ACTIONS - MESSAGE QUEUE
          // ============================================================
          
          queueMessage: (message) => {
            set((state) => {
              // Add to queue
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
                  // Drop message after 3 retries
                  console.error('Dropping message after 3 retries:', message);
                  
                  set((state) => {
                    state.metrics.errorsCount += 1;
                  });
                }
              }
            }
            
            set((state) => {
              state.messageQueue = failed;
              state.metrics.messagesQueued = failed.length;
            });
            
            // Notify about processed messages
            if (processed.length > 0) {
              get().addNotification({
                type: 'success',
                message: `${processed.length} queued messages sent`,
              });
            }
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
                // Find and update the existing streaming message
                const streamingMessageIndex = state.chat.messages.findIndex(
                  m => m.role === 'assistant' && m.isStreaming
                );
                
                if (streamingMessageIndex !== -1) {
                  // Update the existing message
                  state.chat.messages[streamingMessageIndex] = {
                    ...state.chat.messages[streamingMessageIndex],
                    content,
                    isStreaming: false,
                    timestamp: Date.now(),
                  };
                } else {
                  // Fallback: add new message if no streaming message found
                  state.chat.messages.push({
                    id: Date.now(),
                    role: 'assistant',
                    content,
                    timestamp: Date.now(),
                  });
                }
                
                state.chat.isStreaming = false;
                state.chat.streamingContent = '';
              } else {
                // During streaming: update both streamingContent AND the message
                state.chat.isStreaming = true;
                state.chat.streamingContent = content;
                
                // Also update the streaming message in real-time
                const streamingMessageIndex = state.chat.messages.findIndex(
                  m => m.role === 'assistant' && m.isStreaming
                );
                
                if (streamingMessageIndex !== -1) {
                  state.chat.messages[streamingMessageIndex].content = content;
                }
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
// SUBSCRIPTIONS - React to WebSocket events
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

// Chat-specific events
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