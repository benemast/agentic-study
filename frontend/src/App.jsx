// frontend/src/App.jsx - Corrected version
import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';

import { 
  useSessionStore,
  SessionInitializer,
  WelcomeScreen,
  SessionInfo,
  TrackedButton,
  getSessionIdFromUrl,
} from './components/SessionManager';

import DemographicsQuestionnaire from './components/DemographicsQuestionnaire';
import WorkflowBuilder from './components/WorkflowBuilder';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from './hooks/useTranslation';
import * as demographicsUtils from './utils/demographicsSync';

// Import demographics utilities with error handling
let checkDemographicsStatus, initializeDemographicsSync;
let isCheckingDemographics = false;

try {
  checkDemographicsStatus = demographicsUtils.checkDemographicsStatus;
  initializeDemographicsSync = demographicsUtils.initializeDemographicsSync;
} catch (error) {
  console.warn('Demographics utilities not available:', error);
  // Provide fallback functions
  checkDemographicsStatus = async () => ({ completed: false });
  initializeDemographicsSync = async () => ({ completed: false });
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                The application encountered an error. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Navigation Components
const NavItem = ({ icon, label, isActive, onClick, badge = null }) => (
  <button
    onClick={onClick}
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

const Sidebar = ({ activeView, onViewChange, isCollapsed, onToggleCollapse }) => {
  const setCurrentView = useSessionStore(state => state.setCurrentView);
  
  // Safe translation hook usage
  let t;
  try {
    const translation = useTranslation();
    t = translation.t;
  } catch (error) {
    console.warn('Translation hook not available, using fallback');
    t = (key) => {
      // Fallback translation mapping
      const fallbacks = {
        'workflow.sidebar.dashboard': 'Dashboard',
        'workflow.sidebar.builder': 'Workflow Builder',
        'workflow.sidebar.templates': 'Templates',
        'workflow.sidebar.executions': 'Executions',
        'workflow.sidebar.analytics': 'Analytics',
        'workflow.sidebar.tutorials': 'Tutorials',
        'workflow.sidebar.settings': 'Settings'
      };
      return fallbacks[key] || key;
    };
  }
  
  const navItems = [
    { id: 'dashboard', icon: '📊', labelKey: 'workflow.sidebar.dashboard' },
    { id: 'builder', icon: '🔧', labelKey: 'workflow.sidebar.builder' },
    { id: 'templates', icon: '📋', labelKey: 'workflow.sidebar.templates' },
    { id: 'executions', icon: '⚡', labelKey: 'workflow.sidebar.executions', badge: '3' },
    { id: 'analytics', icon: '📈', labelKey: 'workflow.sidebar.analytics' },
    { id: 'tutorials', icon: '🎓', labelKey: 'workflow.sidebar.tutorials' },
    { id: 'settings', icon: '⚙️', labelKey: 'workflow.sidebar.settings' },
  ];

  const handleNavClick = (viewId) => {
    onViewChange(viewId);
    setCurrentView(viewId);
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-full transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agentic Study</h1>
            <p className="text-sm text-gray-500">Research Platform</p>
          </div>
        )}
        <TrackedButton
          eventType="sidebar_toggle"
          eventData={{ collapsed: !isCollapsed }}
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-lg">{isCollapsed ? '→' : '←'}</span>
        </TrackedButton>
      </div>

      {/* Language Switcher - only show when not collapsed */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <LanguageSwitcher 
            variant="compact" 
            className="w-full justify-center"
            showLabels={false}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map(item => (
          <div key={item.id} className="relative group">
            <NavItem
              icon={item.icon}
              label={isCollapsed ? '' : t(item.labelKey)}
              isActive={activeView === item.id}
              onClick={() => handleNavClick(item.id)}
              badge={!isCollapsed ? item.badge : null}
            />
            {isCollapsed && (
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {t(item.labelKey)}
                {item.badge && <span className="ml-1 bg-red-500 px-1 rounded">{item.badge}</span>}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Session Info */}
      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <SessionInfo isCollapsed={false} />
        </div>
      )}
    </div>
  );
};

// Main Content Components
const DashboardView = () => {
  const { sessionData } = useSessionStore();
  
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Workflows Created</p>
              <p className="text-2xl font-bold text-gray-900">{sessionData?.workflowsCreated || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Executions</p>
              <p className="text-2xl font-bold text-gray-900">{sessionData?.workflowsExecuted || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Interactions</p>
              <p className="text-2xl font-bold text-gray-900">{sessionData?.interactions?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current View</p>
              <p className="text-lg font-bold text-gray-900 capitalize">{sessionData?.currentView || 'dashboard'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics Summary */}
      {sessionData?.demographics && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Participant Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Experience Level:</span>
              <p className="font-medium capitalize">{sessionData.demographics.programming_experience?.replace('-', ' ') || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-600">AI/ML Background:</span>
              <p className="font-medium capitalize">{sessionData.demographics.ai_ml_experience?.replace('-', ' ') || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-600">Education:</span>
              <p className="font-medium capitalize">{sessionData.demographics.education?.replace('-', ' ') || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-600">Time Available:</span>
              <p className="font-medium">{sessionData.demographics.time_availability || 'Not specified'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {sessionData?.interactions?.slice(-5).reverse().map((interaction, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600">📝</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {interaction.event_type?.replace(/_/g, ' ') || 'Unknown event'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {interaction.timestamp ? new Date(interaction.timestamp).toLocaleTimeString() : 'Unknown time'}
                  </p>
                </div>
              </div>
            )) || []}
            {(!sessionData?.interactions || sessionData.interactions.length === 0) && (
              <p className="text-gray-500 text-center py-4">No activity yet. Start exploring!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaceholderView = ({ viewName }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {viewName} Coming Soon
      </h3>
      <p className="text-gray-600 max-w-md">
        This section is under development. We're building an amazing experience for 
        managing your agentic workflows.
      </p>
    </div>
  </div>
);

// Main App Component
const App = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [appState, setAppState] = useState('initializing');

  const sessionData = useSessionStore(state => state.sessionData) || {};
  const sessionId = useSessionStore(state => state.sessionId);
  const sessionSource = useSessionStore(state => state.sessionSource);
  const trackInteraction = useSessionStore(state => state.trackInteraction) || (() => {});

  // Initialize demographics on app start
  useEffect(() => {
    const initDemographics = async () => {
      console.debug("Initializing Demographics on app start")
      try {

        if(isCheckingDemographics) {
        console.log('Demographics status check already in progress, skipping duplicate call.');
          return;
        }
        isCheckingDemographics = true;

        if (initializeDemographicsSync) {
          await initializeDemographicsSync();
        }
      } catch (error) {
        console.error('Failed to initialize demographics sync:', error);
      } finally {
        isCheckingDemographics = false;
      }
    };
    
    initDemographics();
  }, []);

  // Determine what to show based on session state
  useEffect(() => {
    const determineAppState = async () => {
      const urlSessionId = getSessionIdFromUrl();
      
      // If there's a session ID in URL, this is a returning user
      if (urlSessionId && sessionId === urlSessionId) {
        console.log('Returning user detected via URL session');
        
        try {
          console.debug("Starting Demographics check!")
          if (checkDemographicsStatus) {
            const demographicsStatus = await checkDemographicsStatus();
            
            if (demographicsStatus.completed) {
              setAppState('main');
              trackInteraction('returning_user_continued', { 
                session_source: 'url',
                demographics_source: demographicsStatus.source 
              });
            } else {
              setAppState('demographics');
              trackInteraction('returning_user_missing_demographics', { session_id: urlSessionId });
            }
          } else {
            setAppState('main');
          }
        } catch (error) {
          console.error('Error checking demographics status:', error);
          setAppState('main');
        }
        return;
      }
      
      // Check if this is truly a first-time participant
      const isFirstTime = !sessionData.demographicsCompleted && 
                         sessionSource !== 'url' && 
                         !localStorage.getItem('agentic-study-completed-demographics');
      
      if (isFirstTime) {
        console.log('First-time participant detected');
        setAppState('demographics');
        trackInteraction('first_time_participant_detected', { session_source: sessionSource });
        return;
      }
      
      // If demographics are completed, check if they've seen welcome
      if (sessionData.demographicsCompleted) {
        const hasSeenWelcome = localStorage.getItem('agentic-study-welcomed');
        if (hasSeenWelcome) {
          setAppState('main');
        } else {
          setAppState('welcome');
        }
        return;
      }
      
      // Fallback
      setAppState('main');
    };
    
    // Only run this logic when we have a session ID
    if (sessionId) {
      determineAppState();
    }
  }, [sessionData.demographicsCompleted, sessionId, sessionSource, trackInteraction]);

  const handleDemographicsComplete = (demographicsData) => {
    localStorage.setItem('agentic-study-completed-demographics', 'true');
    
    trackInteraction('demographics_flow_completed', {
      is_first_time: !getSessionIdFromUrl(),
      demographics_summary: {
        age: demographicsData.age,
        education: demographicsData.education,
        field_of_study: demographicsData.field_of_study,
        programming_experience: demographicsData.programming_experience,
        ai_ml_experience: demographicsData.ai_ml_experience
      }
    });

    const hasSeenWelcome = localStorage.getItem('agentic-study-welcomed');
    if (hasSeenWelcome && getSessionIdFromUrl()) {
      setAppState('main');
    } else {
      setAppState('welcome');
    }
  };

  const handleWelcomeContinue = () => {
    localStorage.setItem('agentic-study-welcomed', 'true');
    trackInteraction('welcome_completed');
    setAppState('main');
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'builder':
        return (
          <ReactFlowProvider>
            <WorkflowBuilder />
          </ReactFlowProvider>
        );
      case 'templates':
        return <PlaceholderView viewName="Templates" />;
      case 'executions':
        return <PlaceholderView viewName="Executions" />;
      case 'analytics':
        return <PlaceholderView viewName="Analytics" />;
      case 'tutorials':
        return <PlaceholderView viewName="Tutorials" />;
      case 'settings':
        return <PlaceholderView viewName="Settings" />;
      default:
        return <DashboardView />;
    }
  };

  // Show different screens based on app state
  if (appState === 'initializing') {
    return (
      <SessionInitializer>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Initializing Study Session
              </h2>
              <p className="text-gray-600">
                Setting up your research session...
              </p>
            </div>
          </div>
        </div>
      </SessionInitializer>
    );
  }

  if (appState === 'demographics') {
    return (
      <SessionInitializer>
        <DemographicsQuestionnaire onComplete={handleDemographicsComplete} />
      </SessionInitializer>
    );
  }

  if (appState === 'welcome') {
    return (
      <SessionInitializer>
        <WelcomeScreen onContinue={handleWelcomeContinue} />
      </SessionInitializer>
    );
  }

  // Main app layout
  return (
    <ErrorBoundary>
      <SessionInitializer>
        <div className="h-screen bg-gray-50 flex">
          <Sidebar
            activeView={activeView}
            onViewChange={setActiveView}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto bg-gray-50">
              {renderMainContent()}
            </main>
          </div>
        </div>
      </SessionInitializer>
    </ErrorBoundary>
  );
};

export default App;