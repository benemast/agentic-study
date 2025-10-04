// frontend/src/hooks/useWorkflowState.js
export const useWorkflowState = () => {
  const { currentWorkflow, updateWorkflow } = useSessionData();
  const trackInteraction = useSessionStore(state => state.trackInteraction);
  const incrementWorkflowsCreated = useSessionStore(state => state.incrementWorkflowsCreated);
  
  // Direct access to workflow data
  const { nodes, edges } = currentWorkflow;
  
  // Workflow-specific operations with built-in tracking
  const saveWorkflow = useCallback((nodes, edges) => {
    updateWorkflow(nodes, edges);
    trackInteraction('workflow_updated', { 
      nodeCount: nodes.length, 
      edgeCount: edges.length 
    });
  }, [updateWorkflow, trackInteraction]);
  
  const createWorkflow = useCallback(() => {
    incrementWorkflowsCreated();
    trackInteraction('workflow_created');
  }, [incrementWorkflowsCreated, trackInteraction]);
  
  return {
    nodes,
    edges,
    saveWorkflow,      // includes tracking
    createWorkflow,    // includes tracking
    trackInteraction,  // for custom events
  };
};