// frontend/src/utils/messageSanitizer.js
/**
 * Message Sanitizer Utility
 * 
 * Cleans message content before sending to LLM backend
 * Removes emojis, HTML tags, special characters that cause LLM failures
 */

/**
 * Remove all emojis from text
 */
const removeEmojis = (text) => {
  // Comprehensive emoji regex pattern
  return text.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}|\u{1F018}-\u{1F270}|\u{238C}-\u{2454}|\u{20D0}-\u{20FF}]/gu, '');
};

/**
 * Remove HTML tags and entities
 */
const stripHtml = (text) => {
  // Remove HTML tags
  let clean = text.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/&amp;/g, '&');
  clean = clean.replace(/&lt;/g, '<');
  clean = clean.replace(/&gt;/g, '>');
  clean = clean.replace(/&quot;/g, '"');
  clean = clean.replace(/&#39;/g, "'");
  clean = clean.replace(/&apos;/g, "'");
  
  return clean;
};

/**
 * Normalize whitespace
 */
const normalizeWhitespace = (text) => {
  // Replace multiple spaces with single space
  let clean = text.replace(/[ \t]+/g, ' ');
  
  // Replace multiple newlines with max 2
  clean = clean.replace(/\n{3,}/g, '\n\n');
  
  // Remove trailing whitespace from each line
  clean = clean.split('\n').map(line => line.trim()).join('\n');
  
  // Trim leading/trailing whitespace
  clean = clean.trim();
  
  return clean;
};

/**
 * Remove zero-width characters and other invisible chars
 */
const removeInvisibleChars = (text) => {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width chars
    .replace(/[\u0000-\u0008\u000B-\u001F]/g, ''); // Control chars (except \t, \n)
};

/**
 * Remove or replace problematic Unicode characters
 */
const cleanUnicode = (text) => {
  // Remove byte order marks
  let clean = text.replace(/\uFEFF/g, '');
  
  // Remove replacement characters (often from encoding issues)
  clean = clean.replace(/\uFFFD/g, '');
  
  return clean;
};

/**
 * Main sanitization function
 * 
 * @param {string} text - Text to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized text
 */
export const sanitizeMessageForLLM = (text, options = {}) => {
  const {
    removeEmojis: shouldRemoveEmojis = true,
    stripHtml: shouldStripHtml = true,
    normalizeWhitespace: shouldNormalize = true,
    removeInvisible = true,
    cleanUnicode: shouldCleanUnicode = true,
  } = options;
  
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let sanitized = text;
  
  // Remove invisible characters first
  if (removeInvisible) {
    sanitized = removeInvisibleChars(sanitized);
  }
  
  // Clean Unicode issues
  if (shouldCleanUnicode) {
    sanitized = cleanUnicode(sanitized);
  }
  
  // Handle HTML
  if (shouldStripHtml) {
    sanitized = stripHtml(sanitized);
  }
  
  // Handle emojis
  if (shouldRemoveEmojis) {
    sanitized = removeEmojis(sanitized);
  }
  
  // Normalize whitespace last
  if (shouldNormalize) {
    sanitized = normalizeWhitespace(sanitized);
  }
  
  return sanitized;
};

/**
 * Sanitize an array of chat messages
 * 
 * @param {Array} messages - Array of message objects
 * @returns {Array} - Array of sanitized message objects
 */
export const sanitizeChatHistory = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }
  
  return messages.map(msg => ({
    ...msg,
    content: sanitizeMessageForLLM(msg.content)
  }));
};

/**
 * Quick sanitize - removes everything problematic
 * Use this as the default for sending to LLM
 */
export const quickSanitize = (text) => {
  return sanitizeMessageForLLM(text, {
    removeEmojis: true,
    stripHtml: true,
    normalizeWhitespace: true,
    removeInvisible: true,
    cleanUnicode: true,
  });
};

/**
 * Test if text contains problematic characters
 * Useful for debugging
 */
export const hasProblematicChars = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Check for emojis
  const emojiPattern = /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}]/gu;
  if (emojiPattern.test(text)) {
    return true;
  }
  
  // Check for HTML tags
  if (/<[^>]+>/.test(text)) {
    return true;
  }
  
  // Check for zero-width chars
  if (/[\u200B-\u200D\uFEFF]/.test(text)) {
    return true;
  }
  
  return false;
};

/**
 * Get sanitization report
 * Shows what was removed/changed
 */
export const getSanitizationReport = (originalText) => {
  const sanitized = sanitizeMessageForLLM(originalText);
  
  return {
    original: originalText,
    sanitized: sanitized,
    changed: originalText !== sanitized,
    originalLength: originalText.length,
    sanitizedLength: sanitized.length,
    removedChars: originalText.length - sanitized.length,
    hadEmojis: /[\u{1F600}-\u{1F64F}]/gu.test(originalText),
    hadHtml: /<[^>]+>/.test(originalText),
    hadInvisible: /[\u200B-\u200D\uFEFF]/.test(originalText),
  };
};

export default sanitizeMessageForLLM;