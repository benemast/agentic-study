// frontend/src/hooks/useSessionData.js
/**
 * Hook for session data (workflows, views, metrics)
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
  // ============================================================
  // SESSION DATA
  // ============================================================
  const sessionData = useSessionStore(state => state.sessionData) || DEFAULT_SESSION_DATA;
  
  // ============================================================
  // WORKFLOW METHODS
  // ============================================================
  const updateWorkflow = useSessionStore(state => state.updateWorkflow);
  const incrementWorkflowsCreated = useSessionStore(state => state.incrementWorkflowsCreated);
  const incrementWorkflowsExecuted = useSessionStore(state => state.incrementWorkflowsExecuted);
  
  // ============================================================
  // VIEW METHODS
  // ============================================================
  const setCurrentView = useSessionStore(state => state.setCurrentView);
  
  // ============================================================
  // TRACKING METHODS
  // ============================================================
  const trackInteraction = useSessionStore(state => state.trackInteraction);
  
  // ============================================================
  // RETURN INTERFACE
  // ============================================================
  
  return {
    // Session data
    sessionData,
    currentView: sessionData?.currentView || 'dashboard',
    currentWorkflow: sessionData?.currentWorkflow || { nodes: [], edges: [] },
    workflowsCreated: sessionData?.workflowsCreated || 0,
    workflowsExecuted: sessionData?.workflowsExecuted || 0,
    totalTimeSpent: sessionData?.totalTimeSpent || 0,
    interactions: sessionData?.interactions || [],
    
    // Workflow methods
    updateWorkflow,
    incrementWorkflowsCreated,
    incrementWorkflowsExecuted,
    
    // View methods
    setCurrentView,
    
    // Tracking
    trackInteraction,
    
    // Computed values
    hasWorkflow: (sessionData?.currentWorkflow?.nodes?.length || 0) > 0,
    interactionCount: (sessionData?.interactions?.length || 0),
  };
};

export default useSessionData;