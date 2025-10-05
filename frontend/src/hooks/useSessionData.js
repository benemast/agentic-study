// frontend/src/hooks/useSessionData.js
/**
 * Hook for accessing and updating session data
 * Workflow state, view state, etc.
 */
import { useSessionStore } from '../store/sessionStore';

// Default session data structure
const DEFAULT_SESSION_DATA = {
  workflowsCreated: 0,
  workflowsExecuted: 0,
  totalTimeSpent: 0,
  currentView: 'dashboard',
  currentWorkflow: { nodes: [], edges: [] },
  interactions: []
};

export const useSessionData = () => {
  const sessionData = useSessionStore(state => state.sessionData) || DEFAULT_SESSION_DATA;
  const updateWorkflow = useSessionStore(state => state.updateWorkflow);
  const setCurrentView = useSessionStore(state => state.setCurrentView);
  
  return {
    // Current state - with safe defaults
    currentView: sessionData?.currentView || 'dashboard',
    currentWorkflow: sessionData?.currentWorkflow || { nodes: [], edges: [] },
    workflowsCreated: sessionData?.workflowsCreated || 0,
    workflowsExecuted: sessionData?.workflowsExecuted || 0,
    totalTimeSpent: sessionData?.totalTimeSpent || 0,
    interactions: sessionData?.interactions || [],
    
    // Update methods
    updateWorkflow,
    setCurrentView,
    
    // Computed values - with safe access
    hasWorkflow: (sessionData?.currentWorkflow?.nodes?.length || 0) > 0,
    interactionCount: (sessionData?.interactions?.length || 0),
  };
};

export default useSessionData;