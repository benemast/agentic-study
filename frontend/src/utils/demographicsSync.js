// frontend/src/utils/demographicsSync.js
import { useSessionStore } from '../components/SessionManager';
import { getSessionIdFromUrl } from '../components/SessionManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
/**
 * Sync demographics data that might have been saved offline
 */
export const syncPendingDemographics = async () => {
  const sessionStore = useSessionStore.getState();
  const { sessionId, sessionData } = sessionStore;
  
  // Check if we have demographics data that failed to sync
  if (sessionData.demographics && sessionData.demographicsSubmissionError) {
    try {
      console.log('Attempting to sync pending demographics data...');
      
      const demographicsData = {
        session_id: sessionId,
        ...sessionData.demographics,
        raw_response: sessionData.demographics
      };
      
      const response = await fetch(`${API_BASE_URL}/demographics/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demographicsData)
      });

      if (response.ok) {
        // Clear the error since sync was successful
        useSessionStore.setState(state => ({
          sessionData: {
            ...state.sessionData,
            demographicsSubmissionError: null
          }
        }));
        
        console.log('Demographics data synced successfully');
        return { success: true };
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to sync demographics:', error);
      return { success: false, error: error.message };
    }
  }
  
  return { success: true, message: 'No pending demographics to sync' };
};

/**
 * Fetch existing demographics data for a session
 */
export const fetchDemographics = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/demographics/${sessionId}`);
    
    console.log('Fetch demographics response:', response);

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else if (response.status === 404) {
      return { success: false, data: null }; // No demographics found
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to fetch demographics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if demographics have been completed for the current session
 */
export const checkDemographicsStatus = async () => {
  try {
    const sessionStore = useSessionStore.getState();
    const { sessionId, sessionData } = sessionStore;

    const urlSessionId = getSessionIdFromUrl();

    if (urlSessionId && sessionId && urlSessionId !== sessionId){
      throw error 
      return 
    }
    
    console.log('Checking demographics status...');

    // First check local storage
    if (sessionData.demographicsCompleted ){ //&& sessionData.demogrpahicsCompletedFor === getSessionIdFromUrl) {
      // Try to sync any pending data
      await syncPendingDemographics();
      return { completed: true, source: 'local' };
    }
    
    // Check server if we have a session ID
    if (sessionId) {
      const result = await fetchDemographics(sessionId);
      
      if (result.success && result.data) {
        // Update local state with server data
        useSessionStore.setState(state => ({
          sessionData: {
            ...state.sessionData,
            demographics: {
              age: result.data.age,
              gender: result.data.gender,
              education: result.data.education,
              field_of_study: result.data.field_of_study,
              occupation: result.data.occupation,
              programming_experience: result.data.programming_experience,
              ai_ml_experience: result.data.ai_ml_experience,
              workflow_tools_used: result.data.workflow_tools_used,
              technical_role: result.data.technical_role,
              participation_motivation: result.data.participation_motivation,
              expectations: result.data.expectations,
              time_availability: result.data.time_availability,
              country: result.data.country,
              first_language: result.data.first_language,
              comments: result.data.comments
            },
            demographicsCompleted: true,
            demographicsCompletedFor: sessionId,
            demographicsCompletedAt: result.data.completed_at
          }
        }));
        
        return { completed: true, source: 'server' };
      }
    }
    
    return { completed: false };
  } catch (error) {
    console.error('Failed to check demographics staus:', error);
    return { completed: false, error: error };
  }
};

/**
 * Check if this is truly a first-time participant
 */
export const isFirstTimeParticipant = () => {
  const sessionStore = useSessionStore.getState();
  const { sessionData, sessionSource } = sessionStore;
  
  // Check multiple indicators
  const hasCompletedDemographics = sessionData.demographicsCompleted;
  const hasGlobalCompletionFlag = localStorage.getItem('agentic-study-completed-demographics');
  const isFromUrl = sessionSource === 'url';
  const hasUrlSession = !!getSessionIdFromUrl();
  
  // It's a first-time participant if:
  // - They haven't completed demographics locally
  // - They don't have the global completion flag
  // - They're not coming from a URL (indicating return visit)
  return !hasCompletedDemographics && !hasGlobalCompletionFlag && !isFromUrl && !hasUrlSession;
};

/**
 * Initialize demographics sync on app start
 */
export const initializeDemographicsSync = async () => {
  // Check and sync demographics status
  const status = await checkDemographicsStatus();
  
  if (status.error){

    const response = await fetch(`${API_BASE_URL}/demographics/${sessionId}/validate`);

    if(!response.session_has_demographics && response.demographics_exist){
      const updateResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ has_demographics: true })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        console.error('Failed to update session:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${updateResponse.status}`);
      }
    }
  }
  else if (status.completed) {
    console.log(`Demographics loaded from ${status.source}`);
    // Set global flag to prevent re-showing questionnaire
    localStorage.setItem('agentic-study-completed-demographics', 'true');
  } else if (isFirstTimeParticipant()) {
    console.log('First-time participant identified - demographics will be shown');
  }
  
  return status;
};