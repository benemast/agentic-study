// frontend/src/config/tutorialContent.jsx
/**
 * Tutorial Content for React Joyride - FULLY LOCALIZED VERSION
 * 
 * All tutorial content now uses translation keys.
 * Step builder functions accept a translation function (t) as parameter.
 */

// ============================================================
// SCREEN-LEVEL TUTORIAL (Task 1 only)
// ============================================================
const getScreenStepsContent = (t) => [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.welcome.title')}</h3>
        <p>{t('tutorial.screen.welcome.description')}</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.task-description-section',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.taskDescription.title')}</h3>
        <p>{t('tutorial.screen.taskDescription.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.dataset-viewer-container',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.datasetViewer.title')}</h3>
        <p>{t('tutorial.screen.datasetViewer.description')}</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.view-mode-buttons',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.viewModes.title')}</h3>
        <p>{t('tutorial.screen.viewModes.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.filter-buttons',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.filterReviews.title')}</h3>
        <p>{t('tutorial.screen.filterReviews.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.resize-handle',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.resizePanels.title')}</h3>
        <p>{t('tutorial.screen.resizePanels.description')}</p>
      </div>
    ),
    placement: 'top',
  },
];

// ============================================================
// WORKFLOW BUILDER TUTORIAL
// ============================================================
const getWorkflowBuilderStepsContent = (t) => [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.welcome.title')}</h3>
        <p>{t('tutorial.workflowBuilder.welcome.description')}</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.workflow-tools',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.availableTools.title')}</h3>
        <p>{t('tutorial.workflowBuilder.availableTools.description')}</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.workflow-canvas',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.workflowCanvas.title')}</h3>
        <p>{t('tutorial.workflowBuilder.workflowCanvas.description')}</p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '.workflow-canvas',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.connectTools.title')}</h3>
        <p>{t('tutorial.workflowBuilder.connectTools.description')}</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.workflow-canvas',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.configureTools.title')}</h3>
        <p>{t('tutorial.workflowBuilder.configureTools.description')}</p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '.execute-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.executeWorkflow.title')}</h3>
        <p>{t('tutorial.workflowBuilder.executeWorkflow.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.clear-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.clearWorkflow.title')}</h3>
        <p>{t('tutorial.workflowBuilder.clearWorkflow.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.autoSave.title')}</h3>
        <p>{t('tutorial.workflowBuilder.autoSave.description')}</p>
      </div>
    ),
    placement: 'center',
  },
];

// ============================================================
// AI ASSISTANT TUTORIAL
// ============================================================
const getAIAssistantStepsContent = (t) => [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.welcome.title')}</h3>
        <p>{t('tutorial.aiAssistant.welcome.description')}</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.chat-input-container',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.chatInterface.title')}</h3>
        <p>{t('tutorial.aiAssistant.chatInterface.description')}</p>
        <p className="mt-2 text-sm opacity-80">{t('tutorial.aiAssistant.chatInterface.example')}</p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '.chat-messages-container',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.aiTakesAction.title')}</h3>
        <p>{t('tutorial.aiAssistant.aiTakesAction.description')}</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.chat-messages',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.reviewResults.title')}</h3>
        <p>{t('tutorial.aiAssistant.reviewResults.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.iterateRefine.title')}</h3>
        <p>{t('tutorial.aiAssistant.iterateRefine.description')}</p>
      </div>
    ),
    placement: 'center',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.tipsForSuccess.title')}</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>{t('tutorial.aiAssistant.tipsForSuccess.tip1')}</li>
          <li>{t('tutorial.aiAssistant.tipsForSuccess.tip2')}</li>
          <li>{t('tutorial.aiAssistant.tipsForSuccess.tip3')}</li>
          <li>{t('tutorial.aiAssistant.tipsForSuccess.tip4')}</li>
        </ul>
      </div>
    ),
    placement: 'center',
  },
];

// ============================================================
// STEP BUILDER FUNCTIONS - NOW ACCEPT TRANSLATION FUNCTION
// ============================================================

/**
 * Get steps for Task 1 (Full tutorial: screen + task)
 * @param {string} condition - 'workflow_builder' or 'ai_assistant'
 * @param {function} t - Translation function
 */
export function getTask1Steps(condition, t) {
  const taskSteps = condition === 'workflow_builder' 
    ? getWorkflowBuilderStepsContent(t)
    : getAIAssistantStepsContent(t);
  
  return [...getScreenStepsContent(t), ...taskSteps];
}

/**
 * Get steps for Task 2 (Task-only tutorial: no screen features)
 * Ensures first step shows immediately with disableBeacon
 * @param {string} condition - 'workflow_builder' or 'ai_assistant'
 * @param {function} t - Translation function
 */
export function getTask2Steps(condition, t) {
  const taskSteps = condition === 'workflow_builder' 
    ? getWorkflowBuilderStepsContent(t)
    : getAIAssistantStepsContent(t);
  
  // Ensure first step shows immediately without beacon
  return taskSteps.map((step, index) => ({
    ...step,
    disableBeacon: index === 0 ? true : step.disableBeacon
  }));
}

/**
 * Get screen-only steps (for replay button on Task 1)
 * @param {function} t - Translation function
 */
export function getScreenSteps(t) {
  return getScreenStepsContent(t);
}

/**
 * Get task-only steps (for replay button on both tasks)
 * @param {string} condition - 'workflow_builder' or 'ai_assistant'
 * @param {function} t - Translation function
 */
export function getTaskSteps(condition, t) {
  return condition === 'workflow_builder' 
    ? getWorkflowBuilderStepsContent(t)
    : getAIAssistantStepsContent(t);
}

/**
 * Get all steps based on task number and condition
 * @param {number} taskNumber - 1 or 2
 * @param {string} condition - 'workflow_builder' or 'ai_assistant'
 * @param {function} t - Translation function
 */
export function getTutorialSteps(taskNumber, condition, t) {
  if (taskNumber === 1) {
    return getTask1Steps(condition, t);
  } else {
    return getTask2Steps(condition, t);
  }
}