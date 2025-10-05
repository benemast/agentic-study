// frontend/src/hooks/useWorkflowState.js
import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';

export const useWorkflowState = () => {
  const sessionStore = useSessionStore();
  
  const getWorkflowFromSession = useCallback(() => {
    return sessionStore?.sessionData?.currentWorkflow || { nodes: [], edges: [] };
  }, [sessionStore?.sessionData?.currentWorkflow]);

  const saveWorkflowToSession = useCallback((nodes, edges) => {
    if (!sessionStore) return;
    
    useSessionStore.setState(state => ({
      sessionData: {
        ...state.sessionData,
        currentWorkflow: { nodes, edges }
      }
    }));
  }, [sessionStore]);

  return {
    getWorkflowFromSession,
    saveWorkflowToSession,
    trackInteraction: sessionStore?.trackInteraction || (() => {}),
    incrementWorkflowsCreated: sessionStore?.incrementWorkflowsCreated || (() => {})
  };
};