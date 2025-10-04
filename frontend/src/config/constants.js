// frontend/src/config/constants.js
/**
 * Centralized constants for the application
 * All magic numbers and configuration values should live here
 */

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
  HEARTBEAT_INTERVAL: 60000, // 1 minute
  INACTIVITY_WARNING: 300000, // 5 minutes
  SESSION_TIMEOUT: 3600000, // 1 hour
  SYNC_DEBOUNCE: 1000, // 1 second
};

// Workflow Builder Configuration
export const WORKFLOW_CONFIG = {
  DEFAULT_NODE_WIDTH: 250,
  DEFAULT_NODE_HEIGHT: 80,
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
  MAX_NODES: 50,
  MAX_EDGES: 100,
  MAX_NODE_LABEL_LENGTH: 100,
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
  
  // Chat events
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  CHAT_CLEARED: 'chat_cleared',
  
  // Demographics events
  DEMOGRAPHICS_STARTED: 'demographics_started',
  DEMOGRAPHICS_COMPLETED: 'demographics_completed',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
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
};