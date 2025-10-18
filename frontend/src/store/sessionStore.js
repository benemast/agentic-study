// frontend/src/store/sessionStore.js
/**
 * Centralized Zustand store for session management
 * Consolidates all state management in one place 
 * Automatically syncs with the backend via WebSocket when available
 */
import { captureException } from '../config/sentry';

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import useWebSocketStore from './websocketStore';
import wsClient from '../services/websocket';
import { sessionAPI, chatAPI, interactionAPI } from '../config/api';

import { SESSION_CONFIG, TRACKING_EVENTS } from '../config/constants';

import { 
  generateSessionId, 
  getSessionMetadata,
  getSessionIdFromUrl,
  setSessionIdInUrl,
  removeSessionIdFromUrl 
} from '../utils/sessionHelpers';

//import { initAnalytics } from '../utils/analytics';
import { translations } from '../locales';

const getInitialLanguage = () => {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && translations[urlLang]) {
    return urlLang;
  }

  // Check localStorage
  const storedLang = localStorage.getItem('study-language');
  if (storedLang && translations[storedLang]) {
    return storedLang;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (translations[browserLang]) {
    return browserLang;
  }

  return 'en';
};

const useSessionStore = create(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // ========================================
          // SESSION STATE
          // ========================================
          
          // Core session
          sessionId: null,
          participantId: null,
          isSessionActive: false,
          sessionStartTime: null,
          sessionSource: null, // 'new', 'url', 'restored'
          
          // Session data that syncs with backend
          sessionData: {
            workflowsCreated: 0,
            workflowsExecuted: 0,
            tasksCompleted: 0,
            totalTimeSpent: 0,
            currentView: 'dashboard',
            currentWorkflow: { nodes: [], edges: [] },
            interactions: [],
            chatMessages: [], 
            demographicsData: null,
            demographicsComplete: false,
            demographicsSubmissionError: null,
            tutorialCompleted: false,
            condition: null,
          },
          
          // Activity tracking
          lastActivity: Date.now(),
          sessionError: null,
          
          // Connection status
          connectionStatus: 'online', // 'online', 'offline', 'error'
          
          // Metadata
          sessionMetadata: getSessionMetadata(),

          // Language
          currentLanguage: getInitialLanguage(),
          availableLanguages: Object.keys(translations),
          
          // Auto-sync
          autoSyncEnabled: true,
          autoSyncIntervalId: null,
          
          // Sync state
          syncStatus: 'synced', // 'synced' | 'syncing' | 'pending' | 'error'
          lastSyncAt: null,
          syncError: null,
          pendingChanges: [],
          _syncDebounceTimer: null,
                  
          // ========================================
          // INITIALIZATION
          // ========================================
          
          initializeSession: async () => {
            const urlSessionId = getSessionIdFromUrl();
            const existingSession = get().sessionId;
            
            // Handle session mismatch
            if (urlSessionId && existingSession && urlSessionId !== existingSession) {
              console.log('Session mismatch detected, resetting...');
              get().resetSession();
            }
            
            let sessionIdToUse = null;
            let sessionSource = 'new';
            
            // Priority: URL > existing > new
            if (urlSessionId) {
              try {
                await sessionAPI.validate(urlSessionId);
                sessionIdToUse = urlSessionId;
                sessionSource = 'url';
                console.log('✅ Restored session from URL:', urlSessionId);
              } catch (error) {
                console.warn('URL session invalid, creating new session');
                removeSessionIdFromUrl();
              }
            }
            
            if (!sessionIdToUse && existingSession) {
              try {
                await sessionAPI.validate(existingSession);
                sessionIdToUse = existingSession;
                sessionSource = 'restored';
                console.log('✅ Restored session from storage:', existingSession);
              } catch (error) {
                console.warn('Stored session invalid, creating new session');
              }
            }
            
            // Create new session if needed
            if (!sessionIdToUse) {
              sessionIdToUse = generateSessionId();
              sessionSource = 'new';
              
              const response = await sessionAPI.create({
                session_id: sessionIdToUse,
                start_time: new Date().toISOString(),
                user_agent: navigator.userAgent,
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
                metadata: getSessionMetadata()
              });
              
              console.log('✅ Created new session:', response);
              set({ participantId: response.participant_id });
            }
          
            //initialize Clarity Analytics
            /*
            initAnalytics({
              sessionId: sessionIdToUse,
              participantId: next_participant_id
            });
            */

            // Update state
            set({
              sessionId: sessionIdToUse,
              sessionSource,
              isSessionActive: true,
              sessionStartTime: Date.now(),
              lastActivity: Date.now(),
              connectionStatus: 'online',
              sessionMetadata: await getSessionMetadata()
            });

            // Connect WebSocket after session initialization
            const wsStore = useWebSocketStore.getState();
            if (!wsStore.isConnected() && !wsStore.connection.sessionId) {
              try {
                await wsStore.connect(sessionIdToUse);
              } catch (error) {
                console.warn('WebSocket connection failed, will retry:', error);
                // Don't block session initialization if WS fails
              }
            }
            
            // Set URL
            setSessionIdInUrl(sessionIdToUse);
            
            // Start auto-sync
            get().startAutoSync();
            
            return sessionIdToUse;
          },
          
          // ========================================
          // SESSION LIFECYCLE
          // ========================================
          
          endSession: async (reason = 'user_ended') => {
            const { sessionId } = get();
            if (!sessionId) return;
            
            console.log(`Ending session: ${reason}`);
            
            // Stop auto-sync
            get().stopAutoSync();
            
            // Final sync before ending
            await get().syncSessionData(true);
            
            // Notify backend
            try {
              // Try WebSocket first, fallback to REST
              const wsStore = useWebSocketStore.getState();
              if (wsStore.isConnected()) {
                await wsClient.endSession({
                  session_data: get().sessionData,
                  reason
                });
              } else {
                await sessionAPI.end(sessionId, {
                  end_time: new Date().toISOString(),
                  session_data: get().sessionData,
                  reason
                });
              }
              
              // Disconnect WebSocket
              wsStore.disconnect();
            } catch (error) {
              console.error('Failed to end session:', error);
              captureException(error, {
                  tags: {
                    error_type: 'end_session_failed'
                  },
                  contexts: {
                    session_id: sessionId
                  }
                });
            }

            // Cleanup
            set({
              isSessionActive: false,
              connectionStatus: 'offline'
            });
            
            removeSessionIdFromUrl();
          },
          
          resetSession: () => {
            // Stop auto-sync
            get().stopAutoSync();
            
            // Disconnect WebSocket
            const wsStore = useWebSocketStore.getState();
            wsStore.disconnect();
            
            // Reset state
            set({
              sessionId: null,
              participantId: null,
              isSessionActive: false,
              sessionStartTime: null,
              sessionSource: null,
              sessionData: {
                workflowsCreated: 0,
                workflowsExecuted: 0,
                totalTimeSpent: 0,
                currentView: 'dashboard',
                currentWorkflow: { nodes: [], edges: [] },
                interactions: [],
                chatMessages: [],
                demographicsData: null,
                demographicsSubmissionError: null,
                condition: null,
              },
              lastActivity: Date.now(),
              sessionError: null,
              connectionStatus: 'offline',
              syncStatus: 'synced',
              lastSyncAt: null,
              syncError: null,
              pendingChanges: [],
              sessionMetadata: getSessionMetadata()
            });
            
            removeSessionIdFromUrl();
          },
          
          // ========================================
          // ACTIVITY TRACKING
          // ========================================
          
          updateLastActivity: () => {
            set({ lastActivity: Date.now() });
            
            // Queue activity update via WebSocket
            get().queueChange({
              type: 'activity_update',
              data: { last_activity: Date.now() }
            });
          },
          
          trackInteraction: async (eventType, eventData = {}) => {
            const { sessionId, sessionData } = get();
            if (!sessionId) return;
            
            // Update activity
            get().updateLastActivity();
            
            const interaction = {
              timestamp: new Date().toISOString(),
              event_type: eventType,
              event_data: {
                ...eventData,
                page_visibility: !document.hidden,
                online_status: navigator.onLine,
                viewport_size: `${window.innerWidth}x${window.innerHeight}`,
              },
              current_view: sessionData.currentView
            };
            
            // Update local state
            set((state) => {
              state.sessionData.interactions.push(interaction);
              // Keep only last 100 interactions in memory
              if (state.sessionData.interactions.length > 100) {
                state.sessionData.interactions = state.sessionData.interactions.slice(-100);
              }
            });
            
            // Send to backend
            // Use WebSocket for tracking if available
            const wsStore = useWebSocketStore.getState();
            if (wsStore.isConnected()) {
              wsStore.queueTrackingEvent(eventType, eventData);
            } else {
              // Fallback to REST
              try {
                await interactionAPI.track(sessionId, interaction);
              } catch (error) {
                console.error('Failed to track interaction:', error);
        
                // Log interaction tracking failures
                captureException(error, {
                  tags: {
                    error_type: 'interaction_tracking_failed',
                    event_type: eventType
                  },
                  contexts: {
                    session_id: sessionId,
                    event_type: eventType,
                  }
                });
              }
              
              set({ 
                connectionStatus: 'error',
                sessionError: error.message 
              });
            }
          },
          
          // ========================================
          // SESSION DATA UPDATES
          // ========================================
          
          setCurrentView: (view) => {
            set((state) => {
              state.sessionData.currentView = view;
              state.lastActivity = Date.now();
            });
            get().trackInteraction(TRACKING_EVENTS.VIEW_CHANGE, { 
              view,
              previousView: get().sessionData.currentView 
            });
            
            // Queue change for sync
            get().queueChange({
              type: 'view_change',
              data: { current_view: view }
            });
          },
          
          updateWorkflow: (workflow) => {
            set((state) => {
              state.sessionData.currentWorkflow = workflow;
              state.lastActivity = Date.now();
            });
            
            // Queue change for sync
            get().queueChange({
              type: 'workflow_update',
              data: { workflow }
            });
          },
          
          incrementWorkflowsCreated: () => {
            set((state) => {
              state.sessionData.workflowsCreated++;
              state.lastActivity = Date.now();
            });
            
            get().queueChange({
              type: 'metric_update',
              data: { workflows_created: get().sessionData.workflowsCreated }
            });
            get().trackInteraction(TRACKING_EVENTS.WORKFLOW_SAVED);
          },
          
          incrementWorkflowsExecuted: () => {
            set((state) => {
              state.sessionData.workflowsExecuted++;
              state.lastActivity = Date.now();
            });
            
            get().queueChange({
              type: 'metric_update',
              data: { workflows_executed: get().sessionData.workflowsExecuted }
            });
            get().trackInteraction(TRACKING_EVENTS.WORKFLOW_EXECUTED);
          },

          // ========================================
          // LANGUAGE MANAGEMENT
          // ========================================

          setLanguage: (lang) => {
            if (translations[lang]) {
              set({ currentLanguage: lang });
              localStorage.setItem('study-language', lang);
              
              // Update URL parameter
              const url = new URL(window.location);
              url.searchParams.set('lang', lang);
              window.history.replaceState({}, '', url.toString());
              
              // Track language change
              const { trackInteraction } = get();
              trackInteraction?.('language_changed', { 
                language: lang,
                timestamp: new Date().toISOString() 
              });
            }
          },

          getTranslation: (key) => {
            const lang = get().currentLanguage;
            return translations[lang]?.[key] || translations.en[key] || key;
          },
          
          // ========================================
          // CHAT MESSAGES MANAGEMENT
          // ========================================
          
          getChatMessages: () => {
            // Get from WebSocket store if available, fallback to local
            const wsStore = useWebSocketStore.getState();
            if (wsStore.chat.messages.length > 0) {
              return wsStore.chat.messages;
            }
            return get().sessionData.chatMessages || [];
          },
          
          setChatMessages: (messages) => {
            set((state) => {
              state.sessionData.chatMessages = messages;
            });

            // Also update WebSocket store
            const wsStore = useWebSocketStore.getState();
            wsStore.setChatHistory(messages);
            
            // Auto-sync when messages change
            get().updateLastActivity();
          },
          
          addChatMessage: (message) => {
            set((state) => {
              state.sessionData.chatMessages.push({
                ...message,
                timestamp: message.timestamp || Date.now()
              });
            });
            
            // Add to WebSocket store
            const wsStore = useWebSocketStore.getState();
            wsStore.addChatMessage(message);
            
            get().updateLastActivity();
          },
          
          updateChatMessage: (index, updatedMessage) => {
            set((state) => {
              if (state.sessionData.chatMessages[index]) {
                state.sessionData.chatMessages[index] = {
                  ...state.sessionData.chatMessages[index],
                  ...updatedMessage,
                  edited: true,
                  editedAt: Date.now()
                };
              }
            });
            
            // Update in WebSocket store if it has an ID
            const message = get().sessionData.chatMessages[index];
            if (message?.id) {
              const wsStore = useWebSocketStore.getState();
              wsStore.updateChatMessage(message.id, updatedMessage);
            }
            
            get().updateLastActivity();
          },
          
          clearChatMessages: () => {
            set((state) => {
              state.sessionData.chatMessages = [];
            });
            
            // Also clear in WebSocket store
            const wsStore = useWebSocketStore.getState();
            wsStore.clearChat();
          },
          
          loadChatHistory: async () => {
            const { sessionId } = get();
            if (!sessionId) return;
            
            try {
              // Try WebSocket first, fallback to REST
              const wsStore = useWebSocketStore.getState();
              let history;
              
              if (wsStore.isConnected()) {
                history = await wsClient.getChatHistory(50, 0);
              } else {
                const response = await chatAPI.getHistory(sessionId);
                history = response;
              }
              
              if (history?.messages) {
                get().setChatMessages(history.messages);
                // return data.messages || [];
              }
            } catch (error) {
              console.error('Failed to load chat history:', error);
              return [];
            }
          },

          // ========================================
          // WEBSOCKET SYNC
          // ========================================
          
          syncSessionData: async (force = false) => {
            const { sessionId, sessionData, pendingChanges, sessionMetadata } = get();
            
            if (!sessionId) return;
            if (!force && pendingChanges.length === 0) return;
            if (!force && get().syncStatus === 'syncing') return;

            set((state) => {
              state.syncStatus = 'syncing';
            });

            try {
              const wsStore = useWebSocketStore.getState();
              
              // Try WebSocket first, queue if not connected
              if (wsStore.isConnected()) {
                await wsClient.updateSession({
                  session_data: sessionData,
                  last_activity: Date.now(),
                  pending_changes: pendingChanges
                });
              } else {
                // Queue for later or use REST
                if (!force) {
                  wsStore.queueMessage({
                    type: 'session_update',
                    data: { session_data: sessionData }
                  });
                } else {
                  // Force REST sync
                  await sessionAPI.sync(sessionId, {
                    session_data: sessionData,
                    sync_timestamp: new Date().toISOString(),
                    metadata: sessionMetadata
                  });
                }
              }
              
              set((state) => {
                state.syncStatus = 'synced';
                state.lastSyncAt = Date.now();
                state.pendingChanges = [];
                state.syncError = null;
              });
            } catch (error) {
              console.error('Sync failed:', error);
              
              set((state) => {
                state.syncStatus = 'error';
                state.syncError = error.message;
              });
              
              // Retry after delay
              if (!force) {
                setTimeout(() => get().syncSessionData(), 5000);
              }
              get().handleSessionError(error, 'sync');
            }
          },

          queueChange: (change) => {
            set((state) => {
              state.pendingChanges.push({
                ...change,
                timestamp: Date.now()
              });
              
              if (state.syncStatus === 'synced') {
                state.syncStatus = 'pending';
              }
            });
            
            // Debounced sync
            clearTimeout(get()._syncDebounceTimer);
            get()._syncDebounceTimer = setTimeout(() => {
              get().syncSessionData();
            }, 1000);
          },

          quickSave: async () => {
            const { sessionId, sessionData } = get();
            if (!sessionId) return;
            
            try {
              // Try WebSocket first
              const wsStore = useWebSocketStore.getState();
              
              if (wsStore.isConnected()) {
                // Use WebSocket for quick save
                await wsClient.request('session_quicksave', {
                  session_data: sessionData,
                  timestamp: Date.now()
                });
              } else {
                // Fallback to REST
                await sessionAPI.quickSave(sessionId, sessionData);
              }
            } catch (error) {
              console.error('Quick save failed:', error);
            }
          },
          
          startAutoSync: () => {
            if (!get().autoSyncEnabled) return;
            
            // Stop any existing interval
            get().stopAutoSync();
            
            const intervalId = setInterval(() => {
              get().syncSessionData();
            }, SESSION_CONFIG.AUTO_SAVE_INTERVAL);
            
            set({ autoSyncIntervalId: intervalId });
            console.log('Auto-sync started');
          },
          
          stopAutoSync: () => {
            const intervalId = get().autoSyncIntervalId;
            if (intervalId) {
              clearInterval(intervalId);
              set({ autoSyncIntervalId: null });
              console.log('Auto-sync stopped');
            }
          },
          
          // ========================================
          // ERROR HANDLING
          // ========================================
          
          handleSessionError: (error, context) => {
            console.error(`Session error (${context}):`, error);
            
            // Send to Sentry with context
            captureException(error, {
              tags: {
                error_context: context,
                session_id: get().sessionId,
              },
              level: 'error',
              extra: {
                timestamp: new Date().toISOString(),
                connectionStatus: get().connectionStatus,
              }
            });
            
            set({
              sessionError: {
                message: error.message || 'Unknown error',
                context,
                timestamp: new Date().toISOString()
              },
              connectionStatus: 'error'
            });
          },
          
          clearSessionError: () => {
            set({ sessionError: null, connectionStatus: 'online' });
          },
          
          // ========================================
          // UTILITIES
          // ========================================
          getShareableUrl: () => {
            const { sessionId } = get();
            if (!sessionId) return null;
            
            const url = new URL(window.location.href);
            url.searchParams.set('session', sessionId);
            return url.toString();
          },
          
          clearSessionError: () => {
            set({ sessionError: null });
          },
          
          getSessionHealth: () => {
            const { 
              isSessionActive, 
              connectionStatus, 
              sessionError, 
              lastActivity 
            } = get();
            const wsStore = useWebSocketStore.getState();
            
            const timeSinceActivity = Date.now() - lastActivity;
            const timeoutWarning = timeSinceActivity > (SESSION_CONFIG.SESSION_TIMEOUT * 0.8);
            const isStale = timeSinceActivity > 5 * 60 * 1000; // 5 minutes
            
            return {
              status: connectionStatus,
              isActive: isSessionActive,
              isHealthy: connectionStatus === 'online' && !sessionError && isSessionActive,
              isStale,
              hasError: !!sessionError,
              error: sessionError,
              timeoutWarning,
              minutesUntilTimeout: Math.max(0, (SESSION_CONFIG.SESSION_TIMEOUT - timeSinceActivity) / 60000),
              wsConnected: wsStore.isConnected(),
              wsLatency: wsStore.health.latency,
              syncStatus: get().syncStatus
            };
          },
        })),
        // PERSIST CONFIGURATION
        {
          name: 'agentic-study-session',
          
          // Ensure proper hydration
          partialize: (state) => ({
            sessionId: state.sessionId,
            participantId: state.participantId,
            sessionData: state.sessionData,
            currentLanguage: state.currentLanguage,
            sessionStartTime: state.sessionStartTime,
            condition: state.condition
          }),
          
          // Merge strategy for rehydration
          merge: (persistedState, currentState) => ({
            ...currentState,
            ...persistedState,
            // Ensure sessionData is always valid
            sessionData: {
              ...currentState.sessionData,
              ...(persistedState.sessionData || {}),
              // Ensure currentWorkflow always exists
              currentWorkflow: persistedState.sessionData?.currentWorkflow || { nodes: [], edges: [] },
            }
          })
        }  
      )
    )
  )
);


// ============================================================
// WebSocket Event Subscriptions
// ============================================================
let isSyncing = false;
let lastSyncSessionId = null;

// When WebSocket connects, sync session
useWebSocketStore.subscribe(
  (state) => state.connection.status,
  (status) => {
    if (status === 'connected' && !isSyncing) {
      const sessionStore = useSessionStore.getState();
      const currentSessionId = sessionStore.sessionId;

      // Only sync if session exists, has changes, and we haven't just synced
      if (currentSessionId && 
          sessionStore.pendingChanges.length > 0 &&
          lastSyncSessionId !== currentSessionId) {
        isSyncing = true;
        lastSyncSessionId = currentSessionId;
        
        sessionStore.syncSessionData().finally(() => {
          isSyncing = false;
        });
      }
    }
  }
);

// Handle session sync responses
wsClient.on('session_synced', (data) => {
  const currentState = useSessionStore.getState().sessionData;
  
  // Only update if data actually changed
  if (data.session_data && JSON.stringify(currentState) !== JSON.stringify(data.session_data)) {
    useSessionStore.setState((state) => {
      state.syncStatus = 'synced';
      state.lastSyncAt = Date.now();
      
      state.sessionData = {
        ...state.sessionData,
        ...data.session_data
      };
    });
  }
});

// Update connection status based on WebSocket
let lastConnectionStatus = null;
useWebSocketStore.subscribe(
  (state) => state.connection.status,
  (status) => {
    const connectionStatus = 
      status === 'connected' ? 'online' :
      status === 'error' ? 'error' : 'offline';
    
    // Only update if actually changed
    if (connectionStatus !== lastConnectionStatus) {
      lastConnectionStatus = connectionStatus;
      useSessionStore.setState({ connectionStatus });
    }
  }
);

export { useSessionStore };
export default useSessionStore;