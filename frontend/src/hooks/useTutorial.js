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
 * - DOM ready check before starting
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTracking } from './useTracking';
import { useSessionStore } from '../store/sessionStore';
import { useTranslation } from './useTranslation'; 
import { getTutorialSteps, getScreenSteps, getTaskSteps } from '../config/tutorialContent';

// ============================================================
// DOM READY CHECK
// ============================================================

/**
 * Check if all tutorial targets exist in DOM
 */
function checkTargetsExist(steps) {
  const missingTargets = [];
  
  steps.forEach(step => {
    // Skip 'body' target - always exists
    if (step.target === 'body') return;
    
    // Check if target exists
    const element = document.querySelector(step.target);
    if (!element) {
      missingTargets.push(step.target);
    }
  });
  
  if (missingTargets.length > 0) {
    console.warn('Tutorial targets not mounted:', missingTargets);
    return false;
  }
  
  return true;
}

/**
 * Wait for targets to be mounted in DOM
 * Returns true if all targets exist, false if timeout
 */
async function waitForTargets(steps, maxWaitMs = 3000) {
  const checkInterval = 100;
  const maxAttempts = maxWaitMs / checkInterval;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    if (checkTargetsExist(steps)) {
      console.log(`✅ All tutorial targets mounted after ${attempts * checkInterval}ms`);
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    attempts++;
  }
  
  console.error(`❌ Tutorial targets not mounted after ${maxWaitMs}ms timeout`);
  return false;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useTutorial(taskNumber, condition) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const [tutorialType, setTutorialType] = useState(null);
  const { track } = useTracking();
  const { t } = useTranslation();

  const tutorialState = useSessionStore(state => state.tutorialState);
  const updateTutorialState = useSessionStore(state => state.updateTutorialState);
  const markScreenTutorialShown = useSessionStore(state => state.markScreenTutorialShown);
  const markTaskTutorialShown = useSessionStore(state => state.markTaskTutorialShown);
  const resetAllTutorials = useSessionStore(state => state.resetAllTutorials);

  // Track if auto-show has already been triggered
  const autoShowTriggeredRef = useRef(false);

  /**
   * Start a tutorial
   */
  const startTutorial = useCallback(async (type, customSteps = null) => {
    let tutorialSteps;
    
    if (customSteps) {
      tutorialSteps = customSteps;
    } else if (type === 'full') {
      tutorialSteps = getTutorialSteps(taskNumber, condition, t);
    } else if (type === 'screen') {
      tutorialSteps = getScreenSteps(t);
    } else if (type === 'task') {
      tutorialSteps = getTaskSteps(condition, t);
    } else {
      console.error('Invalid tutorial type:', type);
      return;
    }

    console.log(`🎓 Starting ${type} tutorial for Task ${taskNumber} (${condition})...`);

    // Wait for targets to be available in DOM
    const targetsReady = await waitForTargets(tutorialSteps);
    
    if (!targetsReady) {
      console.error('❌ Tutorial cancelled - targets not available');
      track('TUTORIAL_FAILED_TO_START', {
        taskNumber,
        tutorialType: type,
        condition,
        reason: 'targets_not_mounted'
      });
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
  }, [taskNumber, condition, t, track]);

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
        markScreenTutorialShown();
      }

      if (tutorialType === 'full' || tutorialType === 'task') {
        markTaskTutorialShown(taskNumber);
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
        markScreenTutorialShown();
      }

      if (tutorialType === 'full' || tutorialType === 'task') {
        markTaskTutorialShown(taskNumber);
      }
    }
  }, [taskNumber, condition, tutorialType, steps, track, markScreenTutorialShown, markTaskTutorialShown]);

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
    resetTutorials: resetAllTutorials,
    
    // State
    tutorialState,
  };
}

export default useTutorial;