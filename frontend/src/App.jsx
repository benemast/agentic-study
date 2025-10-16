// frontend/src/App.jsx - COMPLETE Refactored Version
import * as Sentry from "@sentry/react";

import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';

// Components
import SessionInitializer from './components/session/SessionInitializer';
import DemographicsQuestionnaire from './components/DemographicsQuestionnaire';
import WorkflowBuilder from './components/workflow/WorkflowBuilder';
import AIChat from './components/AIChat';
import LanguageSwitcher from './components/LanguageSwitcher';

// Hooks
import { useSession } from './hooks/useSession';
import { useTracking } from './hooks/useTracking';
import { useSessionData } from './hooks/useSessionData';
import { useTranslation } from './hooks/useTranslation';

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

// Navigation Item Component
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

// Sidebar Component
const Sidebar = ({ activeView, onViewChange, isCollapsed, onToggleCollapse }) => {
  const { trackViewChange } = useTracking();
  const { t } = useTranslation();
  
  const navItems = [
    { id: 'dashboard', icon: '📊', labelKey: 'workflow.sidebar.dashboard' },
    { id: 'builder', icon: '🔧', labelKey: 'workflow.sidebar.builder' },
    { id: 'aichat', icon: '🤖', labelKey: 'workflow.sidebar.aichat' },
    { id: 'templates', icon: '📋', labelKey: 'workflow.sidebar.templates' },
    { id: 'executions', icon: '⚡', labelKey: 'workflow.sidebar.executions', badge: '3' },
    { id: 'analytics', icon: '📈', labelKey: 'workflow.sidebar.analytics' },
    { id: 'tutorials', icon: '🎓', labelKey: 'workflow.sidebar.tutorials' },
    { id: 'settings', icon: '⚙️', labelKey: 'workflow.sidebar.settings' },
  ];

  const handleNavClick = (viewId) => {
    onViewChange(viewId);
    trackViewChange(viewId);
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-full transition-all duration-300 flex flex-col ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agentic Study</h1>
            <p className="text-xs text-gray-500">Research Platform</p>
          </div>
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
            badge={item.badge}
          />
        ))}
      </nav>

      {/* Language Switcher */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <LanguageSwitcher />
        </div>
      )}
    </div>
  );
};

// Connection Status Component
const ConnectionStatus = () => {
  const { isHealthy, connectionStatus, syncStatus } = useSession();
  
  if (!connectionStatus || connectionStatus === 'online') return null;
  
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm ${
      connectionStatus === 'offline' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {connectionStatus === 'offline' ? (
        <>⚠️ Working offline - Changes will sync when reconnected</>
      ) : (
        <>❌ Connection error - Please refresh the page</>
      )}
      {syncStatus === 'pending' && <span className="ml-2">(pending sync)</span>}
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { sessionId, participantId, isHealthy } = useSession();
  const { workflowsCreated, workflowsExecuted, interactions, currentView } = useSessionData();
  
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
            {isHealthy ? '✅ Healthy' : '⚠️ Issues'}
          </span></div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Workflows Created</p>
              <p className="text-2xl font-bold text-gray-900">{workflowsCreated || 0}</p>
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
              <p className="text-2xl font-bold text-gray-900">{workflowsExecuted || 0}</p>
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
              <p className="text-2xl font-bold text-gray-900">{interactions?.length || 0}</p>
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
              <p className="text-lg font-bold text-gray-900 capitalize">{currentView || 'dashboard'}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Start */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Start</h3>
        <p className="text-gray-600 mb-4">
          Welcome to the Agentic AI Study platform. Choose an option to get started:
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
    </div>
  );
};

// Main App Content Component
const AppContent = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDemographics, setShowDemographics] = useState(false);
  
  const { sessionId, isActive } = useSession();
  const { trackViewChange } = useTracking();

  // Handle view changes
  const handleViewChange = (view) => {
    setActiveView(view);
    trackViewChange(view);
  };

  // Render main content based on active view
  const renderContent = () => {
    if (showDemographics) {
      return (
        <DemographicsQuestionnaire
          onComplete={() => setShowDemographics(false)}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Workflow Templates</h2>
            <p className="text-gray-600">Browse and use pre-built workflow templates...</p>
          </div>
        );
      
      case 'executions':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Workflow Executions</h2>
            <p className="text-gray-600">View your workflow execution history...</p>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Analytics</h2>
            <p className="text-gray-600">View your usage analytics...</p>
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

  // Loading state while session initializes
  if (!sessionId || !isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Connection Status Bar */}
      <ConnectionStatus />
      
      {/* Main Layout */}
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </>
  );
};

// Root App Component with Error Boundary and Session Initializer
function App() {
  return (
    <ErrorBoundary>
      <SessionInitializer>
        <AppContent />
      </SessionInitializer>
    </ErrorBoundary>
  );
}

const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: ({ error, componentStack, resetError }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <h2 className="text-xl font-bold text-red-600 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          The application encountered an error. We've been notified and will fix it soon.
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  ),
  showDialog: false,
});

export default SentryApp;