// frontend/src/utils/sessionHelpers.js
/**
 * Utility functions for session management
 */

/**
 * Generate a unique session ID
 */
export const generateSessionId = () => {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(8);
    window.crypto.getRandomValues(array);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from(array, byte => characters[byte % characters.length]).join('');
  }
  
  // Fallback for older browsers
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Get session ID from URL query params
 */
export const getSessionIdFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('session');
};

/**
 * Set session ID in URL without page reload
 */
export const setSessionIdInUrl = (sessionId) => {
  const url = new URL(window.location);
  url.searchParams.set('session', sessionId);
  window.history.replaceState({}, '', url.toString());
};

/**
 * Remove session ID from URL
 */
export const removeSessionIdFromUrl = () => {
  const url = new URL(window.location);
  url.searchParams.delete('session');
  window.history.replaceState({}, '', url.toString());
};

/**
 * Get session metadata (browser info, screen size, etc.)
 */
export const getSessionMetadata = () => ({
  browserInfo: navigator.userAgent,
  screenSize: `${window.screen.width}x${window.screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: navigator.language,
  referrer: document.referrer,
  pageVisibility: !document.hidden,
  cookiesEnabled: navigator.cookieEnabled,
  onlineStatus: navigator.onLine
});

/**
 * Format time spent in readable format
 */
export const formatTimeSpent = (seconds) => {
  if (!seconds) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Check if session is expired
 */
export const isSessionExpired = (lastActivity, timeoutMs = 3600000) => {
  const timeSinceActivity = Date.now() - lastActivity;
  return timeSinceActivity > timeoutMs;
};

/**
 * Calculate time until session timeout
 */
export const timeUntilTimeout = (lastActivity, timeoutMs = 3600000) => {
  const timeSinceActivity = Date.now() - lastActivity;
  const remaining = timeoutMs - timeSinceActivity;
  return Math.max(0, remaining);
};

/**
 * Get session storage key
 */
export const getSessionStorageKey = (key) => {
  return `agentic-study-${key}`;
};

/**
 * Validate session ID format
 */
export const isValidSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') return false;
  // Session IDs should be 8 alphanumeric characters
  return /^[A-Z0-9]{8}$/.test(sessionId);
};