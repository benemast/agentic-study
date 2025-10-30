// frontend/src/config/tutorialContent.jsx
/**
 * Tutorial Content for React Joyride - FULLY LOCALIZED VERSION
 * 
 * All tutorial content now uses translation keys.
 * Step builder functions accept a translation function (t) as parameter.
 */

// ============================================================
// SCREEN-LEVEL TUTORIAL
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
    target: '[data-tour="task-description-section"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.taskDescription.title')}</h3>
        <p>{t('tutorial.screen.taskDescription.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="dataset-viewer-container"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.datasetViewer.title')}</h3>
        <p>{t('tutorial.screen.datasetViewer.description')}</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="view-mode-toggle"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.viewModes.title')}</h3>
        <p>{t('tutorial.screen.viewModes.description')}</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="filter-buttons"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.filterReviews.title')}</h3>
        <p>{t('tutorial.screen.filterReviews.description')}</p>
      </div>
    ),
    placement: 'top',
  },{
    target: '[data-tour="pop-out-dataviewer-button"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.popOutViwer.title')}</h3>
        <p>{t('tutorial.screen.popOutViwer.description')}</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="resize-handle"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.resizePanels.title')}</h3>
        <p>{t('tutorial.screen.resizePanels.description')}</p>
      </div>
    ),
    placement: 'right',
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
  
  // NEW: Sidebar with node templates
  {
    target: '[data-tour="workflow-sidebar"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.sidebar.title')}</h3>
        <p className="mb-3">{t('tutorial.workflowBuilder.sidebar.description')}</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><strong>{t('workflow.builder.nodeCategories.input')}:</strong> {t('tutorial.workflowBuilder.categories.input')}</li>
          <li><strong>{t('workflow.builder.nodeCategories.processing')}:</strong> {t('tutorial.workflowBuilder.categories.processing')}</li>
          <li><strong>{t('workflow.builder.nodeCategories.analysis')}:</strong> {t('tutorial.workflowBuilder.categories.analysis')}</li>
          <li><strong>{t('workflow.builder.nodeCategories.output')}:</strong> {t('tutorial.workflowBuilder.categories.output')}</li>
        </ul>
        <p className="mb-3">{t('tutorial.workflowBuilder.sidebar.finalRemark')}</p>
      </div>
    ),
    placement: 'right',
  },
  
  // NEW: Hover tooltips
  {
    target: '[data-tour="workflow-sidebar"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.tooltips.title')}</h3>
        <p className="mb-2">{t('tutorial.workflowBuilder.tooltips.description')}</p>
        <div className="text-sm bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
          <strong className="text-purple-700 dark:text-purple-300">✨ {t('common.tryIt')}</strong>
          <p className="text-purple-600 dark:text-purple-400 mt-1">{t('tutorial.workflowBuilder.tooltips.tryText')}</p>
        </div>
      </div>
    ),
    placement: 'right',
  },
  
  // Canvas area
  {
    target: '[data-tour="workflow-canvas"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.canvas.title')}</h3>
        <p className="mb-2">{t('tutorial.workflowBuilder.canvas.description')}</p>
        <div className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
          <strong className="text-green-700 dark:text-green-300">🎯 {t('tutorial.workflowBuilder.canvas.actionTitle')}</strong>
          <p className="text-green-600 dark:text-green-400 mt-1">{t('tutorial.workflowBuilder.canvas.actionText')}</p>
        </div>
      </div>
    ),
    placement: 'left',
    spotlightClicks: true,
  },
  
  // NEW: Toolbar with status
  {
    target: '[data-tour="workflow-toolbar"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.toolbar.title')}</h3>
        <p className="mb-2">{t('tutorial.workflowBuilder.toolbar.description')}</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><strong>{t('tutorial.workflowBuilder.toolbar.statusIndicator')}:</strong> {t('tutorial.workflowBuilder.toolbar.statusDescription')}</li>
          <li><strong>{t('tutorial.workflowBuilder.toolbar.clearButton')}:</strong> {t('tutorial.workflowBuilder.toolbar.clearDescription')}</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  
  // NEW: Node configuration
  {
    target: '[data-tour="workflow-canvas"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.nodeSettings.title')}</h3>
        <p className="mb-2">{t('tutorial.workflowBuilder.nodeSettings.description')}</p>
        <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded mb-2">
          <strong className="text-blue-700 dark:text-blue-300">📋 {t('tutorial.workflowBuilder.nodeSettings.displayTitle')}</strong>
          <p className="text-blue-600 dark:text-blue-400 mt-1">{t('tutorial.workflowBuilder.nodeSettings.displayText')}</p>
        </div>
        <div className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
          <strong className="text-yellow-700 dark:text-yellow-300">✏️ {t('tutorial.workflowBuilder.nodeSettings.editTitle')}</strong>
          <p className="text-yellow-600 dark:text-yellow-400 mt-1">{t('tutorial.workflowBuilder.nodeSettings.editText')}</p>
        </div>
      </div>
    ),
    placement: 'left',
  },
  
  // Connection system
  {
    target: '[data-tour="workflow-canvas"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.connections.title')}</h3>
        <p className="mb-2">{t('tutorial.workflowBuilder.connections.description')}</p>
        <ul className="text-sm space-y-1 list-disc list-inside mb-2">
          <li>{t('tutorial.workflowBuilder.connections.topHandle')}</li>
          <li>{t('tutorial.workflowBuilder.connections.bottomHandle')}</li>
          <li>{t('tutorial.workflowBuilder.connections.dragConnect')}</li>
        </ul>
        <div className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
          <strong className="text-green-700 dark:text-green-300">✅ {t('tutorial.workflowBuilder.connections.validTitle')}</strong>
          <p className="text-green-600 dark:text-green-400 mt-1">{t('tutorial.workflowBuilder.connections.validText')}</p>
        </div>
      </div>
    ),
    placement: 'left',
  },
  
  // NEW: Node handles visual feedback
  {
    target: '[data-tour="workflow-canvas"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.visualFeedback.title')}</h3>
        <p className="mb-2">{t('tutorial.workflowBuilder.visualFeedback.description')}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600"></div>
            <span className="text-sm">{t('tutorial.workflowBuilder.visualFeedback.greenValid')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-300 border-2 border-gray-400"></div>
            <span className="text-sm">{t('tutorial.workflowBuilder.visualFeedback.grayUnconnected')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-600"></div>
            <span className="text-sm">{t('tutorial.workflowBuilder.visualFeedback.blueConnected')}</span>
          </div>
        </div>
      </div>
    ),
    placement: 'left',
  },
  
  // Execute workflow
  {
    target: '[data-tour="execute-workflow-button"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.execute.title')}</h3>
        <p className="mb-2">{t('tutorial.workflowBuilder.execute.description')}</p>
        <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
          <strong className="text-blue-700 dark:text-blue-300">⚡ {t('tutorial.workflowBuilder.execute.requirementsTitle')}</strong>
          <p className="text-blue-600 dark:text-blue-400 mt-1">{t('tutorial.workflowBuilder.execute.requirementsText')}</p>
        </div>
      </div>
    ),
    placement: 'bottom',
  },
  
  // Tips for success
  {
    target: 'body',
    ccontent: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.workflowBuilder.tips.title')}</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>{t('tutorial.workflowBuilder.tips.startSimple')}</li>
          <li>{t('tutorial.workflowBuilder.tips.useTooltips')}</li>
          <li>{t('tutorial.workflowBuilder.tips.checkSettings')}</li>
          <li>{t('tutorial.workflowBuilder.tips.validateBefore')}</li>
          <li>{t('tutorial.workflowBuilder.tips.autoSave')}</li>
        </ul>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }
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
    target: '[data-tour="chat-input"]',
    style: { position: 'relative' },
    content: (
      <div style={{ position: 'relative' }}>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.chatInterface.title')}</h3>
        <p>{t('tutorial.aiAssistant.chatInterface.description')}</p>
        <p className="mt-2 text-sm opacity-80">{t('tutorial.aiAssistant.chatInterface.example')}</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="chat-messages-container"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.aiTakesAction.title')}</h3>
        <p>{t('tutorial.aiAssistant.aiTakesAction.description')}</p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="chat-messages"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.reviewResults.title')}</h3>
        <p>{t('tutorial.aiAssistant.reviewResults.description')}</p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="chat-messages-container"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.aiAssistant.iterateRefine.title')}</h3>
        <p>{t('tutorial.aiAssistant.iterateRefine.description')}</p>
      </div>
    ),
    placement: 'center',
  },
  {
    target: '[data-tour="chat-messages-container"]',
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

const getFinalStepsContent = (t) => [
  {
    target: '[data-tour="tutorial-buttons"]',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.tutorialButtons.title')}</h3>
        <p>{t('tutorial.screen.tutorialButtons.description')}</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">{t('tutorial.screen.final.title')}</h3>
        <p>{t('tutorial.screen.final.description')}</p>
      </div>
    ),
    placement: 'center',
  },
]

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
  
  return [...getScreenStepsContent(t), ...taskSteps, ...getFinalStepsContent(t)];
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