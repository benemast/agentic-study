// frontend/src/hooks/useSessionData.js
/**
 * Hook for session data (workflows, views, metrics, and study config)
 */
import { use } from 'react';
import { useSessionStore } from '../store/sessionStore';

// Default session data structure
const DEFAULT_SESSION_DATA = {
  workflowsCreated: 0,
  workflowsExecuted: 0,
  totalTimeSpent: 0,
  currentView: 'dashboard',
  currentWorkflow: { nodes: [], edges: [] },
  interactions: [],
  
  // Study data
  studyConfig: null,
  currentStep: 'welcome',
  studyStartedAt: null,
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
  
  // ========================================
  // SESSION LIFECYCLE
  // ========================================
  /*
    setAppVisible: (isVisible) => {            
    },
    setAppOnline: (isOnline) => {      
    },  
    getAppLifecycle: () => {
      appLifecycle: {
        isVisible: true,
        isOnline: true,
        lastVisibilityChange: Date.now(),
        lastOnlineChange: Date.now(),
      }
    }
  */ 
  const setAppVisible = useSessionStore(state => state.setAppVisible);
  const setAppOnline = useSessionStore(state => state.setAppOnline);
  const getAppLifecycle = useSessionStore(state => state.getAppLifecycle);

  // ============================================================
  // TRACKING METHODS
  // ============================================================
  const trackInteraction = useSessionStore(state => state.trackInteraction);
  
  // ============================================================
  // STUDY CONFIG METHODS
  // ============================================================
  const initializeStudyConfig = useSessionStore(state => state.initializeStudyConfig);
  const getStudyConfig = useSessionStore(state => state.getStudyConfig);
  const setStudyStep = useSessionStore(state => state.setStudyStep);
  const getStudyStep = useSessionStore(state => state.getStudyStep);
  const completeWelcome = useSessionStore(state => state.completeWelcome);
  const completeScenarioBrief = useSessionStore(state => state.completeScenarioBrief);
  const completeTask1 = useSessionStore(state => state.completeTask1);
  const completeSurvey1 = useSessionStore(state => state.completeSurvey1);
  const completeTask2 = useSessionStore(state => state.completeTask2);
  const completeSurvey2 = useSessionStore(state => state.completeSurvey2);
  const completeStudy = useSessionStore(state => state.completeStudy);
  const getStudyProgress = useSessionStore(state => state.getStudyProgress);
  
  // ========================================
  // DEMOGRAPHICS STATE (Add to return object)
  // ========================================

  // Demographics data
  const demographicsData = useSessionStore(state => state.demographicsData);
  const demographicsStep = useSessionStore(state => state.demographicsStep);
  const demographicsError = useSessionStore(state => state.demographicsError);
  const demographicsCompleted = useSessionStore(state => state.demographicsCompleted);
  const demographicsCompletedAt = useSessionStore(state => state.demographicsCompletedAt);

  // Demographics actions
  const setDemographicsField = useSessionStore(state => state.setDemographicsField);
  const setDemographicsFields = useSessionStore(state => state.setDemographicsFields);
  const setDemographicsStep = useSessionStore(state => state.setDemographicsStep);
  const setDemographicsError = useSessionStore(state => state.setDemographicsError);
  const clearDemographicsError = useSessionStore(state => state.clearDemographicsError);
  const resetDemographics = useSessionStore(state => state.resetDemographics);
  const completeDemographics = useSessionStore(state => state.completeDemographics);


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
    
    // Session ifecycle
    setAppVisible,
    setAppOnline,
    getAppLifecycle,

    // Tracking
    trackInteraction,
    
    // Computed values
    hasWorkflow: (sessionData?.currentWorkflow?.nodes?.length || 0) > 0,
    interactionCount: (sessionData?.interactions?.length || 0),
    
    // ============================================================
    // STUDY CONFIG
    // ============================================================
    studyConfig: sessionData?.studyConfig || null,
    currentStep: sessionData?.currentStep || 'welcome',
    
    // Study methods
    initializeStudyConfig,
    getStudyConfig,
    setStudyStep,
    getStudyStep,
    completeWelcome,
    completeTask1,
    completeSurvey1,
    completeTask2,
    completeSurvey2,
    completeStudy,
    getStudyProgress,

    // Demographics
    demographicsData,
    demographicsStep,
    demographicsError,
    demographicsCompleted,
    demographicsCompletedAt,
    setDemographicsField,
    setDemographicsFields,
    setDemographicsStep,
    setDemographicsError,
    clearDemographicsError,
    resetDemographics,
    completeDemographics,
    completeScenarioBrief,

    // Study computed values
    isStudyInitialized: !!sessionData?.studyConfig,
    demographicsCompleted: sessionData?.demographicsComplete || false,
    task1Completed: !!sessionData?.task1CompletedAt,
    task2Completed: !!sessionData?.task2CompletedAt,
    studyCompleted: !!sessionData?.studyCompletedAt,
  };
};

export default useSessionData;