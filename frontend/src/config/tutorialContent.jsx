// frontend/src/config/tutorialContent.js
/**
 * Tutorial Content for React Joyride
 * 
 * Step format:
 * - target: CSS selector for element to highlight
 * - content: Tutorial text (supports JSX)
 * - placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
 * - disableBeacon: true (for first step to show immediately)
 * - spotlightClicks: true (allow clicking highlighted element)
 */

// ============================================================
// SCREEN-LEVEL TUTORIAL (Task 1 only)
// ============================================================
const SCREEN_STEPS = [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">👋 Welcome to the Task Screen!</h3>
        <p>This screen has everything you need to complete your task. Let me show you around!</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.task-description-section',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">📋 Task Description</h3>
        <p>Here you'll find your role, goal, and what output is expected. Click the arrow to collapse/expand this section.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.dataset-viewer-container',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">📊 Dataset Viewer</h3>
        <p>This is your data source - customer reviews you'll analyze. You can scroll through all available reviews here.</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.view-mode-buttons',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔄 Switch View Modes</h3>
        <p>Toggle between Card view (easier to read) and Table view (more compact). Choose what works best for you!</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.filter-buttons',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔍 Filter Reviews</h3>
        <p>Filter reviews by sentiment: All, Positive (4-5 stars), Neutral (3 stars), or Negative (1-2 stars).</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.resize-handle',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">↔️ Resize Panels</h3>
        <p>Drag this handle left or right to adjust the panel sizes. Give yourself more space where you need it!</p>
      </div>
    ),
    placement: 'left',
    spotlightClicks: true,
  },
  {
    target: '.popout-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🗳 Pop-out Viewer</h3>
        <p>Click this button to open the dataset viewer in a fullscreen modal for better visibility.</p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.complete-task-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">✅ Complete Task</h3>
        <p>When you're done with your analysis, click this button to proceed to the next step.</p>
      </div>
    ),
    placement: 'bottom',
  },
];

// ============================================================
// WORKFLOW BUILDER TUTORIAL
// ============================================================
const WORKFLOW_BUILDER_STEPS = [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔧 Workflow Builder</h3>
        <p>Build your analysis workflow by connecting tools together. You have full control over the process!</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.tools-panel',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🧰 Available Tools</h3>
        <p>Here are all the tools you can use. Each tool performs a specific analysis task. Drag them onto the canvas to start!</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.react-flow__renderer',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🖱️ Drag & Drop</h3>
        <p>Drag tools from the left panel onto this canvas. You can add as many tools as you need for your analysis.</p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '.react-flow__renderer',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔗 Connect Tools</h3>
        <p>After adding tools, click and drag from the small circle on the right side of a tool to connect it to another tool. This defines the flow of data.</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.workflow-canvas',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">⚙️ Configure Tools</h3>
        <p>Click on a tool to configure its settings. Each tool has different options you can customize.</p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '.execute-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">▶️ Execute Workflow</h3>
        <p>Once your workflow is ready, click the Execute button to run it. You'll see results in real-time!</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.clear-button',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🗑️ Clear & Reset</h3>
        <p>Use the Clear button to remove all tools and start fresh if needed.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">💾 Auto-Save</h3>
        <p>Your workflow is automatically saved as you work, so you won't lose any progress!</p>
      </div>
    ),
    placement: 'center',
  },
];

// ============================================================
// AI ASSISTANT TUTORIAL
// ============================================================
const AI_ASSISTANT_STEPS = [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🤖 AI Assistant</h3>
        <p>Chat with the AI to analyze your data. The AI will autonomously execute tasks and use tools to help you!</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.chat-input-container',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">💬 Chat Interface</h3>
        <p>Describe what you want to analyze or ask questions about the data. The AI will understand and help you.</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.chat-input-container',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🎯 Be Specific</h3>
        <p>Try to be clear about what you need. For example: "Find the top 3 negative themes" or "Analyze sentiment distribution".</p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '.chat-messages-container',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔄 AI Takes Action</h3>
        <p>The AI will automatically use the right tools and process data to answer your questions. You'll see what it's doing in the chat.</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.chat-messages',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔍 Review Results</h3>
        <p>The AI will show you analysis results, insights, and data. You can ask follow-up questions to dig deeper!</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">🔁 Iterate & Refine</h3>
        <p>Keep chatting to refine your analysis. Ask for more details, different perspectives, or additional insights.</p>
      </div>
    ),
    placement: 'center',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-bold mb-2">💡 Example Questions</h3>
        <p>Try: "What are customers complaining about?", "Show me positive feedback", or "Create a summary report".</p>
      </div>
    ),
    placement: 'center',
  },
];

// ============================================================
// STEP BUILDER FUNCTIONS
// ============================================================

/**
 * Get steps for Task 1 (Full tutorial: screen + task)
 */
export function getTask1Steps(condition) {
  const taskSteps = condition === 'workflow_builder' 
    ? WORKFLOW_BUILDER_STEPS 
    : AI_ASSISTANT_STEPS;
  
  return [...SCREEN_STEPS, ...taskSteps];
}

/**
 * Get steps for Task 2 (Task-only tutorial: no screen features)
 */
export function getTask2Steps(condition) {
  const taskSteps = condition === 'workflow_builder' 
    ? WORKFLOW_BUILDER_STEPS 
    : AI_ASSISTANT_STEPS;
  
  // For Task 2, make first step show immediately (disableBeacon)
  return taskSteps;
}

/**
 * Get screen-only steps (for replay button on Task 1)
 */
export function getScreenSteps() {
  return SCREEN_STEPS;
}

/**
 * Get task-only steps (for replay button on both tasks)
 */
export function getTaskSteps(condition) {
  return condition === 'workflow_builder' 
    ? WORKFLOW_BUILDER_STEPS 
    : AI_ASSISTANT_STEPS;
}

/**
 * Get all steps based on task number and condition
 */
export function getTutorialSteps(taskNumber, condition) {
  if (taskNumber === 1) {
    return getTask1Steps(condition);
  } else {
    return getTask2Steps(condition);
  }
}