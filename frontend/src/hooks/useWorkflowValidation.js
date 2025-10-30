// frontend/src/hooks/useWorkflowValidation.js
// Enhanced with configuration validation
import { useMemo } from 'react';

/**
 * Validates workflow structure AND node configurations
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @returns {Object} Validation state with isValid, canExecute, message, details, and configErrors
 */
export const useWorkflowValidation = (nodes, edges) => {
  return useMemo(() => {
    // ============================================
    // 1. STRUCTURAL VALIDATION
    // ============================================
    
    // Check: Empty workflow
    if (nodes.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: 'Empty workflow',
        details: 'Add nodes to start building your workflow',
        configErrors: [],
        validationType: 'structural'
      };
    }

    // Check: Input nodes
    const inputNodes = nodes.filter(node => node.data?.category === 'input');
    if (inputNodes.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: 'Missing input node',
        details: 'Add a data input node to start your workflow',
        configErrors: [],
        validationType: 'structural'
      };
    }

    // Check: Output nodes
    const outputNodes = nodes.filter(node => node.data?.category === 'output');
    if (outputNodes.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: 'Missing output node', 
        details: 'Add an output node to complete your workflow',
        configErrors: [],
        validationType: 'structural'
      };
    }

    // Check: Connections exist
    if (edges.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: 'No connections',
        details: 'Connect your nodes to create a workflow path',
        configErrors: [],
        validationType: 'structural'
      };
    }

    // Check: Valid path from input to output
    const adjacencyList = new Map();
    nodes.forEach(node => adjacencyList.set(node.id, []));
    edges.forEach(edge => {
      if (adjacencyList.has(edge.source)) {
        adjacencyList.get(edge.source).push(edge.target);
      }
    });

    const visited = new Set();
    const dfs = (nodeId, targetNodes) => {
      if (visited.has(nodeId)) return false;
      if (targetNodes.some(target => target.id === nodeId)) return true;
      
      visited.add(nodeId);
      const neighbors = adjacencyList.get(nodeId) || [];
      return neighbors.some(neighbor => dfs(neighbor, targetNodes));
    };

    const hasValidPath = inputNodes.some(inputNode => {
      visited.clear();
      return dfs(inputNode.id, outputNodes);
    });

    if (!hasValidPath) {
      return {
        isValid: false,
        canExecute: false,
        message: 'Incomplete workflow',
        details: 'Create a path from input to output nodes',
        configErrors: [],
        validationType: 'structural'
      };
    }

    // ============================================
    // 2. CONFIGURATION VALIDATION
    // ============================================
    
    const configErrors = [];
    
    nodes.forEach(node => {
      const configSchema = node.data?.configSchema || [];
      const config = node.data?.config || {};
      
      // Check each required field
      configSchema.forEach(field => {
        if (field.required) {
          const value = config[field.key];
          
          // Check if value is missing or empty
          if (value === undefined || value === null) {
            configErrors.push({
              nodeId: node.id,
              nodeLabel: node.data?.label || 'Unknown node',
              field: field.label,
              fieldKey: field.key,
              message: `"${field.label}" is required`
            });
          } else if (typeof value === 'string' && value.trim() === '') {
            configErrors.push({
              nodeId: node.id,
              nodeLabel: node.data?.label || 'Unknown node',
              field: field.label,
              fieldKey: field.key,
              message: `"${field.label}" is required`
            });
          }
          
          // Check for empty arrays in multiselect
          if (field.type === 'multiselect' && Array.isArray(value) && value.length === 0) {
            configErrors.push({
              nodeId: node.id,
              nodeLabel: node.data?.label || 'Unknown node',
              field: field.label,
              fieldKey: field.key,
              message: `"${field.label}" must have at least one selection`
            });
          }
        }
      });
    });

    // If config errors exist, workflow is invalid
    if (configErrors.length > 0) {
      const uniqueNodes = [...new Set(configErrors.map(e => e.nodeLabel))];
      
      return {
        isValid: false,
        canExecute: false,
        message: 'Configuration incomplete',
        details: uniqueNodes.length === 1
          ? `"${uniqueNodes[0]}" needs configuration`
          : `${uniqueNodes.length} nodes need configuration`,
        configErrors,
        validationType: 'configuration'
      };
    }

    // ============================================
    // 3. ALL VALIDATIONS PASSED
    // ============================================
    
    return {
      isValid: true,
      canExecute: true,
      message: 'Ready to execute',
      details: `${nodes.length} nodes connected properly`,
      configErrors: [],
      validationType: 'valid'
    };
  }, [nodes, edges]);
};