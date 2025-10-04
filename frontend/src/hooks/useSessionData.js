// frontend/src/hooks/useSessionData.js
/**
 * Hook for accessing and updating session data
 * Workflow state, view state, etc.
 */
import { useSessionStore } from '../store/sessionStore';

export const useSessionData = () => {
  const sessionData = useSessionStore(state => state.sessionData);
  const updateWorkflow = useSessionStore(state => state.updateWorkflow);
  const setCurrentView = useSessionStore(state => state.setCurrentView);
  
  return {
    // Current state
    currentView: sessionData.currentView,
    currentWorkflow: sessionData.currentWorkflow,
    workflowsCreated: sessionData.workflowsCreated,
    workflowsExecuted: sessionData.workflowsExecuted,
    totalTimeSpent: sessionData.totalTimeSpent,
    interactions: sessionData.interactions,
    
    // Update methods
    updateWorkflow,
    setCurrentView,
    
    // Computed values
    hasWorkflow: sessionData.currentWorkflow.nodes.length > 0,
    interactionCount: sessionData.interactions.length,
  };
};

export default useSessionData;



