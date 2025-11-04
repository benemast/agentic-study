// frontend/src/hooks/useWorkflowValidation.js
import { useMemo } from 'react';
/**
 * Validates workflow structure AND node configurations AND connectivity
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @param {Function} t - Translation function from useTranslation hook
 * @returns {Object} Validation state with isValid, canExecute, message, details, configErrors, and floatingNodes
 */
export const useWorkflowValidation = (nodes, edges, t) => {
  return useMemo(() => {
    // Fallback if no translation function provided
    const translate = t || ((key) => key);

    // ============================================
    // 1. STRUCTURAL VALIDATION
    // ============================================
    
    // Check: Empty workflow
    if (nodes.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: translate('workflow.validation.emptyWorkflow'),
        details: translate('workflow.validation.statusDetails.addNodes'),
        configErrors: [],
        floatingNodes: [],
        validationType: 'structural'
      };
    }

    // Check: Input nodes
    const inputNodes = nodes.filter(node => node.data?.category === 'input');
    if (inputNodes.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: translate('workflow.validation.missingInput'),
        details: translate('workflow.validation.statusDetails.addInput'),
        configErrors: [],
        floatingNodes: [],
        validationType: 'structural'
      };
    }

    // Check: Output nodes
    const outputNodes = nodes.filter(node => node.data?.category === 'output');
    if (outputNodes.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: translate('workflow.validation.missingOutput'),
        details: translate('workflow.validation.statusDetails.addOutput'),
        configErrors: [],
        floatingNodes: [],
        validationType: 'structural'
      };
    }

    // Check: Connections exist
    if (edges.length === 0) {
      return {
        isValid: false,
        canExecute: false,
        message: translate('workflow.validation.noConnections'),
        details: translate('workflow.validation.statusDetails.connectNodes'),
        configErrors: [],
        floatingNodes: [],
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
        message: translate('workflow.validation.incompletePath'),
        details: translate('workflow.validation.statusDetails.createPath'),
        configErrors: [],
        floatingNodes: [],
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
              message: translate('workflow.validation.configErrors.fieldRequired', { field: field.label })
            });
          } else if (typeof value === 'string' && value.trim() === '') {
            configErrors.push({
              nodeId: node.id,
              nodeLabel: node.data?.label || 'Unknown node',
              field: field.label,
              fieldKey: field.key,
              message: translate('workflow.validation.configErrors.fieldRequired', { field: field.label })
            });
          }
          
          // Check for empty arrays in multiselect
          if (field.type === 'multiselect' && Array.isArray(value) && value.length === 0) {
            configErrors.push({
              nodeId: node.id,
              nodeLabel: node.data?.label || 'Unknown node',
              field: field.label,
              fieldKey: field.key,
              message: translate('workflow.validation.configErrors.multiselectRequired', { field: field.label })
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
        message: translate('workflow.validation.configurationIncomplete'),
        details: uniqueNodes.length === 1
          ? translate('workflow.validation.configErrors.singleNode', { node: uniqueNodes[0] })
          : translate('workflow.validation.configErrors.multipleNodes', { count: uniqueNodes.length }),
        configErrors,
        floatingNodes: [],
        validationType: 'configuration'
      };
    }

    // ============================================
    // 3. FLOATING NODE VALIDATION (CONNECTIVITY)
    // ============================================
    
    // Find entry points (input nodes) - already filtered above
    const entryNodes = inputNodes;
    
    // Find exit points (output nodes) - already filtered above
    const exitNodes = outputNodes;

    // Build adjacency lists (forward and backward) for bidirectional BFS
    const forwardGraph = new Map();
    const backwardGraph = new Map();
    
    nodes.forEach(node => {
      forwardGraph.set(node.id, []);
      backwardGraph.set(node.id, []);
    });
    
    edges.forEach(edge => {
      if (forwardGraph.has(edge.source)) {
        forwardGraph.get(edge.source).push(edge.target);
      }
      if (backwardGraph.has(edge.target)) {
        backwardGraph.get(edge.target).push(edge.source);
      }
    });

    // BFS forward from entry nodes (find all nodes reachable from input)
    const reachableFromEntry = new Set();
    const queueForward = [...entryNodes.map(n => n.id)];
    
    while (queueForward.length > 0) {
      const nodeId = queueForward.shift();
      if (reachableFromEntry.has(nodeId)) continue;
      
      reachableFromEntry.add(nodeId);
      const neighbors = forwardGraph.get(nodeId) || [];
      queueForward.push(...neighbors);
    }

    // BFS backward from exit nodes (find all nodes that can reach output)
    const reachableFromExit = new Set();
    const queueBackward = [...exitNodes.map(n => n.id)];
    
    while (queueBackward.length > 0) {
      const nodeId = queueBackward.shift();
      if (reachableFromExit.has(nodeId)) continue;
      
      reachableFromExit.add(nodeId);
      const neighbors = backwardGraph.get(nodeId) || [];
      queueBackward.push(...neighbors);
    }

    // Find floating nodes (not in valid paths from input to output)
    const connectedNodeIds = new Set(
      [...reachableFromEntry].filter(id => reachableFromExit.has(id))
    );

    const floatingNodes = nodes.filter(node => !connectedNodeIds.has(node.id));

    // Check: Floating nodes detected
    if (floatingNodes.length > 0) {
      const floatingNodeLabels = floatingNodes.map(n => n.data?.label || n.id).join(', ');
      
      return {
        isValid: false,
        canExecute: false,
        message: translate('workflow.validation.floatingNodesDetected'),
        details: floatingNodes.length === 1
          ? translate('workflow.validation.floatingNodes.singleNode', { nodes: floatingNodeLabels })
          : translate('workflow.validation.floatingNodes.multipleNodes', { 
              count: floatingNodes.length, 
              nodes: floatingNodeLabels 
            }),
        configErrors: [],
        floatingNodes: floatingNodes,
        validationType: 'connectivity'
      };
    }

    // ============================================
    // 4. ALL VALIDATIONS PASSED
    // ============================================
    
    return {
      isValid: true,
      canExecute: true,
      message: translate('workflow.validation.readyToExecute'),
      details: translate('workflow.validation.statusDetails.nodesConnected', { count: nodes.length }),
      configErrors: [],
      floatingNodes: [],
      validationType: 'valid'
    };
  }, [nodes, edges, t]);
};
