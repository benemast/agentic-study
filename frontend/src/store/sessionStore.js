// frontend/src/store/sessionStore.js
/**
 * Centralized Zustand store for session management
 * Consolidates all state management in one place
 */
import * as Sentry from "@sentry/react";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SESSION_CONFIG, TRACKING_EVENTS } from '../config/constants';
import { sessionAPI, interactionAPI } from '../config/api';
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

export const useSessionStore = create(
  persist(
    (set, get) => ({
      // ========================================
      // STATE
      // ========================================
      
      // Core session
      sessionId: null,
      participantId: null,
      sessionStartTime: null,
      isSessionActive: false,
      sessionSource: 'new', // 'new', 'url', 'restored'
      
      // Connection & health
      connectionStatus: 'online', // 'online', 'offline', 'error'
      lastActivity: Date.now(),
      sessionError: null,
      
      // Session data
      sessionData: {
        workflowsCreated: 0,
        workflowsExecuted: 0,
        totalTimeSpent: 0,
        currentView: 'dashboard',
        currentWorkflow: { nodes: [], edges: [] },
        interactions: [],
        chatMessages: [],
      },
      
      // Metadata
      sessionMetadata: getSessionMetadata(),

      // Language
      currentLanguage: getInitialLanguage(),
      availableLanguages: Object.keys(translations),
      
      // Auto-sync
      autoSyncEnabled: true,
      autoSyncIntervalId: null,
      
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
          sessionStartTime: new Date().toISOString(),
          isSessionActive: true,
          sessionSource,
          lastActivity: Date.now(),
          sessionMetadata: await getSessionMetadata()
        });

        Sentry.setUser({
          id: sessionIdToUse,
          participant_id: get().participantId || 'unknown',
        });
        
        // Set URL
        setSessionIdInUrl(sessionIdToUse);
        
        // Start auto-sync
        get().startAutoSync();
        
        return sessionIdToUse;
      },
      
      // ========================================
      // SESSION LIFECYCLE
      // ========================================
      
      endSession: async (reason = 'manual') => {
        const { sessionId, sessionData } = get();
        if (!sessionId) return;
        
        console.log(`Ending session: ${reason}`);
        
        // Stop auto-sync
        get().stopAutoSync();
        
        // Final sync
        await get().syncSessionData();
        
        // Notify backend
        try {
          await sessionAPI.end(sessionId, {
            end_time: new Date().toISOString(),
            final_stats: sessionData,
            end_reason: reason,
            final_metadata: get().sessionMetadata
          });
        } catch (error) {
          console.error('Failed to end session on server:', error);
        }

        Sentry.setUser(null);

        // Cleanup
        removeSessionIdFromUrl();
        set({ isSessionActive: false });
      },
      
      resetSession: () => {
        set({
          sessionId: null,
          participantId: null,
          sessionStartTime: null,
          isSessionActive: false,
          sessionSource: 'new',
          sessionData: {
            workflowsCreated: 0,
            workflowsExecuted: 0,
            totalTimeSpent: 0,
            currentView: 'dashboard',
            currentWorkflow: { nodes: [], edges: [] },
            interactions: []
          },
          lastActivity: Date.now(),
          sessionError: null,
          connectionStatus: 'online',
          sessionMetadata: getSessionMetadata()
        });
      },
      
      // ========================================
      // ACTIVITY TRACKING
      // ========================================
      
      updateLastActivity: () => {
        set({ lastActivity: Date.now() });
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
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            interactions: [...state.sessionData.interactions, interaction]
          }
        }));
        
        // Send to backend
        try {
          await interactionAPI.track(sessionId, interaction);
          
          // Clear error if successful
          if (get().connectionStatus === 'error') {
            set({ connectionStatus: 'online', sessionError: null });
          }
        } catch (error) {
          console.error('Failed to track interaction:', error);
    
          // Log interaction tracking failures
          Sentry.captureException(error, {
            tags: {
              error_type: 'interaction_tracking_failed',
              event_type: eventType
            },
            contexts: {
              session: {
                session_id: sessionId,
                event_type: eventType,
              }
            }
          });
          
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
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            currentView: view
          }
        }));
        get().trackInteraction(TRACKING_EVENTS.VIEW_CHANGE, { new_view: view });
      },
      
      updateWorkflow: (nodes, edges) => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            currentWorkflow: { nodes, edges }
          }
        }));
      },
      
      incrementWorkflowsCreated: () => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            workflowsCreated: state.sessionData.workflowsCreated + 1
          }
        }));
        get().trackInteraction(TRACKING_EVENTS.WORKFLOW_SAVED);
      },
      
      incrementWorkflowsExecuted: () => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            workflowsExecuted: state.sessionData.workflowsExecuted + 1
          }
        }));
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
      
      // ========================================
      // CHAT MESSAGES MANAGEMENT
      // ========================================
      
      getChatMessages: () => {
        return get().sessionData.chatMessages || [];
      },
      
      setChatMessages: (messages) => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            chatMessages: messages
          }
        }));
        
        // Auto-sync when messages change
        get().updateLastActivity();
      },
      
      addChatMessage: (message) => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            chatMessages: [...state.sessionData.chatMessages, message]
          }
        }));
        
        get().updateLastActivity();
      },
      
      updateChatMessage: (index, updates) => {
        set((state) => {
          const messages = [...state.sessionData.chatMessages];
          messages[index] = { ...messages[index], ...updates };
          return {
            sessionData: {
              ...state.sessionData,
              chatMessages: messages
            }
          };
        });
        
        get().updateLastActivity();
      },
      
      clearChatMessages: () => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            chatMessages: []
          }
        }));
      },
      
      loadChatHistory: async () => {
        const { sessionId } = get();
        if (!sessionId) return;
        
        try {
          const { chatAPI } = await import('../config/api');
          const data = await chatAPI.getHistory(sessionId);
          
          set((state) => ({
            sessionData: {
              ...state.sessionData,
              chatMessages: data.messages || []
            }
          }));
          
          return data.messages || [];
        } catch (error) {
          console.error('Failed to load chat history:', error);
          return [];
        }
      },

      // ========================================
      // SYNC & PERSISTENCE
      // ========================================
      
      syncSessionData: async () => {
        const { sessionId, sessionData, sessionMetadata } = get();
        if (!sessionId) return;
        
        try {
          await sessionAPI.sync(sessionId, {
            session_data: sessionData,
            sync_timestamp: new Date().toISOString(),
            metadata: sessionMetadata
          });
        } catch (error) {
          console.error('Failed to sync session data:', error);
          get().handleSessionError(error, 'sync');
        }
      },
      
      quickSave: () => {
        const { sessionId, sessionData } = get();
        if (!sessionId) return;
        
        // Use sendBeacon for reliable delivery during page unload
        try {
          navigator.sendBeacon(
            `/api/sessions/${sessionId}/quick-save`,
            JSON.stringify({
              session_data: sessionData,
              timestamp: new Date().toISOString()
            })
          );
        } catch (error) {
          console.error('Quick save failed:', error);
        }
      },
      
      startAutoSync: () => {
        if (!get().autoSyncEnabled || get().autoSyncIntervalId) return;
        
        const intervalId = setInterval(() => {
          get().syncSessionData();
        }, SESSION_CONFIG.AUTO_SAVE_INTERVAL);
        
        set({ autoSyncIntervalId: intervalId });
        console.log('✅ Auto-sync started');
      },
      
      stopAutoSync: () => {
        const intervalId = get().autoSyncIntervalId;
        if (intervalId) {
          clearInterval(intervalId);
          set({ autoSyncIntervalId: null });
          console.log('⏸️ Auto-sync stopped');
        }
      },
      
      // ========================================
      // ERROR HANDLING
      // ========================================
      
      handleSessionError: (error, context) => {
        console.error(`Session error (${context}):`, error);
        
        // Send to Sentry with context
        Sentry.captureException(error, {
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
        
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?session=${sessionId}`;
      },
      
      getSessionHealth: () => {
        const { 
          isSessionActive, 
          connectionStatus, 
          sessionError, 
          lastActivity 
        } = get();
        
        const timeSinceActivity = Date.now() - lastActivity;
        const timeoutWarning = timeSinceActivity > (SESSION_CONFIG.SESSION_TIMEOUT * 0.8);
        
        return {
          isActive: isSessionActive,
          connection: connectionStatus,
          hasError: !!sessionError,
          timeoutWarning,
          minutesUntilTimeout: Math.max(0, (SESSION_CONFIG.SESSION_TIMEOUT - timeSinceActivity) / 60000),
          lastActivity: new Date(lastActivity).toLocaleTimeString()
        };
      },
    }),
    // PERSIST CONFIGURATION
    {
      name: 'agentic-study-session',
      
      // Ensure proper hydration
      partialize: (state) => ({
        sessionId: state.sessionId,
        participantId: state.participantId,
        sessionStartTime: state.sessionStartTime,
        sessionSource: state.sessionSource,
        sessionData: state.sessionData || {
          workflowsCreated: 0,
          workflowsExecuted: 0,
          totalTimeSpent: 0,
          currentView: 'dashboard',
          currentWorkflow: { nodes: [], edges: [] },
          interactions: []
        },
        sessionMetadata: state.sessionMetadata,
        currentLanguage: state.currentLanguage,
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
        },
      }),
    }
  )  
);