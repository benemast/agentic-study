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
 * Returns the base key that points to the node object containing label, type, and description
 * @param {string} nodeId - Node ID in kebab-case
 * @returns {string} Full translation key
 * @example "load-data" → "workflow.builder.nodes.loadData"
 * 
 * Usage with t():
 * const nodeTranslations = t(getNodeTranslationKey('load-data'));
 * // Returns: { label: 'Load Data', type: 'Data Input', description: '...' }
 * const label = nodeTranslations.label;
 * const type = nodeTranslations.type;
 * const description = nodeTranslations.description;
 */
export const getNodeTranslationKey = (nodeId) => {
  return `workflow.builder.nodes.${toCamelCase(nodeId)}`;
};

/**
 * Get translation key for node label specifically
 * @param {string} nodeId - Node ID in kebab-case
 * @returns {string} Full translation key for the label
 * @example "load-data" → "workflow.builder.nodes.loadData.label"
 */
export const getNodeLabelKey = (nodeId) => {
  return `workflow.builder.nodes.${toCamelCase(nodeId)}.label`;
};

/**
 * Get translation key for node type specifically
 * @param {string} nodeId - Node ID in kebab-case
 * @returns {string} Full translation key for the type
 * @example "load-data" → "workflow.builder.nodes.loadData.type"
 */
export const getNodeTypeKey = (nodeId) => {
  return `workflow.builder.nodes.${toCamelCase(nodeId)}.type`;
};

/**
 * Get translation key for node description specifically
 * @param {string} nodeId - Node ID in kebab-case
 * @returns {string} Full translation key for the description
 * @example "load-data" → "workflow.builder.nodes.loadData.description"
 */
export const getNodeDescriptionKey = (nodeId) => {
  return `workflow.builder.nodes.${toCamelCase(nodeId)}.description`;
};

/**
 * DEPRECATED: Get translation key for node type (old structure)
 * Use getNodeTypeKey() instead for new nested structure
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
 * Get all node translations at once (label, type, description)
 * Helper function that returns the complete node translation object
 * 
 * @param {function} t - Translation function from useTranslation hook
 * @param {string} nodeId - Node ID in kebab-case
 * @returns {object} Object with label, type, and description
 * @example 
 * const { label, type, description } = getNodeTranslations(t, 'load-data');
 * // Returns: { 
 * //   label: 'Load Data', 
 * //   type: 'Data Input', 
 * //   description: 'Load customer review data...' 
 * // }
 */
export const getNodeTranslations = (t, nodeId) => {
  const nodeTranslations = t(getNodeTranslationKey(nodeId));
  
  // Handle both nested object and fallback to old structure
  if (typeof nodeTranslations === 'object' && nodeTranslations !== null) {
    return {
      label: nodeTranslations.label || '',
      type: nodeTranslations.type || '',
      description: nodeTranslations.description || ''
    };
  }
  
  // Fallback: if old structure, return as label
  return {
    label: nodeTranslations || '',
    type: '',
    description: ''
  };
};

/**
 * Interpolate React components into translated strings
 * 
 * @param {string} text - Translated text with placeholders like [PLACEHOLDER]
 * @param {Object} components - Object mapping placeholder names to React components
 * @returns {Array} Array of strings and React elements
 * @example
 * const text = "Click [LINK] to continue";
 * const components = { LINK: <a href="#">here</a> };
 * const result = interpolateComponents(text, components);
 * // Returns: ["Click ", <a href="#">here</a>, " to continue"]
 */
export const interpolateComponents = (text, components = {}) => {
  if (!text || typeof text !== 'string') return text;
  
  const parts = [];
  let lastIndex = 0;
  const regex = /\[(\w+)\]/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the placeholder
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the component
    const componentName = match[1];
    if (components[componentName]) {
      parts.push(React.cloneElement(components[componentName], { key: match.index }));
    } else {
      // If component not found, keep the placeholder
      parts.push(match[0]);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};