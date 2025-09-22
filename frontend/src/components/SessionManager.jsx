import React, { useEffect, useState, useRef } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Guard against double execution
let isInitializing = false;
let autoSyncInterval = null;

// Utility functions
const generateSessionId = () => {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(8);
    window.crypto.getRandomValues(array);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from(array, byte => characters[byte % characters.length]).join('');
  }
  
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
console.log('API Base URL:', API_BASE_URL);

const getSessionIdFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('session');
};

const setSessionIdInUrl = (sessionId) => {
  const url = new URL(window.location);
  url.searchParams.set('session', sessionId);
  window.history.replaceState({}, '', url.toString());
};

const removeSessionIdFromUrl = () => {
  const url = new URL(window.location);
  url.searchParams.delete('session');
  window.history.replaceState({}, '', url.toString());
};

const getSessionMetadata = () => ({
  browserInfo: navigator.userAgent,
  screenSize: `${window.screen.width}x${window.screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: navigator.language,
  referrer: document.referrer,
  pageVisibility: !document.hidden,
  cookiesEnabled: navigator.cookieEnabled,
  onlineStatus: navigator.onLine
});

// Enhanced Session Store with all features
const useSessionStore = create(
  persist(
    (set, get) => ({
      // Core session state
      sessionId: null,
      participantId: null,
      sessionStartTime: null,
      isSessionActive: false,
      sessionSource: 'new',
      
      // Enhanced session management
      sessionTimeout: 60 * 60 * 1000, // 60 minutes
      lastActivity: Date.now(),
      sessionError: null,
      connectionStatus: 'online', // 'online', 'offline', 'error'
      autoSyncEnabled: true,
      
      // Session metadata
      sessionMetadata: getSessionMetadata(),
      
      // Session data
      sessionData: {
        workflowsCreated: 0,
        workflowsExecuted: 0,
        totalTimeSpent: 0,
        currentView: 'dashboard',
        interactions: []
      },

      // Initialize session with all enhancements
      initializeSession: async () => {
        if (isInitializing) {
          console.log('⏸️ Session initialization already in progress, skipping...');
          return;
        }
        
        isInitializing = true;
        
        try {
          const urlSessionId = getSessionIdFromUrl();
          const existingSession = get().sessionId;
          
          let sessionIdToUse = null;
          let sessionSource = 'new';

          // Priority: URL > localStorage > create new
          if (urlSessionId) {
            console.log('🔗 Found session ID in URL:', urlSessionId);
            sessionIdToUse = urlSessionId;
            sessionSource = 'url';
            
            // Validate session on server
            const isValid = await get().validateSession(urlSessionId);
            if (isValid) {
              try {
                const response = await fetch(`${API_BASE_URL}/sessions/${urlSessionId}`);
                if (response.ok) {
                  const sessionData = await response.json();
                  console.log('✅ Restored session from URL:', sessionData);
                  
                  set({
                    sessionId: urlSessionId,
                    participantId: sessionData.participant_id,
                    sessionStartTime: sessionData.start_time,
                    isSessionActive: true,
                    sessionSource: 'url',
                    connectionStatus: 'online',
                    lastActivity: Date.now()
                  });
                  
                  setSessionIdInUrl(urlSessionId);
                  get().startAutoSync();
                  get().updateLastActivity();
                  return;
                }
              } catch (error) {
                console.error('❌ Failed to fetch session from URL:', error);
                get().handleSessionError(error, 'url_restoration');
              }
            }
            
            console.log('⚠️ Session not found on server, creating new one');
            sessionSource = 'new';
            sessionIdToUse = generateSessionId();
          } else if (existingSession) {
            console.log('💾 Found existing session in localStorage:', existingSession);
            sessionIdToUse = existingSession;
            sessionSource = 'localStorage';
            
            // Validate existing session
            const isValid = await get().validateSession(existingSession);
            if (isValid) {
              setSessionIdInUrl(existingSession);
              set({ 
                isSessionActive: true, 
                sessionSource: 'localStorage',
                connectionStatus: 'online',
                lastActivity: Date.now()
              });
              get().startAutoSync();
              get().updateLastActivity();
              return;
            } else {
              console.log('⚠️ Existing session invalid, creating new one');
              sessionSource = 'new';
              sessionIdToUse = generateSessionId();
            }
          } else {
            console.log('🆕 Creating new session');
            sessionIdToUse = generateSessionId();
            sessionSource = 'new';
          }

          // Create new session
          if (sessionSource === 'new') {
            const startTime = new Date().toISOString();
            const metadata = getSessionMetadata();
            
            try {
              const response = await fetch('${API_BASE_URL}/sessions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  session_id: sessionIdToUse,
                  start_time: startTime,
                  user_agent: metadata.browserInfo,
                  screen_resolution: metadata.screenSize,
                  metadata: metadata
                })
              });

              if (response.ok) {
                const sessionData = await response.json();
                
                set({
                  sessionId: sessionIdToUse,
                  participantId: sessionData.participant_id,
                  sessionStartTime: startTime,
                  isSessionActive: true,
                  sessionSource: sessionSource,
                  sessionMetadata: metadata,
                  connectionStatus: 'online',
                  lastActivity: Date.now()
                });

                setSessionIdInUrl(sessionIdToUse);
                get().startAutoSync();
                get().updateLastActivity();
                
                console.log('✅ Session created and added to URL:', sessionIdToUse);
              } else {
                throw new Error('Failed to create session on server');
              }
            } catch (error) {
              console.error('❌ Failed to create session:', error);
              get().handleSessionError(error, 'session_creation');
              
              // Still set session locally for offline capability
              set({
                sessionId: sessionIdToUse,
                sessionStartTime: startTime,
                isSessionActive: true,
                sessionSource: sessionSource,
                sessionMetadata: metadata,
                connectionStatus: 'offline',
                lastActivity: Date.now()
              });
              setSessionIdInUrl(sessionIdToUse);
              get().startAutoSync(); // Will attempt to sync when back online
            }
          }
        } finally {
          isInitializing = false;
        }
      },

      // Session validation
      validateSession: async (sessionId) => {
        const idToValidate = sessionId || get().sessionId;
        if (!idToValidate) return false;
        
        try {
          const response = await fetch(`${API_BASE_URL}/sessions/${idToValidate}/validate`);
          if (response.ok) {
            set({ connectionStatus: 'online' });
            return true;
          } else if (response.status === 404) {
            console.warn('Session not found on server');
            return false;
          } else {
            throw new Error(`Session validation failed: ${response.status}`);
          }
        } catch (error) {
          console.error('Session validation error:', error);
          get().handleSessionError(error, 'validation');
          set({ connectionStatus: 'error' });
          return false;
        }
      },

      // Session timeout management
      checkSessionTimeout: () => {
        const { lastActivity, sessionTimeout } = get();
        if (lastActivity && Date.now() - lastActivity > sessionTimeout) {
          console.warn('⏰ Session timeout detected');
          return true;
        }
        return false;
      },

      updateLastActivity: () => {
        set({ 
          lastActivity: Date.now(),
          sessionMetadata: {
            ...get().sessionMetadata,
            pageVisibility: !document.hidden,
            onlineStatus: navigator.onLine
          }
        });
        
        // Check for timeout on each activity
        if (get().checkSessionTimeout()) {
          get().handleSessionTimeout();
        }
      },

      handleSessionTimeout: () => {
        console.warn('🚨 Session timed out');
        set({ 
          sessionError: { 
            message: 'Session has timed out due to inactivity', 
            context: 'timeout',
            timestamp: new Date().toISOString()
          }
        });
        // Could trigger a warning modal or auto-save
      },

      // Auto-sync functionality
      startAutoSync: () => {
        if (!get().autoSyncEnabled || autoSyncInterval) return;
        
        console.log('🔄 Starting auto-sync (every 5 minutes)');
        autoSyncInterval = setInterval(() => {
          get().syncSessionData();
        }, 5 * 60 * 1000); // 5 minutes
        
        // Initial sync
        setTimeout(() => get().syncSessionData(), 10000); // First sync after 10 seconds
      },

      stopAutoSync: () => {
        if (autoSyncInterval) {
          clearInterval(autoSyncInterval);
          autoSyncInterval = null;
          console.log('⏹️ Auto-sync stopped');
        }
      },

      syncSessionData: async () => {
        const { sessionId, sessionData, connectionStatus } = get();
        if (!sessionId || connectionStatus === 'offline') return;
        
        try {
          console.log('🔄 Syncing session data...');
          const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_data: sessionData,
              last_activity: get().lastActivity,
              metadata: get().sessionMetadata,
              sync_timestamp: new Date().toISOString()
            })
          });

          if (response.ok) {
            console.log('✅ Session data synced successfully');
            set({ connectionStatus: 'online', sessionError: null });
          } else {
            throw new Error(`Sync failed: ${response.status}`);
          }
        } catch (error) {
          console.error('❌ Failed to sync session data:', error);
          get().handleSessionError(error, 'sync');
          set({ connectionStatus: 'error' });
        }
      },

      // Error handling
      handleSessionError: (error, context) => {
        console.error(`Session error in ${context}:`, error);
        set({ 
          sessionError: { 
            message: error.message, 
            context,
            timestamp: new Date().toISOString()
          },
          connectionStatus: 'error' 
        });
        
        // Could implement retry logic here
        if (context === 'sync') {
          // Retry sync in 30 seconds
          setTimeout(() => {
            if (get().connectionStatus === 'error') {
              get().syncSessionData();
            }
          }, 30000);
        }
      },

      clearSessionError: () => {
        set({ sessionError: null });
      },

      // Track user interactions (enhanced)
      trackInteraction: async (eventType, eventData = {}) => {
        const { sessionId, sessionData } = get();
        
        // Update activity timestamp
        get().updateLastActivity();
  
        const interaction = {
          timestamp: new Date().toISOString(),
          event_type: eventType,
          event_data: {
            ...eventData,
            page_visibility: !document.hidden,
            online_status: navigator.onLine,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            scroll_position: window.pageYOffset,
            current_url: window.location.href,  // This will be captured as page_url
            // Add any other client-side data you want to track
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
          await fetch(`${API_BASE_URL}/sessions/${sessionId}/interactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(interaction)
          });
          
          // Update connection status on successful interaction
          if (get().connectionStatus === 'error') {
            set({ connectionStatus: 'online', sessionError: null });
          }
        } catch (error) {
          console.error('Failed to track interaction:', error);
          get().handleSessionError(error, 'interaction_tracking');
        }
      },

      // Update current view
      setCurrentView: (view) => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            currentView: view
          }
        }));
        
        get().trackInteraction('view_change', { new_view: view });
      },

      // Workflow tracking
      incrementWorkflowsCreated: () => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            workflowsCreated: state.sessionData.workflowsCreated + 1
          }
        }));
        get().trackInteraction('workflow_created');
      },

      incrementWorkflowsExecuted: () => {
        set((state) => ({
          sessionData: {
            ...state.sessionData,
            workflowsExecuted: state.sessionData.workflowsExecuted + 1
          }
        }));
        get().trackInteraction('workflow_executed');
      },

      // Enhanced end session
      endSession: async (reason = 'manual') => {
        const { sessionId, sessionData } = get();
        
        console.log(`🔚 Ending session (${reason})`);
        
        // Stop auto-sync
        get().stopAutoSync();
        
        // Final sync
        await get().syncSessionData();
        
        try {
          await fetch(`${API_BASE_URL}/sessions/${sessionId}/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              end_time: new Date().toISOString(),
              final_stats: sessionData,
              end_reason: reason,
              final_metadata: get().sessionMetadata
            })
          });
        } catch (error) {
          console.error('Failed to end session on server:', error);
        }

        // Clean up
        removeSessionIdFromUrl();
        set({ isSessionActive: false });
      },

      // Quick save for page unload
      quickSave: () => {
        const { sessionId, sessionData } = get();
        if (!sessionId) return;
        
        console.log('💾 Quick saving session data...');
        
        // Use sendBeacon for reliable delivery during page unload
        try {
          navigator.sendBeacon(
            `${API_BASE_URL}/sessions/${sessionId}/quick-save`,
            JSON.stringify({
              session_data: sessionData,
              quick_save_timestamp: new Date().toISOString(),
              page_unload: true
            })
          );
        } catch (error) {
          console.error('Quick save failed:', error);
        }
      },

      // Get shareable URL
      getShareableUrl: () => {
        const { sessionId } = get();
        if (!sessionId) return null;
        
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?session=${sessionId}`;
      },

      // Get session health status
      getSessionHealth: () => {
        const { 
          isSessionActive, 
          connectionStatus, 
          sessionError, 
          lastActivity, 
          sessionTimeout 
        } = get();
        
        const timeSinceActivity = Date.now() - lastActivity;
        const timeoutWarning = timeSinceActivity > (sessionTimeout * 0.8); // 80% of timeout
        
        return {
          isActive: isSessionActive,
          connection: connectionStatus,
          hasError: !!sessionError,
          timeoutWarning,
          minutesUntilTimeout: Math.max(0, (sessionTimeout - timeSinceActivity) / 60000),
          lastActivity: new Date(lastActivity).toLocaleTimeString()
        };
      }
    }),
    {
      name: 'agentic-study-session',
      partialize: (state) => ({
        sessionId: state.sessionId,
        participantId: state.participantId,
        sessionStartTime: state.sessionStartTime,
        sessionData: state.sessionData,
        sessionMetadata: state.sessionMetadata,
        lastActivity: state.lastActivity
      })
    }
  )
);

// Enhanced Session Initialization Component
const SessionInitializer = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const initRef = useRef(false);
  
  const initializeSession = useSessionStore(state => state.initializeSession);
  const quickSave = useSessionStore(state => state.quickSave);
  const endSession = useSessionStore(state => state.endSession);
  const updateLastActivity = useSessionStore(state => state.updateLastActivity);

  // Initialize session
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const initialize = async () => {
      try {
        await initializeSession();
        setIsInitialized(true);
      } catch (error) {
        console.error('Session initialization failed:', error);
        setInitError(error.message);
        setIsInitialized(true);
      }
    };

    initialize();
  }, [initializeSession]);

  // Page unload handling
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      console.log('📤 Page unloading, quick saving...');
      quickSave();
      
      // Optional: Show warning for unsaved work
      // e.preventDefault();
      // e.returnValue = '';
    };
    
    const handleUnload = () => {
      quickSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [quickSave]);

  // Activity tracking
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateLastActivity();
    };

    // Throttle activity updates to every 30 seconds
    let lastUpdate = 0;
    const throttledHandleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 30000) { // 30 seconds
        handleActivity();
        lastUpdate = now;
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledHandleActivity, true);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledHandleActivity, true);
      });
    };
  }, [updateLastActivity]);

  // Page visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      updateLastActivity();
      
      if (document.hidden) {
        console.log('📱 Page hidden, quick saving...');
        quickSave();
      } else {
        console.log('👁️ Page visible again');
        updateLastActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [quickSave, updateLastActivity]);

  // Online/offline handling
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online');
      updateLastActivity();
      useSessionStore.setState({ connectionStatus: 'online' });
    };

    const handleOffline = () => {
      console.log('📡 Gone offline');
      quickSave(); // Save before going offline
      useSessionStore.setState({ connectionStatus: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [quickSave, updateLastActivity]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Initializing Study Session
            </h2>
            <p className="text-gray-600">
              {getSessionIdFromUrl() ? 'Restoring your session...' : 'Setting up your research session...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SessionStatusBar />
      {children}
    </div>
  );
};

// Session Status Bar Component
const SessionStatusBar = () => {
  const { sessionId, connectionStatus, sessionError, sessionSource } = useSessionStore();
  const clearSessionError = useSessionStore(state => state.clearSessionError);
  const [showStatus, setShowStatus] = useState(false);

  // Auto-hide success messages
  useEffect(() => {
    if (sessionSource === 'url') {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [sessionSource]);

  // Show status for errors or connection issues
  useEffect(() => {
    if (sessionError || connectionStatus !== 'online') {
      setShowStatus(true);
    }
  }, [sessionError, connectionStatus]);

  if (!showStatus) return null;

  return (
    <div className={`border-b px-4 py-2 text-sm ${
      sessionError || connectionStatus === 'error' 
        ? 'bg-red-50 border-red-200 text-red-700'
        : connectionStatus === 'offline'
        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'  
        : 'bg-blue-50 border-blue-200 text-blue-700'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {connectionStatus === 'error' && <span>❌</span>}
          {connectionStatus === 'offline' && <span>📡</span>}
          {connectionStatus === 'online' && sessionSource === 'url' && <span>🔗</span>}
          
          <span>
            {sessionError && `Error: ${sessionError.message}`}
            {connectionStatus === 'offline' && 'Working offline - data will sync when reconnected'}
            {connectionStatus === 'error' && 'Connection issues - retrying...'}
            {sessionSource === 'url' && !sessionError && `Session restored from URL: ${sessionId}`}
          </span>
        </div>
        
        <button
          onClick={() => {
            setShowStatus(false);
            if (sessionError) clearSessionError();
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Enhanced Welcome Screen (same as before but with error handling)
const WelcomeScreen = ({ onContinue }) => {
  const { sessionId, sessionSource, getShareableUrl, trackInteraction } = useSessionStore();
  const [urlCopied, setUrlCopied] = useState(false);

  const handleContinue = () => {
    trackInteraction('welcome_completed', { session_source: sessionSource });
    onContinue();
  };

  const copyUrlToClipboard = async () => {
    try {
      const shareableUrl = getShareableUrl();
      await navigator.clipboard.writeText(shareableUrl);
      setUrlCopied(true);
      trackInteraction('session_url_copied');
      setTimeout(() => setUrlCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full mx-4">
        <div className="text-center">
          <div className="text-5xl mb-6">🤖</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {sessionSource === 'url' ? 'Welcome Back!' : 'Welcome to the Agentic Study'}
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {sessionSource === 'url' 
              ? 'Your session has been restored. You can continue where you left off.'
              : 'You\'ll be building and testing AI workflows using our visual workflow builder. This study helps us understand how people design agentic systems.'
            }
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-600">Your Participant ID:</div>
            <div className="text-2xl font-mono font-bold text-blue-600 mb-3">{sessionId}</div>
            
            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-500 mb-2">Continue on another device:</div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={getShareableUrl() || ''}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded font-mono"
                />
                <button
                  onClick={copyUrlToClipboard}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    urlCopied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {urlCopied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Save this URL to resume your session on any device
              </p>
            </div>
          </div>

          {sessionSource === 'new' && (
            <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">What you'll do:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Explore the workflow builder interface</li>
                <li>• Create AI agent workflows</li>
                <li>• Test different workflow configurations</li>
                <li>• Complete various tasks and scenarios</li>
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500 mb-6">
            This study is anonymous. We only collect interaction data to improve the platform.
            Your session is automatically saved and synced.
          </p>

          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {sessionSource === 'url' ? 'Continue Session' : 'Start Study Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Session Info with health status
const SessionInfo = ({ isCollapsed }) => {
  const { sessionId, participantId, sessionStartTime, sessionData, getShareableUrl, getSessionHealth } = useSessionStore();
  const [timeSpent, setTimeSpent] = useState('0m');
  const [showUrl, setShowUrl] = useState(false);
  const [sessionHealth, setSessionHealth] = useState({});

  useEffect(() => {
    const updateTime = () => {
      if (!sessionStartTime) return;

      const now = new Date();
      const start = new Date(sessionStartTime);
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) {
        setTimeSpent(`${diffMins}m`);
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setTimeSpent(`${hours}h ${mins}m`);
      }

      // Update session health
      setSessionHealth(getSessionHealth());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [sessionStartTime, getSessionHealth]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(getShareableUrl());
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  if (isCollapsed) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {participantId ? participantId.toString().slice(-2) : 'U'}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">Study Participant</p>
          <p className="text-xs text-gray-500">{sessionId}</p>
        </div>
        
        {/* Connection status indicator */}
        <div className="flex items-center space-x-1">
          {sessionHealth.connection === 'online' && <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />}
          {sessionHealth.connection === 'offline' && <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Offline" />}
          {sessionHealth.connection === 'error' && <div className="w-2 h-2 bg-red-500 rounded-full" title="Connection Error" />}
          
          <button
            onClick={() => setShowUrl(!showUrl)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Share session URL"
          >
            🔗
          </button>
        </div>
      </div>
      
      {/* Timeout warning */}
      {sessionHealth.timeoutWarning && (
        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs">
          <div className="flex items-center space-x-1">
            <span>⏰</span>
            <span className="text-yellow-800">
              Session expires in {Math.floor(sessionHealth.minutesUntilTimeout)} minutes
            </span>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {sessionHealth.hasError && (
        <div className="mb-2 p-2 bg-red-100 border border-red-200 rounded text-xs">
          <div className="flex items-center space-x-1">
            <span>❌</span>
            <span className="text-red-800">Connection issues detected</span>
          </div>
        </div>
      )}
      
      {/* URL sharing */}
      {showUrl && (
        <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={getShareableUrl() || ''}
              readOnly
              className="flex-1 px-1 py-1 bg-white border border-gray-300 rounded text-xs font-mono"
            />
            <button
              onClick={copyUrl}
              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}
      
      {/* Session stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <div className="font-medium">Time:</div>
          <div>{timeSpent}</div>
        </div>
        <div>
          <div className="font-medium">Workflows:</div>
          <div>{sessionData.workflowsCreated}</div>
        </div>
        <div>
          <div className="font-medium">Status:</div>
          <div className="capitalize">{sessionHealth.connection}</div>
        </div>
        <div>
          <div className="font-medium">Events:</div>
          <div>{sessionData.interactions.length}</div>
        </div>
      </div>
    </div>
  );
};

// Tracked Button Component (enhanced)
const TrackedButton = ({ children, eventType, eventData, onClick, className, ...props }) => {
  const trackInteraction = useSessionStore(state => state.trackInteraction);

  const handleClick = (e) => {
    trackInteraction(eventType, eventData);
    if (onClick) onClick(e);
  };

  return (
    <button onClick={handleClick} className={className} {...props}>
      {children}
    </button>
  );
};

// Tracked Navigation Item (enhanced)
const TrackedNavItem = ({ icon, label, viewId, isActive, badge = null }) => {
  const { setCurrentView, trackInteraction } = useSessionStore();

  const handleClick = () => {
    setCurrentView(viewId);
    trackInteraction('navigation', { 
      target_view: viewId,
      previous_view: useSessionStore.getState().sessionData.currentView
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-all ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-lg mr-3">{icon}</span>
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
};

// Session Health Monitor Component (optional admin view)
const SessionHealthMonitor = () => {
  const sessionHealth = useSessionStore(state => state.getSessionHealth());
  const { sessionError, connectionStatus, sessionData, sessionMetadata } = useSessionStore();

  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Session Health Monitor</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900">Connection Status</h4>
          <div className={`inline-flex items-center px-2 py-1 rounded text-sm ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'offline' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {connectionStatus === 'online' && '✅ Online'}
            {connectionStatus === 'offline' && '📡 Offline'}
            {connectionStatus === 'error' && '❌ Error'}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">Session Activity</h4>
          <p className="text-sm text-gray-600">
            Last active: {sessionHealth.lastActivity}
          </p>
          {sessionHealth.timeoutWarning && (
            <p className="text-sm text-yellow-600">
              ⚠️ Timeout warning: {Math.floor(sessionHealth.minutesUntilTimeout)} min remaining
            </p>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">Session Data</h4>
          <ul className="text-sm text-gray-600">
            <li>Interactions: {sessionData.interactions.length}</li>
            <li>Workflows: {sessionData.workflowsCreated}</li>
            <li>Executions: {sessionData.workflowsExecuted}</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">Device Info</h4>
          <ul className="text-sm text-gray-600">
            <li>Screen: {sessionMetadata.screenSize}</li>
            <li>Online: {sessionMetadata.onlineStatus ? 'Yes' : 'No'}</li>
            <li>Timezone: {sessionMetadata.timezone}</li>
          </ul>
        </div>
      </div>
      
      {sessionError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="font-medium text-red-900">Latest Error</h4>
          <p className="text-sm text-red-600">{sessionError.message}</p>
          <p className="text-xs text-red-500">Context: {sessionError.context}</p>
          <p className="text-xs text-red-500">Time: {sessionError.timestamp}</p>
        </div>
      )}
    </div>
  );
};

// Hook for using session data in components
const useSession = () => {
  const sessionStore = useSessionStore();
  return {
    ...sessionStore,
    health: sessionStore.getSessionHealth(),
    isHealthy: sessionStore.connectionStatus === 'online' && !sessionStore.sessionError,
    shareUrl: sessionStore.getShareableUrl()
  };
};

// Export all components and utilities
export {
  useSessionStore,
  useSession,
  SessionInitializer,
  SessionStatusBar,
  WelcomeScreen,
  SessionInfo,
  TrackedButton,
  TrackedNavItem,
  SessionHealthMonitor,
  getSessionIdFromUrl,
  setSessionIdInUrl,
  removeSessionIdFromUrl
};