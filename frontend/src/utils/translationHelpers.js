// frontend/src/utils/translationHelpers.js
import React from 'react';
/**
 * Convert kebab-case to camelCase
 * @param {string} str - String in kebab-case format
 * @returns {string} String in camelCase format
 * @example "gather-data" → "gatherData"
 * @example "sentiment-analysis" → "sentimentAnalysis"
 */
export const toCamelCase = (str) => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert "Title Case" or "Title Case With Spaces" to "camelCase"
 * @param {string} str - String in title case format
 * @returns {string} String in camelCase format
 * @example "Data Input" → "dataInput"
 * @example "Data Processing" → "dataProcessing"
 * @example "AI Operation" → "aiOperation"
 */
export const titleToCamelCase = (str) => {
  return str
    .split(' ')
    .map((word, index) => 
      index === 0 
        ? word.toLowerCase() 
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
};

/**
 * Get translation key for node ID
 * @param {string} nodeId - Node ID in kebab-case
 * @returns {string} Full translation key
 * @example "gather-data" → "workflow.builder.nodes.gatherData"
 */
export const getNodeTranslationKey = (nodeId) => {
  return `workflow.builder.nodes.${toCamelCase(nodeId)}`;
};

/**
 * Get translation key for node type
 * @param {string} nodeType - Node type in title case
 * @returns {string} Full translation key
 * @example "Data Input" → "workflow.builder.nodeTypes.dataInput"
 */
export const getNodeTypeTranslationKey = (nodeType) => {
  return `workflow.builder.nodeTypes.${titleToCamelCase(nodeType)}`;
};

/**
 * Get translation key for node category
 * @param {string} category - Category name
 * @returns {string} Full translation key
 * @example "input" → "workflow.builder.nodeCategories.input"
 */
export const getCategoryTranslationKey = (category) => {
  return `workflow.builder.nodeCategories.${category}`;
};

/**
 * Interpolate React components into translated strings
 * 
 * @param {string} text - Translated text with placeholders like [PLACEHOLDER]
 * @param {Object} components - Object mapping placeholder names to React components
 * @returns {Array} Array of strings and React elements
 * 
 * @example
 * interpolateComponents(
 *   "Contact [EMAIL] for help",
 *   {
 *     EMAIL: <a href="mailto:help@example.com">help@example.com</a>
 *   }
 * )
 * // Returns: ["Contact ", <a>help@example.com</a>, " for help"]
 * 
 * @example
 * // Multiple placeholders
 * interpolateComponents(
 *   "Read our [PRIVACY] and [TERMS]",
 *   {
 *     PRIVACY: <a href="/privacy">Privacy Policy</a>,
 *     TERMS: <a href="/terms">Terms</a>
 *   }
 * )
 */
export const interpolateComponents = (text, components) => {
  const placeholders = Object.keys(components);
  
  if (placeholders.length === 0) {
    return [text];
  }
  
  // Create regex to match any placeholder: [PLACEHOLDER1] or [PLACEHOLDER2]
  const regex = new RegExp(
    `(${placeholders.map(p => `\\[${p}\\]`).join('|')})`,
    'g'
  );
  
  // Split text by placeholders, keeping the placeholders in the result
  const parts = text.split(regex);
  
  // Map parts to either strings or components
  return parts.map((part, index) => {
    // Check if this part matches a placeholder
    const placeholder = placeholders.find(p => `[${p}]` === part);
    
    if (placeholder) {
      const component = components[placeholder];
      
      // If it's a React element, clone it with a key
      if (React.isValidElement(component)) {
        return React.cloneElement(component, { key: index });
      }
      
      // Otherwise return as-is (could be a string or number)
      return component;
    }
    
    // Return the text part
    return part;
  });
};

/**
 * Simple interpolation for single placeholder
 * More performant for common case of one placeholder
 * 
 * @param {string} text - Translated text with one placeholder [PLACEHOLDER]
 * @param {string} placeholderName - Name of the placeholder (without brackets)
 * @param {React.ReactNode} component - React component to insert
 * @returns {Array} Array with text parts and component
 * 
 * @example
 * interpolateSingle(
 *   "Contact [EMAIL] for help",
 *   "EMAIL",
 *   <a href="mailto:help@example.com">help@example.com</a>
 * )
 */
export const interpolateSingle = (text, placeholderName, component) => {
  const placeholder = `[${placeholderName}]`;
  const parts = text.split(placeholder);
  
  if (parts.length === 1) {
    // Placeholder not found
    return [text];
  }
  
  return [
    parts[0],
    React.isValidElement(component) 
      ? React.cloneElement(component, { key: 'component' })
      : component,
    parts[1] || ''
  ];
};

/**
 * Replace variable placeholders (e.g., {{name}}) in translated strings
 * 
 * @param {string} text - Translated text with variable placeholders
 * @param {Object} variables - Object mapping variable names to values
 * @returns {string} Text with variables replaced
 * 
 * @example
 * interpolateVariables(
 *   "Hello {{name}}, you have {{count}} messages",
 *   { name: "John", count: 5 }
 * )
 * // Returns: "Hello John, you have 5 messages"
 */
export const interpolateVariables = (text, variables = {}) => {
  let result = text;
  
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(variables[key]));
  });
  
  return result;
};

/**
 * Combined interpolation for both components and variables
 * First replaces variables, then components
 * 
 * @param {string} text - Translated text with both types of placeholders
 * @param {Object} options - Options object
 * @param {Object} options.components - Component placeholders [PLACEHOLDER]
 * @param {Object} options.variables - Variable placeholders {{variable}}
 * @returns {Array} Array of strings and React elements
 * 
 * @example
 * interpolate(
 *   "Hello {{name}}, read our [PRIVACY]",
 *   {
 *     variables: { name: "John" },
 *     components: {
 *       PRIVACY: <a href="/privacy">Privacy Policy</a>
 *     }
 *   }
 * )
 */
export const interpolate = (text, { components = {}, variables = {} } = {}) => {
  // First replace variables
  let processedText = interpolateVariables(text, variables);
  
  // Then replace components
  return interpolateComponents(processedText, components);
};