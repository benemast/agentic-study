// frontend/src/config/constants.js
/**
 * Centralized constants for the application
 * All magic numbers and configuration values should live here
 */

//Study Configuration
export const STUDY_CONFIG = Object.freeze({
  TASKS : {
    wireless: {
      product_id: 'B00V7N3V78',
      product_title: 'Mpow Cheetah Bluetooth 4.1 Wireless Sport Headphones',
      category: 'Wireless',
      role: 'Product Manager',
      goal: 'Develop a product improvement roadmap based on customer feedback analysis',
      focus: 'Your team needs to prioritize the next product iteration. Analyze customer reviews to identify both critical pain points and valued features. Your analysis will inform engineering priorities and competitive positioning.',
      expectedOutput: [
        'Executive summary of customer sentiment',
        'Top 3 negative themes with percentages',
        'Top 3 positive themes with percentages',
        '3-5 actionable product recommendations'
      ]
    },
    shoes: {
      product_id: 'B0041FI6O2',
      product_title: "Kamik Women's Jennifer Rain Boot",
      category: 'Shoes',
      role: 'Marketing Manager',
      goal: 'Create data-driven marketing messages that resonate with real customers',
      focus: 'You\'re launching a new campaign and need authentic customer insights. Analyze reviews to understand what customers genuinely love about this product and what concerns you should address proactively in messaging.',
      expectedOutput: [
        'Executive summary of customer sentiment',
        'Top 3 positive themes with percentages',
        'Top 3 negative themes with percentages',
        '3-5 actionable marketing recommendations'
      ]
    }
  },

  STEPS : {
    WELCOME: 'welcome',
    DEMOGRAPHICS: 'demographics',
    TASK_1: 'task_1',
    SURVEY_1: 'survey_1',
    TASK_2: 'task_2',
    SURVEY_2: 'survey_2',
    COMPLETION: 'completion'
  },

  GROUPS : {
    GROUP_1: 1, // WB→Wireless, AI→Shoes
    GROUP_2: 2, // WB→Shoes, AI→Wireless
    GROUP_3: 3, // AI→Wireless, WB→Shoes
    GROUP_4: 4  // AI→Shoes, WB→Wireless
  },

  CONDITIONS : {
    WORKFLOW_BUILDER: 'workflow_builder',
    AI_ASSISTANT: 'ai_assistant'
  },

  FOOTER:{
    DATA_PRIVACY_URL_EN: 'https://www.tu-darmstadt.de/datenschutzerklaerung.en.jsp',
    DATA_PRIVACY_URL_DE: 'https://www.tu-darmstadt.de/datenschutzerklaerung.de.jsp',
  }
});


// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// AI Chat Configuration
export const AI_CONFIG = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_CONTEXT_MESSAGES: 10,
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  STREAM_ENABLED: true,
  MODEL: 'gpt-3.5-turbo',
  
  // Typing indicators
  TYPING_INDICATOR_DELAY: 100, // ms between typing dots
  MIN_STREAMING_DELAY: 20, // ms minimum between character updates
};

// Session Configuration
export const SESSION_CONFIG = {
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  HEARTBEAT_INTERVAL: 30000, // 15 seconds
  HEARTBEAT_TIMEOUT: 60000, // 60 seconds
  INACTIVITY_WARNING: 300000, // 5 minutes
  SESSION_TIMEOUT: 3600000, // 1 hour
  SYNC_DEBOUNCE: 1000, // 1 second
};

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  HEARTBEAT_TIMEOUT: 10000, // 10 seconds
  CONNECTION_TIMEOUT: 90000,  // Dead after 90s (3 missed beats)
  HEALTH_CHECK_INTERVAL: 10000, // 10 seconds
  HEALTH_CHECK_INITIAL_TIMEOUT: 5000, // 5 seconds
  RECONNECT_DELAY: 1000, // Start with 1s
  RECONNECT_MAX_DELAY: 30000, // Max 30s between attempts
  MAX_RECONNECT_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 100,
  CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_QUEUE_SIZE: 100,
  BATCH_DELAY: 50, // 50ms batching window
  MAX_BATCH_SIZE: 10,
};

// Workflow Builder Configuration
export const WORKFLOW_CONFIG = {
  DEFAULT_NODE_WIDTH: 200,
  DEFAULT_NODE_HEIGHT: 100,
  GRID_SIZE: 15,
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 2,
  ZOOM_STEP: 0.1,
  DEFAULT_PADDING: 0.3,
  
  // Node positioning
  NEW_NODE_OFFSET_X: 50,
  NEW_NODE_OFFSET_Y: 50,
  AUTO_LAYOUT_SPACING_X: 200,
  AUTO_LAYOUT_SPACING_Y: 150,
  
  // Validation
  MAX_NODES: 500,
  MAX_EDGES: 1000,
  MAX_NODE_LABEL_LENGTH: 200,
};

// UI Constants
export const UI_CONFIG = {
  NOTIFICATION_DURATION: 3000, // 3 seconds
  TOAST_DURATION: 5000, // 5 seconds
  DEBOUNCE_DELAY: 300, // 300ms for input debouncing
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 60,
  ANIMATION_DURATION: 200, // ms for transitions
};

// Analytics Tracking Events
export const TRACKING_EVENTS = {
  // Session events
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  VIEW_CHANGE: 'view_change',
  
  // Workflow events
  NODE_ADDED: 'node_added',
  NODE_DELETED: 'node_deleted',
  NODE_EDITED: 'node_edited',
  EDGE_ADDED: 'edge_added',
  EDGE_DELETED: 'edge_deleted',
  WORKFLOW_SAVED: 'workflow_saved',
  WORKFLOW_EXECUTED: 'workflow_executed',
  WORKFLOW_CLEARED: 'workflow_cleared',
  
  // Chat events
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGES_CLEARED: 'chat_cleared',
  
  // Demographics events
  DEMOGRAPHICS_STARTED: 'demographics_started',
  DEMOGRAPHICS_COMPLETED: 'demographics_completed',// Welcome events
  // Welcome events
  WELCOME_STARTED: 'welcome_started',
  WELCOME_COMPLETED: 'welcome_completed',
  
  // Task events
  TASK_STARTED: 'task_started',
  TASK_COMPLETED: 'task_completed',
  TASK_ABANDONED: 'task_abandoned',
  
  // Survey events
  SURVEY_STARTED: 'survey_started',
  SURVEY_COMPLETED: 'survey_completed',
  SURVEY_QUESTION_ANSWERED: 'survey_question_answered',
  
  // Study completion events
  STUDY_STARTED: 'study_started',
  STUDY_COMPLETED: 'study_completed',
  STUDY_ABANDONED: 'study_abandoned',
  
  // Navigation events
  STEP_CHANGED: 'step_changed',
  BACK_BUTTON_CLICKED: 'back_button_clicked',
  NEXT_BUTTON_CLICKED: 'next_button_clicked',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  SYNC_ERROR: 'sync_error',
  TASK_ERROR: 'task_error',
  SURVEY_ERROR: 'survey_error',
};

export const EVENT_DESCRIPTIONS = {
  // Welcome events
  welcome_started: 'User viewed the welcome screen',
  welcome_completed: 'User completed the welcome screen and proceeded to demographics',
  
  // Task events
  task_started: 'User started a task (either Task 1 or Task 2)',
  task_completed: 'User completed a task successfully',
  task_abandoned: 'User left a task without completing it',
  
  // Survey events
  survey_started: 'User opened a survey (Survey 1 or Survey 2)',
  survey_completed: 'User submitted a survey successfully',
  survey_question_answered: 'User answered a specific survey question',
  
  // Study completion
  study_started: 'User initialized the study configuration',
  study_completed: 'User completed the entire study (all tasks and surveys)',
  study_abandoned: 'User left the study before completion',
  
  // Navigation
  step_changed: 'User moved from one study step to another',
  back_button_clicked: 'User clicked back button (if available)',
  next_button_clicked: 'User clicked next/continue button',
  
  // Errors
  sync_error: 'Failed to sync data to backend',
  task_error: 'Error occurred during task completion',
  survey_error: 'Error occurred during survey submission'
};

// View Names
export const VIEWS = {
  DASHBOARD: 'dashboard',
  BUILDER: 'builder',
  AI_CHAT: 'aichat',
  TEMPLATES: 'templates',
  EXECUTIONS: 'executions',
  ANALYTICS: 'analytics',
  TUTORIALS: 'tutorials',
  SETTINGS: 'settings',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SESSION_EXPIRED: 'Your session has expired. Please refresh the page.',
  API_ERROR: 'An error occurred. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SAVE_FAILED: 'Failed to save. Your changes may not be preserved.',
  LOAD_FAILED: 'Failed to load data. Please refresh the page.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Saved successfully',
  DELETED: 'Deleted successfully',
  UPDATED: 'Updated successfully',
  SUBMITTED: 'Submitted successfully',
};

// Demographics Configuration
export const DEMOGRAPHICS_CONFIG = {
  REQUIRED_FIELDS: [
    'age',
    'programming_experience',
    'ai_ml_experience'
  ],
  MAX_TEXT_LENGTH: 1000,
  MIN_AGE: 18,
  MAX_AGE: 100,
};

// Local Storage Keys
export const STORAGE_KEYS = {
  SESSION_ID: 'agentic_study_session_id',
  USER_PREFERENCES: 'agentic_study_preferences',
  LANGUAGE: 'agentic_study_language',
  THEME: 'agentic_study_theme',
  LAST_VIEW: 'agentic_study_last_view',
};

// Feature Flags
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_TUTORIALS: true,
  ENABLE_TEMPLATES: true,
  ENABLE_EXPORTS: true,
  ENABLE_AGENTIC_MODE: false, // Will be enabled with LangGraph
  ENABLE_COMPARISON_VIEW: false, // Will be enabled with LangGraph
};

// Development Flags
export const DEV_CONFIG = {
  SHOW_DEBUG_INFO: import.meta.env.DEV,
  MOCK_API: false,
  LOG_LEVEL: import.meta.env.DEV ? 'debug' : 'error',
};

export default {
  API_CONFIG,
  AI_CONFIG,
  SESSION_CONFIG,
  WORKFLOW_CONFIG,
  UI_CONFIG,
  TRACKING_EVENTS,
  VIEWS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEMOGRAPHICS_CONFIG,
  STORAGE_KEYS,
  FEATURES,
  DEV_CONFIG,
  EVENT_DESCRIPTIONS
};