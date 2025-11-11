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

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const missing = [];
  
  steps.forEach(step => {
    if (step.target === 'body') return;
    
    const element = document.querySelector(step.target);
    if (!element) {
      missing.push(step.target);
    }
  });
  
  return {
    allFound: missing.length === 0,
    missing
  };
}

/**
 * Wait for targets to be mounted in DOM
 * Returns true if all targets exist, false if timeout
 */
async function waitForTargets(steps, maxWaitMs = 3000) { // 3 seconds
  const checkInterval = 100; // 100ms
  const maxAttempts = maxWaitMs / checkInterval;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const missingTargets = [];
    
    for (const step of steps) {
      // Skip 'body' target - always exists
      if (step.target === 'body') continue;
      
      // Check if target exists
      const element = document.querySelector(step.target);
      if (!element) {
        missingTargets.push(step.target);
      }
    }
    
    if (missingTargets.length === 0) {
      return true;
    }
    
    // Log progress every second
    if (attempts % 5 === 0 && attempts > 0) {
      console.log(`Waiting for targets (${attempts * checkInterval}ms):`, missingTargets);
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    attempts++;
  }
  
  // Final check - log which targets are still missing
  const stillMissing = [];
  steps.forEach(step => {
    if (step.target !== 'body' && !document.querySelector(step.target)) {
      stillMissing.push(step.target);
    }
  });
  
  console.error(`❌ Timeout waiting for targets after ${maxWaitMs}ms:`, stillMissing);
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
  const startTutorial = useCallback(async (type) => {
    // Prevent starting if already running
    if (run) {
      console.warn('Tutorial already running, ignoring start request');
    return;
    }
    
    // Get steps based on type
    let tutorialSteps = type === 'full'
        ? getTutorialSteps(taskNumber, condition, t)
        : type === 'screen'
        ? getScreenSteps(t)
        : getTaskSteps(condition, t);
    
    // Filter out steps with missing targets
    const availableSteps = tutorialSteps.filter(step => {
        if (step.target === 'body') return true;
        const exists = document.querySelector(step.target) !== null;
        if (!exists) {
          console.warn(`⚠️ Skipping tutorial step - target not found: ${step.target}`);
        }
        return exists;
    });
  
    if (availableSteps.length === 0) {
        console.error('No tutorial targets available');
        track('tutorial_failed_to_start', {
            taskNumber,
            tutorialType: type,
            condition,
            reason: 'no_targets_available'
        });
        return;
    }
  
    // Check if remaining targets exist
    const targetsReady = await waitForTargets(availableSteps);
    
    if (!targetsReady) {
        console.error('Tutorial cancelled - targets not available');
        track('tutorial_failed_to_start', {
            taskNumber,
            tutorialType: type,
            condition,
            reason: 'targets_not_mounted'
        });
        return;
    }
    
    setSteps(availableSteps);
    setTutorialType(type);
    setRun(true);
    
    track('tutorial_started', {
        taskNumber,
        tutorialType: type,
        condition,
        stepCount: tutorialSteps.length
    });
    }, []);
    
  /**
   * Handle Joyride callbacks
   */
  const handleJoyrideCallback = useCallback((data) => {
    const { action, index, status, type } = data;

    // Track step views
    if (type === 'step:after') {
      track('tutorial_step_viewed', {
        taskNumber,
        tutorialType,
        condition,
        stepIndex: index,
        stepTarget: steps[index]?.target || 'unknown'
      });
    }

    // Handle completion/skip
    const isLastStep = index === steps.length - 1;
    const isFinished = status === 'finished' || 
                      (type === 'step:after' && isLastStep && action === 'next');
    
    if (isFinished) {
      console.log('Tutorial completed!');
      setRun(false);
      
      track('tutorial_completed', {
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
      console.log('Tutorial skipped');
      setRun(false);
      
      track('tutorial_skipped', {
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
    // Only run once per mount
    if (autoShowTriggeredRef.current || run) return;
    
    const shouldShow = taskNumber === 1
        ? (!tutorialState.screenTutorialShown && !tutorialState.task1TutorialShown)
        : (taskNumber === 2 && !tutorialState.task2TutorialShown);
    
    if (!shouldShow) return;
    
    autoShowTriggeredRef.current = true;
    
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
        const tutorialType = taskNumber === 1 ? 'full' : 'task';
        startTutorial(tutorialType);
    });
    }, [taskNumber]);

  useEffect(() => {
    // Cleanup tutorial on unmount
    return () => {
        if (run) {
        setRun(false);
        track('TUTORIAL_INTERRUPTED', {
            taskNumber,
            tutorialType,
            reason: 'component_unmount'
        });
        }
    };
    }, [run, taskNumber, tutorialType, track]);

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