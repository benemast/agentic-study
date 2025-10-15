// frontend/src/utils/workflowSerializer.js

/**
 * Serialize workflow data for API transmission
 * Removes React/DOM references and keeps only essential data
 */
export const serializeWorkflow = (nodes, edges) => {
  // Clean nodes - keep only essential data
  const cleanNodes = nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: {
      x: node.position.x,
      y: node.position.y
    },
    data: {
      label: node.data?.label,
      description: node.data?.description,
      template_id: node.data?.template_id,
      type: node.data?.type,
      icon: node.data?.icon,
      color: node.data?.color,
      category: node.data?.category,
      // Add any other custom data fields you need
    }
  }));

  // Clean edges - keep only essential data
  const cleanEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    animated: edge.animated,
  }));

  return {
    nodes: cleanNodes,
    edges: cleanEdges
  };
};

/**
 * Serialize workflow from full workflow object
 */
export const serializeWorkflowObject = (workflow) => {
  if (!workflow) return { nodes: [], edges: [] };
  
  return serializeWorkflow(
    workflow.nodes || [],
    workflow.edges || []
  );
};