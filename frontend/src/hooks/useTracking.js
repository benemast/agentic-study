// frontend/src/hooks/useTracking.js
/**
 * Hook for interaction tracking
 * Provides easy-to-use tracking methods
 */
import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import useWebSocketStore  from '../store/websocketStore';
import { TRACKING_EVENTS } from '../config/constants';

export const useTracking = () => {
  const trackInteraction = useSessionStore(state => state.trackInteraction);
  const setCurrentView = useSessionStore(state => state.setCurrentView);
  const incrementWorkflowsCreated = useSessionStore(state => state.incrementWorkflowsCreated);
  const incrementWorkflowsExecuted = useSessionStore(state => state.incrementWorkflowsExecuted);

  // WebSocket batching capabilities
  const wsTracking = useWebSocketStore(state => ({
    queueTrackingEvent: state.queueTrackingEvent,
    flushQueue: state.flushTrackingQueue,
    isConnected: state.connection.status === 'connected'
  }));
  // Generic event tracking
  const track = useCallback((eventType, eventData = {}) => {
    trackInteraction(eventType, eventData);
  }, [trackInteraction]);
  
  // Specific tracking methods
  const trackClick = useCallback((elementId, elementData = {}) => {
    track(TRACKING_EVENTS.NODE_ADDED, { elementId, ...elementData });
  }, [track]);
  
  const trackViewChange = useCallback((newView) => {
    setCurrentView(newView);
  }, [setCurrentView]);
  
  const trackNodeAdded = useCallback((nodeType, nodeData = {}) => {
    track(TRACKING_EVENTS.NODE_ADDED, { nodeType, ...nodeData });
  }, [track]);
  
  const trackNodeDeleted = useCallback((nodeId) => {
    track(TRACKING_EVENTS.NODE_DELETED, { nodeId });
  }, [track]);
  
  const trackNodeEdited = useCallback((nodeId, changes) => {
    track(TRACKING_EVENTS.NODE_EDITED, { nodeId, changes });
  }, [track]);
  
  const trackEdgeAdded = useCallback((source, target) => {
    track(TRACKING_EVENTS.EDGE_ADDED, { source, target });
  }, [track]);
  
  const trackEdgeDeleted = useCallback((edgeId) => {
    track(TRACKING_EVENTS.EDGE_DELETED, { edgeId });
  }, [track]);
  
  const trackWorkflowSaved = useCallback((workflowData = {}) => {
    incrementWorkflowsCreated();
    track(TRACKING_EVENTS.WORKFLOW_SAVED, workflowData);
  }, [incrementWorkflowsCreated, track]);
  
  const trackWorkflowExecuted = useCallback((executionData = {}) => {
    incrementWorkflowsExecuted();
    track(TRACKING_EVENTS.WORKFLOW_EXECUTED, executionData);
  }, [incrementWorkflowsExecuted, track]);

  const trackWorkflowCleared = useCallback((workflowData = {}) => {
    track(TRACKING_EVENTS.WORKFLOW_CLEARED, workflowData);
  }, [track]);
  
// CHAT TRACKING
  const trackMessageSent = useCallback((messageLength, messageData = {}) => {
    track(TRACKING_EVENTS.MESSAGE_SENT, { messageLength, ...messageData });
  }, [track]);
  
  const trackMessageReceived = useCallback((messageLength, messageData = {}) => {
    track(TRACKING_EVENTS.MESSAGE_RECEIVED, { messageLength, ...messageData });
  }, [track]);

  const trackMessagesCleared = useCallback((messageLength, messageData = {}) => {
    track(TRACKING_EVENTS.MESSAGES_CLEARED, { messageLength, ...messageData });
  }, [track]);
  
  
// ERROR TRACKING
  const trackError = useCallback((errorType, errorMessage, errorContext = {}) => {
    track(TRACKING_EVENTS.ERROR_OCCURRED, { 
      errorType, 
      errorMessage, 
      ...errorContext 
    });
  }, [track]);
  // Force flush for important events
  const trackImportant = useCallback((eventType, eventData = {}) => {
    track(eventType, eventData);
    
    // Force immediate flush if WebSocket is connected
    if (wsTracking.isConnected) {
      wsTracking.flushQueue();
    }
  }, [track, wsTracking]);
  
  return {
    // Generic
    track,
    trackClick,
    trackViewChange,
    
    // Workflow
    trackNodeAdded,
    trackNodeDeleted,
    trackNodeEdited,
    trackEdgeAdded,
    trackEdgeDeleted,
    trackWorkflowSaved,
    trackWorkflowExecuted,
    trackWorkflowCleared,
    
    // Chat
    trackMessageSent,
    trackMessageReceived,
    trackMessagesCleared,
    
    // Errors
    trackError,
    
    // High-priority tracking
    trackImportant,
  };
};

export default useTracking;