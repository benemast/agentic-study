// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useLocation } from 'react-router-dom';

// Study Components (for dev routing)
import WelcomeScreen from './components/study/WelcomeScreen';
import DemographicsQuestionnaire from './components/study/DemographicsQuestionnaire';
import TaskScreen from './components/study/TaskScreen';
import SurveyQuestionnaire from './components/study/SurveyQuestionnaire';
import CompletionScreen from './components/study/CompletionScreen';

// Main Components
import WorkflowBuilder from './components/workflow/WorkflowBuilder';
import AIChat from './components/assistant/AIChat';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';
import { NotificationPermission } from './components/NotificationPermission';

// Hooks
import { useSession } from './hooks/useSession';
import { useTracking } from './hooks/useTracking';
import { useSessionData } from './hooks/useSessionData';
import { useTranslation } from './hooks/useTranslation';

// ============================================================
// ERROR BOUNDARY
// ============================================================
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

// ============================================================
// NAVIGATION ITEM COMPONENT
// ============================================================
const NavItem = ({ icon, label, isActive, onClick, badge = null }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-all ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg' 
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    <span className="text-xl mr-3">{icon}</span>
    {label && <span className="font-medium">{label}</span>}
    {badge && (
      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
const Sidebar = ({ activeView, onViewChange, isCollapsed, onToggleCollapse }) => {
  const { t } = useTranslation();
  
  const navItems = [
    { id: 'dashboard', icon: '📊', labelKey: 'admin.sidebar.dashboard' },
    { id: 'builder', icon: '🔧', labelKey: 'admin.sidebar.builder' },
    { id: 'aichat', icon: '🤖', labelKey: 'admin.sidebar.aiChat' },
    { id: 'templates', icon: '📋', labelKey: 'admin.sidebar.templates' },
    { id: 'executions', icon: '▶️', labelKey: 'admin.sidebar.executions' },
    { id: 'analytics', icon: '📈', labelKey: 'admin.sidebar.analytics' },
    { id: 'tutorials', icon: '📚', labelKey: 'admin.sidebar.tutorials' },
    { id: 'settings', icon: '⚙️', labelKey: 'admin.sidebar.settings' },
  ];

  const handleNavClick = (viewId) => {
    onViewChange(viewId);
  };

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-gray-900">
            Admin Panel
          </h1>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-lg">{isCollapsed ? '→' : '←'}</span>
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={isCollapsed ? '' : t(item.labelKey)}
            isActive={activeView === item.id}
            onClick={() => handleNavClick(item.id)}
          />
        ))}
      </nav>

      {/* Language Switcher */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2"> 
            <LanguageSwitcher 
              variant="compact" 
              className="bg-white shadow-lg"
            />
            <ThemeSwitcher 
              variant="icon-only"
              className="bg-white shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// DASHBOARD COMPONENT
// ============================================================
const Dashboard = () => {
  const { sessionId, participantId, isHealthy } = useSession();
  const { workflowsCreated, workflowsExecuted, interactions, currentView } = useSessionData();
  
  // Calculate total interactions (interactions is an array or object)
  const totalInteractions = Array.isArray(interactions) 
    ? interactions.length 
    : (typeof interactions === 'number' ? interactions : 0);
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h2>
      
      {/* Session Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Session Information</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
          <div>Session ID: <span className="font-mono">{sessionId || 'Loading...'}</span></div>
          <div>Participant: #{participantId || 'N/A'}</div>
          <div>Status: <span className={isHealthy ? 'text-green-600' : 'text-red-600'}>
            {isHealthy ? '✓ Active' : '✗ Inactive'}
          </span></div>
          <div>View: {currentView || 'dashboard'}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Start</h3>
          <p className="text-gray-600 text-sm mb-4">
            Choose an option to get started:
          </p>
          <div className="space-y-2">
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🔧</span>
                <div>
                  <div className="font-medium text-gray-900">Build a Workflow</div>
                  <div className="text-sm text-gray-600">Create workflows using visual components</div>
                </div>
              </div>
            </button>
            
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🤖</span>
                <div>
                  <div className="font-medium text-gray-900">Chat with AI Assistant</div>
                  <div className="text-sm text-gray-600">Get help from an AI-powered assistant</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Activity</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Workflows Created</div>
              <div className="text-2xl font-bold text-gray-900">{workflowsCreated || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Workflows Executed</div>
              <div className="text-2xl font-bold text-gray-900">{workflowsExecuted || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Interactions</div>
              <div className="text-2xl font-bold text-gray-900">{totalInteractions}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP CONTENT COMPONENT
// ============================================================
const AppContent = () => {
  const location = useLocation();
  const [devView, setDevView] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { sessionId, isActive } = useSession();
  const { trackViewChange } = useTracking();

  // ============================================================
  // DEV ROUTE DETECTION (Only in development)
  // ============================================================
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    
    if (view) {
      setDevView(view);
    } else {
      setDevView(null);
    }
  }, [location]);

  // ============================================================
  // DEV VIEW RENDERER
  // ============================================================
  const renderDevView = () => {
    const params = new URLSearchParams(location.search);
    
    // Mock data for components
    const mockStudyConfig = {
      group: 'A',
      task1: { 
        condition: 'workflow_builder',
        product: 'headphones',
        productCategory: 'headphones'
      },
      task2: { 
        condition: 'ai_assistant',
        product: 'shoes',
        productCategory: 'shoes'
      }
    };

    const mockTaskConfig = {
      condition: params.get('condition') || 'workflow_builder',
      product: params.get('product') || 'headphones',
      productCategory: params.get('product') || 'headphones'
    };

    switch (devView) {
      case 'welcome':
        return (
          <WelcomeScreen 
            onContinue={() => console.log('Welcome completed')}
          />
        );

      case 'demographics':
        return (
          <DemographicsQuestionnaire 
            onComplete={(data) => console.log('Demographics completed:', data)}
          />
        );

      case 'task':
        return (
          <ReactFlowProvider>
            <TaskScreen
              taskConfig={mockTaskConfig}
              taskNumber={parseInt(params.get('taskNumber')) || 1}
              onComplete={() => console.log('Task completed')}
            />
          </ReactFlowProvider>
        );

      case 'survey':
        return (
          <SurveyQuestionnaire
            taskNumber={parseInt(params.get('taskNumber')) || 1}
            condition={params.get('condition') || 'workflow_builder'}
            onComplete={(data) => console.log('Survey completed:', data)}
          />
        );

      case 'completion':
        return (
          <CompletionScreen studyConfig={mockStudyConfig} />
        );

      case 'builder':
        return (
          <ReactFlowProvider>
            <div className="h-screen">
              <WorkflowBuilder />
            </div>
          </ReactFlowProvider>
        );

      case 'chat':
        return (
          <div className="h-screen">
            <AIChat />
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================================
  // DEV VIEW ACTIVE - Render only the dev view
  // ============================================================
  if (import.meta.env.DEV && devView) {
    return (
      <div id="admin" className="dev-view">
        {/* Dev toolbar */}
        <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-black px-4 py-2 z-50 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <span className="font-bold">🔧 DEV MODE:</span>
            <span className="font-mono">{devView}</span>
            {location.search && (
              <span className="text-sm opacity-75">
                {location.search}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="px-3 py-1 bg-black text-yellow-400 rounded hover:bg-gray-800 transition-colors"
            >
              Exit Preview
            </a>
          </div>
        </div>
        
        {/* Render the dev view */}
        <div className="pt-10">
          {renderDevView()}
        </div>
      </div>
    );
  }

  // ============================================================
  // NORMAL ADMIN VIEW
  // ============================================================

  // Handle view changes
  const handleViewChange = (view) => {
    setActiveView(view);
    trackViewChange(view);
  };

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'builder':
        return (
          <ReactFlowProvider>
            <WorkflowBuilder />
          </ReactFlowProvider>
        );
      
      case 'aichat':
        return <AIChat />;
      
      case 'templates':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Templates</h2>
            <p className="text-gray-600">Browse and use workflow templates...</p>
          </div>
        );
      
      case 'executions':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Executions</h2>
            <p className="text-gray-600">View workflow execution history...</p>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Analytics</h2>
            <p className="text-gray-600">View usage statistics and insights...</p>
          </div>
        );
      
      case 'tutorials':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tutorials</h2>
            <p className="text-gray-600">Learn how to use the platform...</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Configure your preferences...</p>
          </div>
        );
      
      default:
        return <Dashboard />;
    }
  };

  // Loading state
  if (!sessionId || !isActive) {
    return (
      <div id="admin" className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="admin" className="flex h-screen bg-gray-50">
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>

      <NotificationPermission showBanner={true} />
    </div>
  );
};

// ============================================================
// ROOT APP COMPONENT
// ============================================================
function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;