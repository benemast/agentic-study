// frontend/src/hooks/useTutorial.js
/**
 * Tutorial Hook for React Joyride
 * 
 * Features:
 * - Auto-show logic (Task 1 = full, Task 2 = task only)
 * - Manual replay functionality
 * - State persistence in sessionStorage
 * - Analytics tracking integration
 * - Joyride callback handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTracking } from './useTracking';
import { getTutorialSteps, getScreenSteps, getTaskSteps } from '../config/tutorialContent';

const STORAGE_KEY = 'tutorial_state';

// ============================================================
// STORAGE HELPERS
// ============================================================

function getTutorialState() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      screenTutorialShown: false,
      task1TutorialShown: false,
      task2TutorialShown: false,
    };
  } catch (error) {
    console.error('Failed to load tutorial state:', error);
    return {
      screenTutorialShown: false,
      task1TutorialShown: false,
      task2TutorialShown: false,
    };
  }
}

function saveTutorialState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save tutorial state:', error);
  }
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useTutorial(taskNumber, condition) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const [tutorialType, setTutorialType] = useState(null);
  const { track } = useTracking();

  // Load state on mount
  const [tutorialState, setTutorialStateLocal] = useState(getTutorialState);

  // Track if auto-show has already been triggered
  const autoShowTriggeredRef = useRef(false);

  // Save state whenever it changes
  useEffect(() => {
    saveTutorialState(tutorialState);
  }, [tutorialState]);

  /**
   * Start a tutorial
   */
  const startTutorial = useCallback((type, customSteps = null) => {
    let tutorialSteps;
    
    if (customSteps) {
      tutorialSteps = customSteps;
    } else if (type === 'full') {
      tutorialSteps = getTutorialSteps(taskNumber, condition);
    } else if (type === 'screen') {
      tutorialSteps = getScreenSteps();
    } else if (type === 'task') {
      tutorialSteps = getTaskSteps(condition);
    } else {
      console.error('Invalid tutorial type:', type);
      return;
    }

    setSteps(tutorialSteps);
    setTutorialType(type);
    setRun(true);

    track('TUTORIAL_STARTED', {
      taskNumber,
      tutorialType: type,
      condition,
      stepCount: tutorialSteps.length
    });
  }, [taskNumber, condition, track]);

  /**
   * Handle Joyride callbacks
   */
  const handleJoyrideCallback = useCallback((data) => {
    const { action, index, status, type } = data;

    // Track step views
    if (type === 'step:after') {
      track('TUTORIAL_STEP_VIEWED', {
        taskNumber,
        tutorialType,
        condition,
        stepIndex: index,
        stepTarget: steps[index]?.target || 'unknown'
      });
    }

    // Handle completion/skip
    if (status === 'finished') {
      setRun(false);
      
      track('TUTORIAL_COMPLETED', {
        taskNumber,
        tutorialType,
        condition,
        stepsCompleted: steps.length
      });

      // Update state based on tutorial type
      if (tutorialType === 'full' || tutorialType === 'screen') {
        setTutorialStateLocal(prev => ({
          ...prev,
          screenTutorialShown: true
        }));
      }

      if (tutorialType === 'full' || tutorialType === 'task') {
        const key = taskNumber === 1 ? 'task1TutorialShown' : 'task2TutorialShown';
        setTutorialStateLocal(prev => ({
          ...prev,
          [key]: true
        }));
      }
    } else if (status === 'skipped') {
      setRun(false);
      
      track('TUTORIAL_SKIPPED', {
        taskNumber,
        tutorialType,
        condition,
        stepSkippedAt: index,
        stepsViewed: index + 1,
        totalSteps: steps.length
      });

      // Mark as shown even if skipped
      if (tutorialType === 'full' || tutorialType === 'screen') {
        setTutorialStateLocal(prev => ({
          ...prev,
          screenTutorialShown: true
        }));
      }

      if (tutorialType === 'full' || tutorialType === 'task') {
        const key = taskNumber === 1 ? 'task1TutorialShown' : 'task2TutorialShown';
        setTutorialStateLocal(prev => ({
          ...prev,
          [key]: true
        }));
      }
    }
  }, [taskNumber, condition, tutorialType, steps, track]);

  /**
   * Show screen tutorial manually
   */
  const showScreenTutorial = useCallback(() => {
    startTutorial('screen');
  }, [startTutorial]);

  /**
   * Show task tutorial manually
   */
  const showTaskTutorial = useCallback(() => {
    startTutorial('task');
  }, [startTutorial]);

  /**
   * Reset all tutorials (for testing)
   */
  const resetTutorials = useCallback(() => {
    const newState = {
      screenTutorialShown: false,
      task1TutorialShown: false,
      task2TutorialShown: false,
    };
    setTutorialStateLocal(newState);
    saveTutorialState(newState);
    autoShowTriggeredRef.current = false;
    
    track('TUTORIAL_RESET', { taskNumber, condition });
  }, [taskNumber, condition, track]);

  /**
   * Auto-show tutorial on mount
   */
  useEffect(() => {
    // Prevent running multiple times
    if (autoShowTriggeredRef.current || run) return;

    if (taskNumber === 1) {
      // Task 1: Show full tutorial if not shown
      if (!tutorialState.screenTutorialShown && !tutorialState.task1TutorialShown) {
        autoShowTriggeredRef.current = true;
        // Small delay to ensure DOM is ready
        setTimeout(() => startTutorial('full'), 500);
      }
    } else if (taskNumber === 2) {
      // Task 2: Show task-only tutorial if not shown
      if (!tutorialState.task2TutorialShown) {
        autoShowTriggeredRef.current = true;
        // Small delay to ensure DOM is ready
        setTimeout(() => startTutorial('task'), 500);
      }
    }
  }, [taskNumber, tutorialState.screenTutorialShown, tutorialState.task1TutorialShown, tutorialState.task2TutorialShown, run, startTutorial]);

  return {
    // Joyride props
    run,
    steps,
    
    // Callback
    handleJoyrideCallback,
    
    // Manual controls
    showScreenTutorial,
    showTaskTutorial,
    resetTutorials,
    
    // State
    tutorialState,
  };
}

export default useTutorial;