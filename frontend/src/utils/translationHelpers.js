// frontend/src/utils/translationHelpers.js

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