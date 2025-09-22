import { useMemo } from 'react';

export const useWorkflowValidation = (nodes, edges) => {
  return useMemo(() => {
    if (nodes.length === 0) {
      return {
        isValid: false,
        message: 'Empty workflow',
        details: 'Add nodes to start building your workflow'
      };
    }

    const inputNodes = nodes.filter(node => node.data.category === 'input');
    const outputNodes = nodes.filter(node => node.data.category === 'output');

    if (inputNodes.length === 0) {
      return {
        isValid: false,
        message: 'Missing input node',
        details: 'Add a data input node to start your workflow'
      };
    }

    if (outputNodes.length === 0) {
      return {
        isValid: false,
        message: 'Missing output node', 
        details: 'Add an output node to complete your workflow'
      };
    }

    if (edges.length === 0) {
      return {
        isValid: false,
        message: 'No connections',
        details: 'Connect your nodes to create a workflow path'
      };
    }

    // Build adjacency list
    const adjacencyList = new Map();
    nodes.forEach(node => adjacencyList.set(node.id, []));
    edges.forEach(edge => {
      if (adjacencyList.has(edge.source)) {
        adjacencyList.get(edge.source).push(edge.target);
      }
    });

    // Check connectivity
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
        message: 'Incomplete workflow',
        details: 'Create a path from input to output nodes'
      };
    }

    return {
      isValid: true,
      message: 'Ready to execute',
      details: `${nodes.length} nodes connected properly`
    };
  }, [nodes, edges]);
};