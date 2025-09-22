import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';

import { useSessionStore,
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
} from './components/SessionManager';

import WorkflowBuilder from './components/WorkflowBuilder';


// Navigation Components (keeping your existing design)
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
  
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'builder', icon: '🔧', label: 'Workflow Builder' },
    { id: 'templates', icon: '📋', label: 'Templates' },
    { id: 'executions', icon: '⚡', label: 'Executions', badge: '3' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'tutorials', icon: '🎓', label: 'Tutorials' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const handleNavClick = (viewId) => {
    onViewChange(viewId);
    setCurrentView(viewId); // This tracks the view change
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

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map(item => (
          <div key={item.id} className="relative">
            <NavItem
              icon={item.icon}
              label={isCollapsed ? '' : item.label}
              isActive={activeView === item.id}
              onClick={() => handleNavClick(item.id)}
              badge={!isCollapsed ? item.badge : null}
            />
            {isCollapsed && (
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
                {item.badge && <span className="ml-1 bg-red-500 px-1 rounded">{item.badge}</span>}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Session Info (replacing User Section) */}
      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <SessionInfo isCollapsed={false} />
        </div>
      )}
    </div>
  );
};

const TopBar = ({ activeView, onSave, onHelp }) => {
  const trackInteraction = useSessionStore(state => state.trackInteraction);
  
  const viewTitles = {
    dashboard: 'Dashboard Overview',
    builder: 'Workflow Builder',
    templates: 'Workflow Templates',
    executions: 'Execution History',
    analytics: 'Analytics Dashboard',
    tutorials: 'Interactive Tutorials',
    settings: 'Platform Settings',
  };

  const handleSave = () => {
    trackInteraction('workflow_save_attempt');
    onSave();
  };

  const handleHelp = () => {
    trackInteraction('help_requested', { current_view: activeView });
    onHelp();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {viewTitles[activeView] || 'Agentic Study'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Build and test agentic AI workflows for research purposes
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">System Online</span>
          </div>
          
          {/* Action Buttons with Tracking */}
          <TrackedButton
            eventType="help_button_click"
            onClick={handleHelp}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Help & Documentation"
          >
            <span className="text-lg">❓</span>
          </TrackedButton>
          
          {activeView === 'builder' && (
            <TrackedButton
              eventType="save_workflow_click"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Workflow
            </TrackedButton>
          )}
          
          <TrackedButton
            eventType="export_data_click"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Export Data
          </TrackedButton>
        </div>
      </div>
    </div>
  );
};

// Main Content Components (keeping your existing ones)
const DashboardView = () => {
  const { sessionData, incrementWorkflowsCreated } = useSessionStore();
  
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stats Cards - now using real session data */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Workflows Created</p>
              <p className="text-2xl font-bold text-gray-900">{sessionData.workflowsCreated}</p>
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
              <p className="text-2xl font-bold text-gray-900">{sessionData.workflowsExecuted}</p>
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
              <p className="text-2xl font-bold text-gray-900">{sessionData.interactions.length}</p>
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
              <p className="text-lg font-bold text-gray-900 capitalize">{sessionData.currentView}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - now shows real interactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {sessionData.interactions.slice(-5).reverse().map((interaction, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600">📝</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {interaction.event_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(interaction.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {sessionData.interactions.length === 0 && (
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

// Main App Component - Enhanced with Session Management
const App = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if user should see welcome screen
  React.useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('agentic-study-welcomed');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeContinue = () => {
    localStorage.setItem('agentic-study-welcomed', 'true');
    setShowWelcome(false);
  };

  const handleSave = () => {
    console.log('Saving workflow...');
    alert('Workflow saved successfully!');
  };

  const handleHelp = () => {
    console.log('Opening help...');
    alert('Help documentation will open here');
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

  // Show welcome screen for new users
  if (showWelcome) {
    return (
      <SessionInitializer>
        <WelcomeScreen onContinue={handleWelcomeContinue} />
      </SessionInitializer>
    );
  }

  // Main app layout with session management
  return (
    <SessionInitializer>
      <div className="h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation Bar */}
          <TopBar 
            activeView={activeView}
            onSave={handleSave}
            onHelp={handleHelp}
          />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-gray-50">
            {renderMainContent()}
          </main>
        </div>
      </div>
    </SessionInitializer>
  );
};

export default App;