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

import { sessionAPI, chatAPI, interactionAPI } from '../services/api';

import { SESSION_CONFIG, TRACKING_EVENTS, STUDY_CONFIG } from '../config/constants';

import { 
  generateSessionId, 
  getSessionMetadata,
  getSessionIdFromUrl,
  setSessionIdInUrl,
  removeSessionIdFromUrl 
} from '../utils/sessionHelpers';

//import { initAnalytics } from '../utils/analytics';
import { translations } from '../config/locales';
import { isInitialized } from '@sentry/react';

const getInitialLanguage = () => {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && translations[urlLang]) {
    return { language: urlLang, source: 'url', wasSelected: false }
  }

  // Check localStorage
  const storedLang = localStorage.getItem('study-language');
  if (storedLang && translations[storedLang]) {
    return { language: storedLang, source: 'local', wasSelected: false }; 
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (translations[browserLang]) {
    return { language: browserLang, source: 'browser', wasSelected: false };
  }

  return { language: null, source: null, wasSelected: false }; 
};

const { initialLanguage, source , wasSelected } = getInitialLanguage();

const getInitialTheme = () => {
  // Check localStorage first
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  
  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
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
          isSessionInitialized: false,
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
            
            //Study Config
            studyConfig: null, // { group, task1, task2 }
            currentStep: 'welcome', // 'welcome', 'demographics', 'task_1', 'survey_1', 'task_2', 'survey_2', 'completion'
            studyStartedAt: null,
            welcomeCompletedAt: null,
            demographicsCompletedAt: null,
            task1CompletedAt: null,
            survey1Data: null,
            survey1CompletedAt: null,
            task2CompletedAt: null,
            survey2Data: null,
            survey2CompletedAt: null,
            studyCompletedAt: null,
          },

          demographicsData: {
            age: '',
            gender: '',
            education: '',
            field_of_study: '',
            occupation: '',
            programming_experience: '',
            ai_ml_experience: '',
            workflow_tools_used: [],
            technical_role: '',
            participation_motivation: '',
            expectations: '',
            time_availability: '',
            country: '',
            first_language: '',
            comments: ''
          },
          demographicsStep: 0,
          demographicsError: null,
          demographicsCompleted: false,
          demographicsCompletedAt: null,
          
          tutorialState: {
            screenTutorialShown: false,
            task1TutorialShown: false,
            task2TutorialShown: false,
          },

          // Activity tracking
          lastActivity: Date.now(),
          sessionError: null,
          
          // Connection status
          connectionStatus: 'online', // 'online', 'offline', 'error'
          
          // Metadata
          sessionMetadata: getSessionMetadata(),

          // Language
          currentLanguage: initialLanguage, 
          initialLanguageSource: source,
          wasLanguageSelected: wasSelected || false,
          availableLanguages: Object.keys(translations),    
          
          // Theme
          theme: getInitialTheme(),
          
          // Auto-sync
          autoSyncEnabled: true,
          autoSyncIntervalId: null,
          
          // Sync state
          syncStatus: 'synced', // 'synced' | 'syncing' | 'pending' | 'error'
          lastSyncAt: null,
          syncError: null,
          pendingChanges: [],
          _syncDebounceTimer: null,

          // App lifecycle
          appLifecycle: {
            isVisible: true,
            isOnline: true,
            lastVisibilityChange: Date.now(),
            lastOnlineChange: Date.now(),
          },
                  
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
              isSessionInitialized: true,
              sessionStartTime: Date.now(),
              lastActivity: Date.now(),
              connectionStatus: 'online',
              sessionMetadata: await getSessionMetadata()
            });

            /* REMOVED AS WEBSOCKET SHOULD BE HANDLED THROUGH WebSocketProvider.jsx
                Provider handles connection automatically now
                TODO: Delete after testing

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
            */
            // Set URL
            setSessionIdInUrl(sessionIdToUse);
            
            // Start auto-sync
            get().startAutoSync();
            
            return sessionIdToUse;
          },
          
          // ========================================
          // SESSION LIFECYCLE
          // ========================================
          /**
          * Update app visibility state
          * Called by SessionInitializer on visibility change
          * Other systems subscribe to this
          */
          setAppVisible: (isVisible) => {
            set((state) => {
              state.appLifecycle.isVisible = isVisible;
              state.appLifecycle.lastVisibilityChange = Date.now();
              if (isVisible) {
                get().startAutoSync();
              } else {
                get().stopAutoSync();
              }
            });
          },

          /**
          * Update app online state
          * Could be called by connectionMonitor
          */
          setAppOnline: (isOnline) => {
            set((state) => {
              state.appLifecycle.isOnline = isOnline;
              state.appLifecycle.lastOnlineChange = Date.now();
            });
          },
        
          /**
           * Get app lifecycle state
           * Useful for debugging
           */
          getAppLifecycle: () => {
            return get().appLifecycle;
          },
          
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
            try {
              // Send to backend
              // Use WebSocket for tracking if available
              const wsStore = useWebSocketStore.getState();
              if (wsStore.isConnected()) {
                wsStore.queueTrackingEvent(eventType, eventData);
              } else {
                // Fallback to REST             
                await interactionAPI.track(sessionId, interaction);
              }
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

          setLanguage: (lang, wasSelected = false) => {
            if (translations[lang]) {
              set({ currentLanguage: lang, wasLanguageSelected: wasSelected });
              
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
          

          setTheme : (newTheme) => {
            set({ theme: newTheme });

            // Update DOM
            const root = document.documentElement;
            if (newTheme === 'dark') {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          },
          // ========================================
          // STUDY CONFIG MANAGEMENT
          // ========================================

          /**
           * Initialize study configuration with counterbalancing
           */
          initializeStudyConfig: () => {
            const currentConfig = get().sessionData.studyConfig;
            if (currentConfig) {
              console.log('Study config already initialized:', currentConfig);
              return currentConfig;
            }
            
            const pID = get().participantId;
            console.log(pID);
            if(!pID){
              console.error("No Participant ID available!")
              return false;
            }

            // Counterbalancing: Group assignment based on participant ID
            const group = get().participantId  % 4;
            
            let config;
            switch(group) {
              case 1: // Group 1: WB→Wireless, AI→Shoes
                config = {
                  group: 1,
                  task1: { 
                    condition: 'workflow_builder', 
                    dataset: 'wireless', 
                    ...STUDY_CONFIG.TASKS.wireless 
                  },
                  task2: { 
                    condition: 'ai_assistant', 
                    dataset: 'shoes', 
                    ...STUDY_CONFIG.TASKS.shoes 
                  }
                };
                break;
                
              case 2: // Group 2: WB→Shoes, AI→Wireless
                config = {
                  group: 2,
                  task1: { 
                    condition: 'workflow_builder', 
                    dataset: 'shoes', 
                    ...STUDY_CONFIG.TASKS.shoes 
                  },
                  task2: { 
                    condition: 'ai_assistant', 
                    dataset: 'wireless', 
                    ...STUDY_CONFIG.TASKS.wireless 
                  }
                };
                break;
                
              case 3: // Group 3: AI→Wireless, WB→Shoes
                config = {
                  group: 3,
                  task1: { 
                    condition: 'ai_assistant', 
                    dataset: 'wireless', 
                    ...STUDY_CONFIG.TASKS.wireless 
                  },
                  task2: { 
                    condition: 'workflow_builder', 
                    dataset: 'shoes', 
                    ...STUDY_CONFIG.TASKS.shoes 
                  }
                };
                break;
                
              case 0: // Group 4: AI→Shoes, WB→Wireless
                config = {
                  group: 4,
                  task1: { 
                    condition: 'ai_assistant', 
                    dataset: 'shoes', 
                    ...STUDY_CONFIG.TASKS.shoes 
                  },
                  task2: { 
                    condition: 'workflow_builder', 
                    dataset: 'wireless', 
                    ...STUDY_CONFIG.TASKS.wireless 
                  }
                };
                break;
              default: 
                config= null
                console.log("Nothing could be set!!")
                break;
              
            }

            set((state) => {
              state.sessionData.studyConfig = config;
              state.sessionData.studyStartedAt = new Date().toISOString();
            });

            // Trigger sync
            get().syncSessionData();
            
            console.log('Study config initialized:', config);
            return config;
          },

          /**
           * Get current study configuration
           */
          getStudyConfig: () => {
            return get().sessionData.studyConfig;
          },

          /**
           * Update current study step
           */
          setStudyStep: (step) => {
            set((state) => {
              state.sessionData.currentStep = step;
            });
            get().syncSessionData();
          },

          /**
           * Get current study step
           */
          getStudyStep: () => {
            return get().sessionData.currentStep;
          },

          /**
           * Mark welcome completed
           */
          completeWelcome: () => {
            console.log('📋 Completing welcome screen...');
            
            // Save current state before modification (for potential rollback)
            const previousState = {
              welcomeCompletedAt: get().sessionData.welcomeCompletedAt,
              currentStep: get().sessionData.currentStep
            };

            try {
              // Update state
              set((state) => {
                state.sessionData.welcomeCompletedAt = new Date().toISOString();
                state.sessionData.currentStep = 'demographics';
              });
              
              // Sync to backend
              get().syncSessionData();
              
              // Track completion
              get().trackInteraction(TRACKING_EVENTS.WELCOME_COMPLETED);
              
              console.log('✅ Welcome completed successfully');
            }catch (error) {
              // Log error
              console.error('❌ Failed to complete welcome:', error);
              
              // Reset state to previous values
              set((state) => {
                state.sessionData.welcomeCompletedAt = previousState.welcomeCompletedAt;
                state.sessionData.currentStep = previousState.currentStep;
              });
              
              get().handleSessionError(error, 'welcome_completion');
            
              // Re-throw or handle gracefully
              throw error;
            };
          },

          /**
           * Complete demographics (already exists but update to set step)
           */
          /*completeDemographics: (data) => {

            console.log('📋 Completing demographics screen...');
            
            // Save current state before modification (for potential rollback)
            const previousState = {
              demographicsData: get().sessionData.demographicsData,
              demographicsComplete: get().sessionData.demographicsComplete,
              demographicsCompletedAt: get().sessionData.demographicsCompletedAt,
              currentStep: get().sessionData.currentStep
            };

            try {
              set((state) => {
                state.sessionData.demographicsData = data;
                state.sessionData.demographicsComplete = true;
                state.sessionData.demographicsCompletedAt = new Date().toISOString();
                state.sessionData.currentStep = 'task_1';
              });
              
              get().syncSessionData();
              get().trackInteraction(TRACKING_EVENTS.DEMOGRAPHICS_COMPLETED);
                
              console.log('Demographics completed');
              
            } catch (error) {
              console.error('❌ Failed to complete Task 1:', error);
              
              set((state) => {
                state.sessionData.demographicsData = previousState.demographicsData;
                state.sessionData.demographicsComplete = previousState.demographicsComplete;
                state.sessionData.demographicsCompletedAt = previousState.demographicsCompletedAt
                state.sessionData.currentStep = previousState.currentStep;
              });
              
              get().handleSessionError(error, 'demographics_completion');
              
              throw error;
            }
          },
          */

          /**
           * Complete task 1
           */
          completeTask1: () => {
            const task1 = get().sessionData.study?.task1;
            
            console.log(`Completing Task 1 (Condition: ${task1?.condition}; Dataset: ${task1?.dataset})...`);
            
            const previousState = {
              task1CompletedAt: get().sessionData.task1CompletedAt,
              currentStep: get().sessionData.currentStep
            };
            
            try {
              set((state) => {
                state.sessionData.task1CompletedAt = new Date().toISOString();
                state.sessionData.currentStep = 'survey_1';
              });
              
              get().syncSessionData();
              get().trackInteraction(TRACKING_EVENTS.TASK_COMPLETED, { task: 1, condition: task1?.condition, dataset: task1?.dataset });
              
              console.log(`Task 1 completed successfully`);
              
            } catch (error) {
              console.error('❌ Failed to complete Task 1:', error);
              
              set((state) => {
                state.sessionData.task1CompletedAt = previousState.task1CompletedAt;
                state.sessionData.currentStep = previousState.currentStep;
              });
              
              get().handleSessionError(error, 'task1_completion');
              
              throw error;
            }
          },
          /**
           * Complete survey 1
           */
          completeSurvey1: (surveyData) => {
            console.log('Completing Survey 1...');
            
            const previousState = {
              survey1Data: get().sessionData.survey1Data,
              survey1CompletedAt: get().sessionData.survey1CompletedAt,
              currentStep: get().sessionData.currentStep
            };
            
            try {
              set((state) => {
                state.sessionData.survey1Data = surveyData;
                state.sessionData.survey1CompletedAt = new Date().toISOString();
                state.sessionData.currentStep = 'task_2';
              });
              
              get().syncSessionData();
              get().trackInteraction(TRACKING_EVENTS.SURVEY_COMPLETED, { survey: 1 });
              
              console.log('Survey 1 completed successfully');
              
            } catch (error) {
              console.error('❌ Failed to complete Survey 1:', error);
              set((state) => {
                state.sessionData.survey1Data = previousState.survey1Data;
                state.sessionData.survey1CompletedAt = previousState.survey1CompletedAt;
                state.sessionData.currentStep = previousState.currentStep;
              });
              
              get().handleSessionError(error, 'survey1_completion');
              
              throw error;
            }
          },
          /**
           * Complete task 2
           */
          completeTask2: () => {
            const task2 = get().sessionData.study?.task2;
            
            console.log(`Completing Task 2 (Condition: ${task2?.condition}; Dataset: ${task2?.dataset})...`);
            
            const previousState = {
              task2CompletedAt: get().sessionData.task2CompletedAt,
              currentStep: get().sessionData.currentStep
            };
            
            try {
              set((state) => {
                state.sessionData.task2CompletedAt = new Date().toISOString();
                state.sessionData.currentStep = 'survey_2';
              });
              
              get().syncSessionData();
              get().trackInteraction(TRACKING_EVENTS.TASK_COMPLETED, { task: 2, condition: task2?.condition, dataset: task2?.dataset });
              
              console.log('Task 2 completed successfully');
              
            } catch (error) {
              console.error('❌ Failed to complete Task 2:', error);
              
              set((state) => {
                state.sessionData.task2CompletedAt = previousState.task2CompletedAt;
                state.sessionData.currentStep = previousState.currentStep;
              });

              get().handleSessionError(error, 'task2_completion');
              
              throw error;
            }
          },

          /**
           * Complete survey 2
           */
          completeSurvey2: (surveyData) => {
            console.log('Completing Survey 2...');
            
            const previousState = {
              survey2Data: get().sessionData.survey2Data,
              survey2CompletedAt: get().sessionData.survey2CompletedAt,
              currentStep: get().sessionData.currentStep
            };
            
            try {
              set((state) => {
                state.sessionData.survey2Data = surveyData;
                state.sessionData.survey2CompletedAt = new Date().toISOString();
                state.sessionData.currentStep = 'completion';
              });
              
              get().syncSessionData();
              get().trackInteraction(TRACKING_EVENTS.SURVEY_COMPLETED, { survey: 2 });
              
              console.log('Survey 2 completed successfully');
              
            } catch (error) {
              console.error('❌ Failed to complete Survey 2:', error);
              
              set((state) => {
                state.sessionData.survey2Data = previousState.survey2Data;
                state.sessionData.survey2CompletedAt = previousState.survey2CompletedAt;
                state.sessionData.currentStep = previousState.currentStep;
              });

              get().handleSessionError(error, 'survey2_completion');
              
              throw error;
            }
          },

          /**
           * Complete entire study
           */
          completeStudy: () => {
            console.log('Completing entire study...');
            
            const previousState = {
              studyCompletedAt: get().sessionData.studyCompletedAt
            };
            
            try {
              set((state) => {
                state.sessionData.studyCompletedAt = new Date().toISOString();
              });
              
              // Force immediate sync on completion
              get().syncSessionData(true);
              get().trackInteraction(TRACKING_EVENTS.STUDY_COMPLETED);
              
              console.log('Study completed successfully! Thank you for participating.');

              get()
              
            } catch (error) {
              console.error('❌ Failed to complete study:', error);
              
              set((state) => {
                state.sessionData.studyCompletedAt = previousState.studyCompletedAt;
              });

              get().handleSessionError(error, 'survey2_completion');
              
              throw error;
            }
          },
          /**
           * Get study progress summary
           */
          getStudyProgress: () => {
            const data = get().sessionData;
            return {
              currentStep: data.currentStep,
              config: data.studyConfig,
              welcomeCompleted: !!data.welcomeCompletedAt,
              demographicsCompleted: data.demographicsComplete,
              task1Completed: !!data.task1CompletedAt,
              survey1Completed: !!data.survey1CompletedAt,
              task2Completed: !!data.task2CompletedAt,
              survey2Completed: !!data.survey2CompletedAt,
              studyCompleted: !!data.studyCompletedAt,
              startedAt: data.studyStartedAt,
              completedAt: data.studyCompletedAt,
            };
          },
          

          // ========================================
          // DEMOGRAPHICS MANAGEMENT
          // ========================================

          /**
           * Set a single demographics field
           */
          setDemographicsField: (field, value) => {
            set((state) => {
              state.demographicsData[field] = value;
            });
            
            // Queue change for sync
            get().queueChange({
              type: 'demographics_field_updated',
              field: field,
              value: value
            });
          },

          /**
           * Set multiple demographics fields at once
           */
          setDemographicsFields: (fields) => {
            set((state) => {
              Object.entries(fields).forEach(([field, value]) => {
                state.demographicsData[field] = value;
              });
            });
            
            // Queue change for sync
            get().queueChange({
              type: 'demographics_fields_updated',
              fields: Object.keys(fields)
            });
          },

          /**
           * Set demographics step
           */
          setDemographicsStep: (step) => {
            set((state) => {
              state.demographicsStep = step;
            });
          },

          /**
           * Set demographics error
           */
          setDemographicsError: (error) => {
            set((state) => {
              state.demographicsError = error;
            });
          },

          /**
           * Clear demographics error
           */
          clearDemographicsError: () => {
            set((state) => {
              state.demographicsError = null;
            });
          },

          /**
           * Reset demographics data
           */
          resetDemographics: () => {
            set((state) => {
              state.demographicsData = {
                age: '',
                gender: '',
                education: '',
                field_of_study: '',
                occupation: '',
                programming_experience: '',
                ai_ml_experience: '',
                workflow_tools_used: [],
                technical_role: '',
                participation_motivation: '',
                expectations: '',
                time_availability: '',
                country: '',
                first_language: '',
                comments: ''
              };
              state.demographicsStep = 0;
              state.demographicsError = null;
              state.demographicsCompleted = false;
              state.demographicsCompletedAt = null;
            });
          },

          /**
           * Complete demographics
           * Validates, saves to sessionData, and syncs to backend
           */
          completeDemographics: async (data) => {
            console.log('Completing demographics...');
            
            const previousState = {
              demographicsData: get().demographicsData,
              demographicsCompleted: get().demographicsCompleted,
              demographicsCompletedAt: get().demographicsCompletedAt,
              currentStep: get().sessionData.currentStep
            };
            
            try {
              set((state) => {
                state.demographicsData = data;
                state.demographicsCompleted = true;
                state.demographicsCompletedAt = new Date().toISOString();
                state.demographicsError = null;
                
                // Update sessionData
                state.sessionData.demographics = data;
                state.sessionData.demographicsCompleted = true;
                state.sessionData.demographicsCompletedAt = new Date().toISOString();

                // Move on to task 1
                state.sessionData.currentStep = 'task_1';
              });
              
              // Sync to backend
              await get().syncSessionData();
              
             
              get().trackInteraction(TRACKING_EVENTS.DEMOGRAPHICS_COMPLETED, {
                fieldsCompleted: Object.keys(data).filter(k => data[k]).length,
                timestamp: new Date().toISOString()
              });
              
              console.log('✅ Demographics completed successfully');
              
            } catch (error) {
              console.error('❌ Failed to complete demographics:', error);
                            
              // Rollback state
              set((state) => {
                state.demographicsData = previousState.demographicsData;
                state.demographicsCompleted = previousState.demographicsCompleted;
                state.demographicsCompletedAt = previousState.demographicsCompletedAt;
                state.sessionData.currentStep = previousState.currentStep;
                
                state.demographicsError = 'Failed to complete demographics. Please try again.';
              });
              
              get().handleSessionError(error, 'demographics_completion');
              
              throw error;
            }
          },

          // ========================================
          // TUTORIAL ACTIONS
          // ========================================
          
          /**
           * Update tutorial state
           */
          updateTutorialState: (updates) => {
            set((state) => {
              state.tutorialState = {
                ...state.tutorialState,
                ...updates
              };
            });
          },
          
          /**
           * Mark screen tutorial as shown
           */
          markScreenTutorialShown: () => {
            set((state) => {
              state.tutorialState.screenTutorialShown = true;
            });
          },
          
          /**
           * Mark task tutorial as shown
           */
          markTaskTutorialShown: (taskNumber) => {
            set((state) => {
              const key = taskNumber === 1 ? 'task1TutorialShown' : 'task2TutorialShown';
              state.tutorialState[key] = true;
            });
          },
          
          /**
           * Reset all tutorials (for testing)
           */
          resetAllTutorials: () => {
            set((state) => {
              state.tutorialState = {
                screenTutorialShown: false,
                task1TutorialShown: false,
                task2TutorialShown: false,
              };
            });
          },
          
          /**
           * Get tutorial state
           */
          getTutorialState: () => {
            return get().tutorialState;
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
            console.log("SessionStore: Loading Chat History")
            try {
              // Try WebSocket first, fallback to REST
              const wsStore = useWebSocketStore.getState();
              
              let history;
              

              if (wsStore.isConnected()) {
                console.log("WS Store being used!!")
                history = await wsClient.getChatHistory();
              } else {
                console.log("REST being used!!")
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
            const { sessionId, sessionData, pendingChanges, sessionMetadata, connectionStatus } = get();

             try {
              const wsStore = useWebSocketStore.getState();

              if (!sessionId) {
                console.log('Sync skipped due to missing session ID');
                return;
              }
              if (!(connectionStatus === 'online')) {
                console.log('Sync skipped due to offline status');
                return;
              }
              if (!force && pendingChanges.length === 0) {
                console.log('Sync skipped due to no pending changes');
                return;
              }
              if (!force && get().syncStatus === 'syncing') {
                console.log('Sync skipped due to already syncing');
                return;
              }
              if (wsStore.chat.isStreaming) {
                console.log('Sync skipped due to active streaming');
                return;
              }
                 

              set((state) => {
                state.syncStatus = 'syncing';
              });          
              
              // Try WebSocket first, queue if not connected
              if (wsStore.isConnected()) {
                await wsClient.syncSession({
                  session_data: sessionData,
                  sync_timestamp: Date.now(),
                  pending_changes: pendingChanges
                });
              } else {
                // Queue for later or use REST
                if (!force) {
                  wsStore.queueMessage({
                    type: 'session_sync',
                    session_data: sessionData,
                    sync_timestamp: Date.now(),
                    pending_changes: pendingChanges
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
                  timestamp: new Date().toISOString()
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
                currentStep: get().sessionData?.currentStep
              }
            });
  
            // Internal error tracking (same pattern as useTracking hook)
            get().trackInteraction(TRACKING_EVENTS.ERROR_OCCURRED, {
              errorType: context,
              errorMessage: error.message || 'Unknown error',
              sessionId: get().sessionId,
              timestamp: new Date().toISOString(),
              connectionStatus: get().connectionStatus
            });
            
            set((state) => {
              state.sessionError = {
                message: error.message || 'Unknown error',
                context,
                timestamp: new Date().toISOString()
              };
              
              // Only set connection error for connection-related issues
              if (context === 'connection' || context === 'sync' || context === 'websocket') {
                state.connectionStatus = 'error';
              }
            });
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
            wasLanguageSelected: state.wasLanguageSelected,
            theme: state.theme,
            sessionStartTime: state.sessionStartTime,
            condition: state.condition,
            tutorialState: state.tutorialState,

            demographicsData: state.demographicsData,
            demographicsStep: state.demographicsStep,
            demographicsCompleted: state.demographicsCompleted,
            demographicsCompletedAt: state.demographicsCompletedAt
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

export { useSessionStore };
export default useSessionStore;